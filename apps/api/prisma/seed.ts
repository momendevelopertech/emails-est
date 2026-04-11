import { PrismaClient, RecipientStatus, TemplateType } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const SEEDED_TEMPLATE_DEFINITIONS = [
  {
    name: 'Exam Reminder',
    type: TemplateType.BOTH,
    subject: 'Reminder for {{name}}',
    body: 'Hello {{name}}, your exam is on {{date}} at {{arrival_time}} in room {{room}}.',
  },
  {
    name: 'Seed - Email Only',
    type: TemplateType.EMAIL,
    subject: 'Exam briefing for {{name}}',
    body: 'Hello {{name}}, please arrive at {{arrival_time}} to {{test_center}} and report to room {{room}}.',
  },
  {
    name: 'Seed - WhatsApp Only',
    type: TemplateType.WHATSAPP,
    subject: 'WhatsApp briefing',
    body: 'Hello {{name}}, your shift is {{day}} for {{exam_type}} at {{arrival_time}}.',
  },
] as const;

const SEEDED_RECIPIENTS = [
  {
    name: 'Seed Pending Email',
    email: 'seed.pending.email@example.com',
    phone: null,
    exam_type: 'SEED-EST-1',
    role: 'Senior',
    day: 'Friday',
    date: '2026-04-10',
    test_center: 'Nasr City Center',
    faculty: 'Engineering',
    room: 'A-12',
    address: 'Nasr City, Cairo',
    map_link: 'https://maps.app.goo.gl/example',
    arrival_time: '08:30',
    status: RecipientStatus.PENDING,
    error_message: null,
    attempts_count: 0,
    last_attempt_at: null,
  },
  {
    name: 'Seed Pending WhatsApp',
    email: null,
    phone: '01012345679',
    exam_type: 'SEED-EST-1',
    role: 'Observer',
    day: 'Friday',
    date: '2026-04-10',
    test_center: 'Nasr City Center',
    faculty: 'Business',
    room: 'B-03',
    address: 'Nasr City, Cairo',
    map_link: 'https://maps.app.goo.gl/example',
    arrival_time: '09:00',
    status: RecipientStatus.PENDING,
    error_message: null,
    attempts_count: 0,
    last_attempt_at: null,
  },
  {
    name: 'Seed Pending Both',
    email: 'seed.pending.both@example.com',
    phone: '01012345680',
    exam_type: 'SEED-EST-2',
    role: 'Lead',
    day: 'Saturday',
    date: '2026-04-11',
    test_center: 'October Campus',
    faculty: 'Medicine',
    room: 'C-08',
    address: '6th of October, Giza',
    map_link: 'https://maps.app.goo.gl/example',
    arrival_time: '07:45',
    status: RecipientStatus.PENDING,
    error_message: null,
    attempts_count: 0,
    last_attempt_at: null,
  },
  {
    name: 'Seed Sent Recipient',
    email: 'seed.sent@example.com',
    phone: '01012345681',
    exam_type: 'SEED-EST-2',
    role: 'Coordinator',
    day: 'Saturday',
    date: '2026-04-11',
    test_center: 'October Campus',
    faculty: 'Science',
    room: 'D-02',
    address: '6th of October, Giza',
    map_link: 'https://maps.app.goo.gl/example',
    arrival_time: '08:15',
    status: RecipientStatus.SENT,
    error_message: null,
    attempts_count: 1,
    last_attempt_at: new Date('2026-04-08T08:30:00.000Z'),
  },
  {
    name: 'Seed Failed Recipient',
    email: 'seed.failed@example.com',
    phone: '01012345682',
    exam_type: 'SEED-EST-3',
    role: 'Support',
    day: 'Sunday',
    date: '2026-04-12',
    test_center: 'Maadi Branch',
    faculty: 'Arts',
    room: 'E-11',
    address: 'Maadi, Cairo',
    map_link: 'https://maps.app.goo.gl/example',
    arrival_time: '09:30',
    status: RecipientStatus.FAILED,
    error_message: 'SMTP rejected the recipient address',
    attempts_count: 2,
    last_attempt_at: new Date('2026-04-08T09:10:00.000Z'),
  },
  {
    name: 'Seed Processing Recipient',
    email: 'seed.processing@example.com',
    phone: '01012345683',
    exam_type: 'SEED-EST-3',
    role: 'Assistant',
    day: 'Sunday',
    date: '2026-04-12',
    test_center: 'Maadi Branch',
    faculty: 'Law',
    room: 'F-05',
    address: 'Maadi, Cairo',
    map_link: 'https://maps.app.goo.gl/example',
    arrival_time: '10:15',
    status: RecipientStatus.PROCESSING,
    error_message: null,
    attempts_count: 1,
    last_attempt_at: new Date('2026-04-08T09:25:00.000Z'),
  },
] as const;

const SEEDED_LOGS = [
  {
    recipientName: 'Seed Sent Recipient',
    status: RecipientStatus.SENT,
    error: null,
    created_at: new Date('2026-04-08T08:30:00.000Z'),
  },
  {
    recipientName: 'Seed Failed Recipient',
    status: RecipientStatus.FAILED,
    error: 'SMTP rejected the recipient address',
    created_at: new Date('2026-04-08T09:10:00.000Z'),
  },
  {
    recipientName: 'Seed Failed Recipient',
    status: RecipientStatus.FAILED,
    error: 'WhatsApp number is not registered (201012345682).',
    created_at: new Date('2026-04-08T09:11:00.000Z'),
  },
] as const;

type SeedUserInput = {
  id: string;
  employeeNumber: string;
  email: string;
  username: string;
  fullName: string;
  passwordHash: string;
};

async function hasColumn(client: PrismaClient, tableName: string, columnName: string) {
  const result = await client.$queryRawUnsafe<Array<{ count: bigint | number }>>(`
    SELECT COUNT(*)::int AS count
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = '${tableName}'
      AND column_name = '${columnName}'
  `);

  return Number(result?.[0]?.count || 0) > 0;
}

async function upsertSeedUser(client: PrismaClient, user: SeedUserInput) {
  const hasEmployeeNumber = await hasColumn(client, 'User', 'employeeNumber');

  if (hasEmployeeNumber) {
    await client.$executeRawUnsafe(
      `
        INSERT INTO "User" (
          "id",
          "employeeNumber",
          "username",
          "fullName",
          "email",
          "passwordHash",
          "role",
          "isActive",
          "mustChangePass",
          "updatedAt"
        )
        VALUES ($1, $2, $3, $4, $5, $6, 'SUPER_ADMIN', true, false, CURRENT_TIMESTAMP)
        ON CONFLICT ("email")
        DO UPDATE SET
          "employeeNumber" = EXCLUDED."employeeNumber",
          "username" = EXCLUDED."username",
          "fullName" = EXCLUDED."fullName",
          "passwordHash" = EXCLUDED."passwordHash",
          "role" = 'SUPER_ADMIN',
          "isActive" = true,
          "mustChangePass" = false,
          "updatedAt" = CURRENT_TIMESTAMP
      `,
      user.id,
      user.employeeNumber,
      user.username,
      user.fullName,
      user.email,
      user.passwordHash,
    );
    return;
  }

  await client.user.upsert({
    where: { email: user.email },
    update: {
      fullName: user.fullName,
      role: 'SUPER_ADMIN',
      isActive: true,
      passwordHash: user.passwordHash,
    },
    create: {
      email: user.email,
      username: user.username,
      fullName: user.fullName,
      role: 'SUPER_ADMIN',
      passwordHash: user.passwordHash,
      isActive: true,
    },
  });
}

function buildDefaultMailFrom(senderName: string, senderEmail: string) {
  if (senderEmail) {
    return `${senderName} <${senderEmail}>`;
  }
  return senderName;
}

async function seedEmailSettings(client: PrismaClient) {
  const senderName = (process.env.SENDER_NAME || 'SPHINX HR').trim() || 'SPHINX HR';
  const senderEmail = (process.env.SENDER_EMAIL || process.env.MAIL_USER || '').trim();
  const mailFrom = buildDefaultMailFrom(senderName, senderEmail);

  await client.emailSettings.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      sender_name: senderName,
      sender_email: senderEmail,
      mail_from: mailFrom,
    },
  });
}

export async function seedMessagingData(client: PrismaClient) {
  for (const template of SEEDED_TEMPLATE_DEFINITIONS) {
    await client.template.upsert({
      where: { name: template.name },
      update: {
        type: template.type,
        subject: template.subject,
        body: template.body,
      },
      create: template,
    });
  }

  const seededExamTypes = Array.from(new Set(
    SEEDED_RECIPIENTS.map((recipient) => recipient.exam_type).filter(Boolean),
  ));

  const existingSeedRecipients = await client.recipient.findMany({
    where: { exam_type: { in: seededExamTypes } },
    select: { id: true },
  });

  const existingIds = existingSeedRecipients.map((recipient) => recipient.id);
  if (existingIds.length) {
    await client.log.deleteMany({
      where: { recipientId: { in: existingIds } },
    });
    await client.recipient.deleteMany({
      where: { id: { in: existingIds } },
    });
  }

  const createdRecipients = [] as Array<{ id: string; name: string }>;
  for (const recipient of SEEDED_RECIPIENTS) {
    const created = await client.recipient.create({ data: recipient });
    createdRecipients.push({ id: created.id, name: created.name });
  }

  const recipientIdByName = new Map(createdRecipients.map((recipient) => [recipient.name, recipient.id]));
  await client.log.createMany({
    data: SEEDED_LOGS
      .map((log) => {
        const recipientId = recipientIdByName.get(log.recipientName);
        if (!recipientId) return null;
        return {
          recipientId,
          status: log.status,
          error: log.error,
          created_at: log.created_at,
        };
      })
      .filter(Boolean) as Array<{
        recipientId: string;
        status: RecipientStatus;
        error: string | null;
        created_at: Date;
      }>,
  });
}

async function main() {
  const passwordHash = await bcrypt.hash('Admin@123456', 10);
  await upsertSeedUser(prisma, {
    id: 'seed-admin-messaging',
    employeeNumber: 'SEED-ADMIN-001',
    email: 'admin@messaging.local',
    username: 'admin',
    fullName: 'Messaging Admin',
    passwordHash,
  });

  await upsertSeedUser(prisma, {
    id: 'seed-superadmin-sphinx',
    employeeNumber: 'SEED-ADMIN-002',
    email: 'superadmin@sphinx.com',
    username: 'superadmin',
    fullName: 'SPHINX Super Admin',
    passwordHash,
  });

  await seedEmailSettings(prisma);
  await seedMessagingData(prisma);
}

export { main };

if (require.main === module) {
  main()
    .then(async () => {
      await prisma.$disconnect();
    })
    .catch(async (e) => {
      console.error(e);
      await prisma.$disconnect();
      process.exit(1);
    });
}
