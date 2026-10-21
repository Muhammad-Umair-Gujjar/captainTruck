import { HttpStatus, Injectable } from '@nestjs/common';
import {
  ChatThreadType,
  MessageType,
  Prisma,
  TripStatus,
  UserRole,
} from '@prisma/client';
import { ChatErrorCode } from '../../common/constants/error-codes';
import { AuthUser } from '../../common/decorators/current-user.decorator';
import { appHttpError } from '../../common/utils/http-error';
import { MediaService } from '../media/media.service';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimePublisher } from '../realtime/realtime.publisher';
import { sanitizeChatBody } from './chat-sanitize';
import { ListMessagesQueryDto } from './dto/list-messages.query.dto';
import { SendMessageDto } from './dto/send-message.dto';

/**
 * After trip COMPLETED/CANCELLED, threads become read-only immediately (FYP policy).
 */
const READ_ONLY_TRIP_STATUSES: TripStatus[] = [
  TripStatus.COMPLETED,
  TripStatus.CANCELLED,
];

@Injectable()
export class ChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly media: MediaService,
    private readonly realtime: RealtimePublisher,
  ) {}

  async openThreadForTrip(
    actor: AuthUser,
    tripId: string,
    type: ChatThreadType,
  ) {
    const trip = await this.prisma.trip.findUnique({
      where: { id: tripId },
      include: { request: true },
    });
    if (!trip) {
      throw appHttpError(
        HttpStatus.NOT_FOUND,
        ChatErrorCode.TRIP_REQUIRED,
        'Trip not found',
      );
    }

    this.assertCanAccessTripChat(actor, trip);

    if (type === ChatThreadType.DRIVER_CUSTOMER) {
      if (
        actor.role !== UserRole.CUSTOMER &&
        actor.role !== UserRole.DRIVER &&
        actor.role !== UserRole.ADMIN
      ) {
        throw appHttpError(
          HttpStatus.FORBIDDEN,
          ChatErrorCode.FORBIDDEN,
          'Cannot open customer-driver chat',
        );
      }
      return this.getOrCreateThread({
        tripId,
        type,
        participantIds: [trip.driverId, trip.request.customerId],
      });
    }

    // DRIVER_ADMIN: only driver or admin
    if (actor.role === UserRole.CUSTOMER) {
      throw appHttpError(
        HttpStatus.FORBIDDEN,
        ChatErrorCode.FORBIDDEN,
        'Customers cannot open driver-admin chat',
      );
    }

    const participants = new Set<string>([trip.driverId]);
    if (actor.role === UserRole.ADMIN) {
      participants.add(actor.id);
    }
    return this.getOrCreateThread({
      tripId,
      type,
      participantIds: [...participants],
    });
  }

  async listMine(actor: AuthUser) {
    const threads = await this.prisma.chatThread.findMany({
      where:
        actor.role === UserRole.ADMIN
          ? {
              OR: [
                { type: ChatThreadType.DRIVER_ADMIN },
                { participants: { some: { userId: actor.id } } },
              ],
            }
          : { participants: { some: { userId: actor.id } } },
      include: {
        participants: {
          include: {
            user: {
              select: { id: true, fullName: true, role: true, email: true },
            },
          },
        },
        trip: { select: { id: true, status: true, requestId: true } },
        messages: {
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          take: 1,
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: 50,
    });

    return {
      items: threads.map((t) => this.toThreadPublic(t, actor)),
    };
  }

  async getThread(actor: AuthUser, threadId: string) {
    const thread = await this.loadThreadOrThrow(threadId);
    this.assertCanAccessThread(actor, thread);
    return this.toThreadPublic(thread, actor);
  }

  async listMessages(
    actor: AuthUser,
    threadId: string,
    query: ListMessagesQueryDto,
  ) {
    const thread = await this.loadThreadOrThrow(threadId);
    this.assertCanAccessThread(actor, thread);

    const limit = query.limit ?? 30;
    const where: Prisma.MessageWhereInput = { threadId };

    if (query.cursor) {
      const cursorMsg = await this.prisma.message.findFirst({
        where: { id: query.cursor, threadId },
      });
      if (!cursorMsg) {
        throw appHttpError(
          HttpStatus.BAD_REQUEST,
          ChatErrorCode.INVALID_CURSOR,
          'Invalid message cursor for this thread',
        );
      }
      where.OR = [
        { createdAt: { lt: cursorMsg.createdAt } },
        {
          createdAt: cursorMsg.createdAt,
          id: { lt: cursorMsg.id },
        },
      ];
    }

    const rows = await this.prisma.message.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      include: {
        sender: {
          select: { id: true, fullName: true, role: true },
        },
      },
    });

    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor = hasMore ? (items[items.length - 1]?.id ?? null) : null;

    return {
      items: items.map((m) => this.toMessagePublic(m)),
      meta: {
        limit,
        nextCursor,
        hasMore,
        readOnly: this.isReadOnly(thread),
      },
    };
  }

  async sendMessage(actor: AuthUser, threadId: string, dto: SendMessageDto) {
    const thread = await this.loadThreadOrThrow(threadId);
    this.assertCanAccessThread(actor, thread);

    if (this.isReadOnly(thread)) {
      throw appHttpError(
        HttpStatus.BAD_REQUEST,
        ChatErrorCode.READ_ONLY,
        'Chat is read-only after trip completion/cancellation',
      );
    }

    if (
      actor.role === UserRole.ADMIN &&
      thread.type === ChatThreadType.DRIVER_ADMIN
    ) {
      await this.prisma.chatParticipant.upsert({
        where: {
          threadId_userId: { threadId, userId: actor.id },
        },
        create: { threadId, userId: actor.id },
        update: {},
      });
    } else if (actor.role !== UserRole.ADMIN) {
      this.assertIsParticipant(actor, thread);
    }

    const { body, mediaUrl } = this.normalizeMessagePayload(dto);

    const message = await this.prisma.$transaction(async (tx) => {
      const created = await tx.message.create({
        data: {
          threadId,
          senderId: actor.id,
          type: dto.type,
          body,
          mediaUrl,
        },
        include: {
          sender: {
            select: { id: true, fullName: true, role: true },
          },
        },
      });
      await tx.chatThread.update({
        where: { id: threadId },
        data: { updatedAt: new Date() },
      });
      return created;
    });

    const fresh = await this.loadThreadOrThrow(threadId);
    const publicMsg = this.toMessagePublic(message);
    this.realtime.emitChatMessage(fresh, publicMsg);
    return publicMsg;
  }

  async reportMessage(actor: AuthUser, messageId: string) {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
      include: {
        thread: {
          include: {
            participants: true,
            trip: true,
          },
        },
      },
    });
    if (!message) {
      throw appHttpError(
        HttpStatus.NOT_FOUND,
        ChatErrorCode.MESSAGE_NOT_FOUND,
        'Message not found',
      );
    }

    this.assertCanAccessThread(actor, message.thread);

    const updated = await this.prisma.message.update({
      where: { id: messageId },
      data: { reported: true },
      include: {
        sender: { select: { id: true, fullName: true, role: true } },
      },
    });

    await this.prisma.auditLog.create({
      data: {
        actorId: actor.id,
        action: 'CHAT_MESSAGE_REPORT',
        entityType: 'Message',
        entityId: messageId,
        metadata: { threadId: message.threadId },
      },
    });

    return this.toMessagePublic(updated);
  }

  async assertSocketCanJoinThread(actor: AuthUser, threadId: string) {
    const thread = await this.loadThreadOrThrow(threadId);
    this.assertCanAccessThread(actor, thread);
    return thread;
  }

  private normalizeMessagePayload(dto: SendMessageDto): {
    body: string | null;
    mediaUrl: string | null;
  } {
    if (dto.type === MessageType.TEXT || dto.type === MessageType.PRESET) {
      const body = sanitizeChatBody(dto.body ?? '');
      if (!body) {
        throw appHttpError(
          HttpStatus.BAD_REQUEST,
          ChatErrorCode.INVALID_MESSAGE,
          'body is required for text/preset messages',
        );
      }
      return { body, mediaUrl: null };
    }

    if (dto.type === MessageType.IMAGE || dto.type === MessageType.VOICE) {
      if (!dto.mediaUrl) {
        throw appHttpError(
          HttpStatus.BAD_REQUEST,
          ChatErrorCode.INVALID_MESSAGE,
          'mediaUrl is required for image/voice messages',
        );
      }
      this.media.validateMediaUrl(dto.mediaUrl);
      const caption = dto.body ? sanitizeChatBody(dto.body) : null;
      return { body: caption || null, mediaUrl: dto.mediaUrl };
    }

    throw appHttpError(
      HttpStatus.BAD_REQUEST,
      ChatErrorCode.INVALID_MESSAGE,
      'Unsupported message type',
    );
  }

  private async getOrCreateThread(input: {
    tripId: string;
    type: ChatThreadType;
    participantIds: string[];
  }) {
    const existing = await this.prisma.chatThread.findFirst({
      where: { tripId: input.tripId, type: input.type },
      include: {
        participants: {
          include: {
            user: {
              select: { id: true, fullName: true, role: true, email: true },
            },
          },
        },
        trip: { select: { id: true, status: true, requestId: true } },
        messages: {
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          take: 1,
        },
      },
    });

    if (existing) {
      // Ensure all required participants exist
      for (const userId of input.participantIds) {
        await this.prisma.chatParticipant.upsert({
          where: {
            threadId_userId: { threadId: existing.id, userId },
          },
          create: { threadId: existing.id, userId },
          update: {},
        });
      }
      return this.loadThreadOrThrow(existing.id);
    }

    const created = await this.prisma.chatThread.create({
      data: {
        tripId: input.tripId,
        type: input.type,
        participants: {
          create: input.participantIds.map((userId) => ({ userId })),
        },
      },
    });

    return this.loadThreadOrThrow(created.id);
  }

  private async loadThreadOrThrow(threadId: string) {
    const thread = await this.prisma.chatThread.findUnique({
      where: { id: threadId },
      include: {
        participants: {
          include: {
            user: {
              select: { id: true, fullName: true, role: true, email: true },
            },
          },
        },
        trip: { select: { id: true, status: true, requestId: true } },
        messages: {
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          take: 1,
        },
      },
    });
    if (!thread) {
      throw appHttpError(
        HttpStatus.NOT_FOUND,
        ChatErrorCode.THREAD_NOT_FOUND,
        'Chat thread not found',
      );
    }
    return thread;
  }

  private assertCanAccessTripChat(
    actor: AuthUser,
    trip: {
      driverId: string;
      request: { customerId: string };
    },
  ) {
    if (actor.role === UserRole.ADMIN) return;
    if (actor.role === UserRole.DRIVER && trip.driverId === actor.id) return;
    if (
      actor.role === UserRole.CUSTOMER &&
      trip.request.customerId === actor.id
    ) {
      return;
    }
    throw appHttpError(
      HttpStatus.FORBIDDEN,
      ChatErrorCode.FORBIDDEN,
      'You cannot open chat for this trip',
    );
  }

  private assertCanAccessThread(
    actor: AuthUser,
    thread: {
      type: ChatThreadType;
      participants: Array<{ userId: string }>;
      trip: { driverId?: string; status: TripStatus } | null;
    },
  ) {
    if (actor.role === UserRole.ADMIN) {
      if (thread.type === ChatThreadType.DRIVER_ADMIN) return;
      if (thread.participants.some((p) => p.userId === actor.id)) return;
      // Admin can also view customer↔driver for ops
      return;
    }
    if (thread.participants.some((p) => p.userId === actor.id)) return;
    throw appHttpError(
      HttpStatus.FORBIDDEN,
      ChatErrorCode.FORBIDDEN,
      'You are not a participant of this chat',
    );
  }

  private assertIsParticipant(
    actor: AuthUser,
    thread: { participants: Array<{ userId: string }> },
  ) {
    if (thread.participants.some((p) => p.userId === actor.id)) return;
    throw appHttpError(
      HttpStatus.FORBIDDEN,
      ChatErrorCode.FORBIDDEN,
      'You are not a participant of this chat',
    );
  }

  private isReadOnly(thread: { trip: { status: TripStatus } | null }): boolean {
    if (!thread.trip) return false;
    return READ_ONLY_TRIP_STATUSES.includes(thread.trip.status);
  }

  private toThreadPublic(
    thread: {
      id: string;
      tripId: string | null;
      type: ChatThreadType;
      createdAt: Date;
      updatedAt: Date;
      participants: Array<{
        userId: string;
        user?: {
          id: string;
          fullName: string;
          role: UserRole;
          email: string;
        };
      }>;
      trip: { id: string; status: TripStatus; requestId: string } | null;
      messages?: Array<{
        id: string;
        type: MessageType;
        body: string | null;
        mediaUrl: string | null;
        createdAt: Date;
        senderId: string;
      }>;
    },
    _actor: AuthUser, // reserved for per-viewer filtering later
  ) {
    void _actor;
    return {
      id: thread.id,
      tripId: thread.tripId,
      type: thread.type,
      createdAt: thread.createdAt,
      updatedAt: thread.updatedAt,
      readOnly: this.isReadOnly(thread),
      trip: thread.trip,
      participants: thread.participants.map((p) => p.user ?? { id: p.userId }),
      lastMessage: thread.messages?.[0]
        ? {
            id: thread.messages[0].id,
            type: thread.messages[0].type,
            body: thread.messages[0].body,
            mediaUrl: thread.messages[0].mediaUrl,
            senderId: thread.messages[0].senderId,
            createdAt: thread.messages[0].createdAt,
          }
        : null,
    };
  }

  private toMessagePublic(message: {
    id: string;
    threadId: string;
    senderId: string;
    type: MessageType;
    body: string | null;
    mediaUrl: string | null;
    reported: boolean;
    createdAt: Date;
    sender?: { id: string; fullName: string; role: UserRole };
  }) {
    return {
      id: message.id,
      threadId: message.threadId,
      senderId: message.senderId,
      type: message.type,
      body: message.body,
      mediaUrl: message.mediaUrl,
      reported: message.reported,
      createdAt: message.createdAt,
      sender: message.sender ?? undefined,
    };
  }
}
