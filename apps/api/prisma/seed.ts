import { PrismaClient, TemplateType } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

export async function seedMessagingData(client: PrismaClient) {
  await client.template.upsert({
    where: { name: 'Exam Reminder' },
    update: {},
    create: {
      name: 'Exam Reminder',
      type: TemplateType.BOTH,
      subject: 'Reminder for {{name}}',
      body: 'Hello {{name}}, your exam is on {{date}} at {{arrival_time}} in room {{room}}.',
    },
  });
}

async function main() {
  const passwordHash = await bcrypt.hash('Admin@123456', 10);
  await prisma.user.upsert({
    where: { email: 'admin@messaging.local' },
    update: {},
    create: {
      email: 'admin@messaging.local',
      username: 'admin',
      fullName: 'Messaging Admin',
      role: 'SUPER_ADMIN',
      passwordHash,
      isActive: true,
    },
  });

  await seedMessagingData(prisma);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
