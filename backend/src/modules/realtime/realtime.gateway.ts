import { Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { UserRole } from '@prisma/client';
import { Server, Socket } from 'socket.io';
import type { AuthUser } from '../../common/decorators/current-user.decorator';
import { TokenService } from '../auth/token.service';
import { ChatService } from '../chat/chat.service';
import { UpdateLocationDto } from '../trips/dto/update-location.dto';
import { TripsService } from '../trips/trips.service';
import { RealtimePublisher } from './realtime.publisher';

type SocketUser = AuthUser;

type AuthedSocketData = {
  user?: SocketUser;
};

@WebSocketGateway({
  namespace: '/realtime',
  cors: { origin: true, credentials: true },
})
export class RealtimeGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(RealtimeGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly tokens: TokenService,
    private readonly trips: TripsService,
    private readonly chat: ChatService,
    private readonly publisher: RealtimePublisher,
  ) {}

  afterInit(server: Server) {
    this.publisher.attach(server);
    this.logger.log('Socket.IO /realtime ready');
  }

  async handleConnection(client: Socket) {
    try {
      const token = this.extractToken(client);
      if (!token) {
        client.emit('error', { code: 'AUTH_009', message: 'Missing token' });
        client.disconnect(true);
        return;
      }

      const payload = this.tokens.verifyAccessToken(token);
      const user: SocketUser = {
        id: payload.sub,
        email: payload.email,
        role: payload.role,
      };
      this.socketData(client).user = user;

      await client.join(`user:${user.id}`);
      if (user.role === UserRole.ADMIN) {
        await client.join('admin:ops');
      }

      client.emit('connected', {
        userId: user.id,
        role: user.role,
        rooms: [`user:${user.id}`].concat(
          user.role === UserRole.ADMIN ? ['admin:ops'] : [],
        ),
      });
    } catch {
      client.emit('error', {
        code: 'AUTH_009',
        message: 'Invalid or expired token',
      });
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    const user = this.socketData(client).user;
    if (user) {
      this.logger.debug(`Socket disconnected user=${user.id}`);
    }
  }

  @SubscribeMessage('trip:join')
  async joinTrip(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { tripId?: string },
  ) {
    const user = this.socketData(client).user;
    if (!user || !body?.tripId) {
      return {
        ok: false,
        code: 'TRIP_002',
        message: 'Unauthorized or missing tripId',
      };
    }

    try {
      await this.trips.assertSocketCanJoin(user, body.tripId);
      await client.join(`trip:${body.tripId}`);
      const location = await this.trips.getLocation(user, body.tripId);
      return {
        ok: true,
        room: `trip:${body.tripId}`,
        location,
      };
    } catch (error: unknown) {
      return this.wsError(error, 'Cannot join trip room');
    }
  }

  @SubscribeMessage('trip:leave')
  async leaveTrip(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { tripId?: string },
  ) {
    if (!body?.tripId) {
      return { ok: false, message: 'tripId required' };
    }
    await client.leave(`trip:${body.tripId}`);
    return { ok: true };
  }

  @SubscribeMessage('location:update')
  async locationUpdate(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: UpdateLocationDto & { tripId?: string },
  ) {
    const user = this.socketData(client).user;
    if (!user || !body?.tripId) {
      return {
        ok: false,
        code: 'TRIP_002',
        message: 'Unauthorized or missing tripId',
      };
    }

    try {
      const live = await this.trips.updateLocation(user, body.tripId, body);
      return { ok: true, location: live };
    } catch (error: unknown) {
      return this.wsError(error, 'Location update failed');
    }
  }

  @SubscribeMessage('chat:join')
  async joinChat(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { threadId?: string },
  ) {
    const user = this.socketData(client).user;
    if (!user || !body?.threadId) {
      return {
        ok: false,
        code: 'CHAT_002',
        message: 'Unauthorized or missing threadId',
      };
    }

    try {
      await this.chat.assertSocketCanJoinThread(user, body.threadId);
      await client.join(`chat:${body.threadId}`);
      return { ok: true, room: `chat:${body.threadId}` };
    } catch (error: unknown) {
      return this.wsError(error, 'Cannot join chat room');
    }
  }

  @SubscribeMessage('chat:leave')
  async leaveChat(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { threadId?: string },
  ) {
    if (!body?.threadId) {
      return { ok: false, message: 'threadId required' };
    }
    await client.leave(`chat:${body.threadId}`);
    return { ok: true };
  }

  private wsError(error: unknown, fallback: string) {
    const err = error as {
      getResponse?: () => unknown;
      response?: { code?: string; message?: string };
    };
    const response = err.getResponse?.() ?? err.response;
    if (typeof response === 'object' && response && response !== null) {
      const r = response as { code?: string; message?: string };
      return {
        ok: false,
        code: r.code ?? 'TRIP_002',
        message: r.message ?? fallback,
      };
    }
    return { ok: false, code: 'TRIP_002', message: fallback };
  }

  private socketData(client: Socket): AuthedSocketData {
    return client.data as AuthedSocketData;
  }

  private extractToken(client: Socket): string | null {
    const auth = client.handshake.auth as { token?: string } | undefined;
    if (auth?.token) return auth.token;

    const query = client.handshake.query?.token;
    if (typeof query === 'string' && query.length > 0) return query;

    const header = client.handshake.headers.authorization;
    if (header?.startsWith('Bearer ')) {
      return header.slice(7);
    }
    return null;
  }
}
