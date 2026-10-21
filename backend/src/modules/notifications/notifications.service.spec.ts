import { NotificationsService } from './notifications.service';
import type { FcmService } from './fcm.service';
import type { PrismaService } from '../prisma/prisma.service';

describe('NotificationsService', () => {
  const userId = 'user_1';
  let prisma: {
    user: {
      findUnique: jest.Mock;
      update: jest.Mock;
    };
  };
  let fcm: {
    isConfigured: jest.Mock;
    sendToTokens: jest.Mock;
  };
  let service: NotificationsService;

  beforeEach(() => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };
    fcm = {
      isConfigured: jest.fn().mockReturnValue(true),
      sendToTokens: jest.fn(),
    };
    service = new NotificationsService(
      prisma as unknown as PrismaService,
      fcm as unknown as FcmService,
    );
  });

  it('registerToken appends unique token', async () => {
    prisma.user.findUnique.mockResolvedValue({
      fcmTokens: ['old_token_abcdefghij'],
    });
    prisma.user.update.mockResolvedValue({});
    const actor = { id: userId } as never;
    const out = await service.registerToken(
      actor,
      'new_token_abcdefghijklmnop',
    );
    expect(out.tokenCount).toBe(2);
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: userId },
      data: {
        fcmTokens: ['old_token_abcdefghij', 'new_token_abcdefghijklmnop'],
      },
    });
  });

  it('registerToken is idempotent for same token', async () => {
    const token = 'same_token_abcdefghijklmnop';
    prisma.user.findUnique.mockResolvedValue({ fcmTokens: [token] });
    const actor = { id: userId } as never;
    const out = await service.registerToken(actor, token);
    expect(out.tokenCount).toBe(1);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('notifyUser prunes invalid tokens from FCM response', async () => {
    prisma.user.findUnique
      .mockResolvedValueOnce({
        fcmTokens: ['good_token_abcdefghij', 'bad_token_abcdefghijk'],
      })
      .mockResolvedValueOnce({
        fcmTokens: ['good_token_abcdefghij', 'bad_token_abcdefghijk'],
      });
    prisma.user.update.mockResolvedValue({});
    fcm.sendToTokens.mockResolvedValue({
      successCount: 1,
      failureCount: 1,
      invalidTokens: ['bad_token_abcdefghijk'],
    });

    const out = await service.notifyUser(userId, {
      title: 'Hello',
      body: 'World',
    });

    expect(out.sent).toBe(true);
    expect(out.pruned).toBe(1);
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: userId },
      data: { fcmTokens: ['good_token_abcdefghij'] },
    });
  });

  it('notifyUser with 0 tokens is a no-op success', async () => {
    prisma.user.findUnique.mockResolvedValue({ fcmTokens: [] });
    const out = await service.notifyUser(userId, { title: 't', body: 'b' });
    expect(out).toEqual({ sent: false, tokenCount: 0, pruned: 0 });
    expect(fcm.sendToTokens).not.toHaveBeenCalled();
  });
});
