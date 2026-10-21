import { FcmService } from './fcm.service';
import type { AppConfig } from '../../config/env.schema';

describe('FcmService', () => {
  const baseConfig = {
    fcm: {
      projectId: undefined,
      clientEmail: undefined,
      privateKey: undefined,
    },
  } as unknown as AppConfig;

  it('normalizePrivateKey expands escaped newlines', () => {
    const svc = new FcmService(baseConfig);
    const raw =
      '-----BEGIN PRIVATE KEY-----\\nABC\\n-----END PRIVATE KEY-----\\n';
    expect(svc.normalizePrivateKey(raw)).toBe(
      '-----BEGIN PRIVATE KEY-----\nABC\n-----END PRIVATE KEY-----',
    );
  });

  it('isConfigured is false without credentials', () => {
    const svc = new FcmService(baseConfig);
    expect(svc.isConfigured()).toBe(false);
  });

  it('sendToTokens no-ops when not ready', async () => {
    const svc = new FcmService(baseConfig);
    svc.onModuleInit();
    const result = await svc.sendToTokens(['tok_abcdefghijklmnopqrst'], {
      title: 't',
      body: 'b',
    });
    expect(result).toEqual({
      successCount: 0,
      failureCount: 0,
      invalidTokens: [],
    });
  });

  it('sendToTokens with empty tokens returns zeros', async () => {
    const svc = new FcmService(baseConfig);
    const result = await svc.sendToTokens([], { title: 't', body: 'b' });
    expect(result.successCount).toBe(0);
  });
});
