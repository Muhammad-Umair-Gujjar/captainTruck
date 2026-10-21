import { PrismaService } from './prisma.service';

describe('PrismaService', () => {
  it('isHealthy returns false when query fails', async () => {
    const prisma = Object.create(PrismaService.prototype) as PrismaService;
    (prisma as unknown as { $queryRaw: jest.Mock }).$queryRaw = jest
      .fn()
      .mockRejectedValue(new Error('down'));

    await expect(prisma.isHealthy()).resolves.toBe(false);
  });

  it('isHealthy returns true when query succeeds', async () => {
    const prisma = Object.create(PrismaService.prototype) as PrismaService;
    (prisma as unknown as { $queryRaw: jest.Mock }).$queryRaw = jest
      .fn()
      .mockResolvedValue([{ '?column?': 1 }]);

    await expect(prisma.isHealthy()).resolves.toBe(true);
  });
});
