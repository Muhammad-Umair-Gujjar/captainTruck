import { PrismaClient, UserRole, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const ADMIN_EMAIL = 'admin@captaintruck.local';
const ADMIN_PASSWORD = 'Admin@12345';

const TRUCK_TYPES: Array<{
  code: string;
  name: string;
  capacity: string;
  amountCents: number;
}> = [
  {
    code: 'SMALL',
    name: 'Small Truck',
    capacity: '1-2 ton',
    amountCents: 150_000, // PKR 1,500.00
  },
  {
    code: 'MEDIUM',
    name: 'Medium Truck',
    capacity: '3-5 ton',
    amountCents: 250_000, // PKR 2,500.00
  },
  {
    code: 'LARGE',
    name: 'Large Truck',
    capacity: '6-10 ton',
    amountCents: 400_000, // PKR 4,000.00
  },
];

async function main() {
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);

  const admin = await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: {
      fullName: 'System Admin',
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      deletedAt: null,
    },
    create: {
      email: ADMIN_EMAIL,
      fullName: 'System Admin',
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      passwordHash,
      phone: null,
    },
  });

  for (const truck of TRUCK_TYPES) {
    const truckType = await prisma.truckType.upsert({
      where: { code: truck.code },
      update: {
        name: truck.name,
        capacity: truck.capacity,
        isActive: true,
      },
      create: {
        code: truck.code,
        name: truck.name,
        capacity: truck.capacity,
        isActive: true,
      },
    });

    const latest = await prisma.baseRate.findFirst({
      where: { truckTypeId: truckType.id },
      orderBy: { effectiveFrom: 'desc' },
    });

    if (!latest || latest.amountCents !== truck.amountCents) {
      await prisma.baseRate.create({
        data: {
          truckTypeId: truckType.id,
          amountCents: truck.amountCents,
          effectiveFrom: new Date(),
        },
      });
    }
  }

  // eslint-disable-next-line no-console
  console.log('Seed complete (idempotent)');
  // eslint-disable-next-line no-console
  console.log(`  Admin: ${admin.email} / ${ADMIN_PASSWORD}`);
  // eslint-disable-next-line no-console
  console.log(`  Truck types: ${TRUCK_TYPES.map((t) => t.code).join(', ')}`);
}

main()
  .catch((error: unknown) => {
    // eslint-disable-next-line no-console
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
