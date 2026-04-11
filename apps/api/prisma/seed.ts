import { PrismaClient, RecipientStatus, TemplateType } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { EST1_ALL_FIXTURE_ROWS } from './fixtures/est1-all.fixture';
import { normalizeRecipientImport } from '../src/messaging/recipient-import';

const prisma = new PrismaClient();

const SEEDED_TEMPLATE_DEFINITIONS = [
  {
    name: 'Exam Reminder',
    type: TemplateType.BOTH,
    subject: 'EST1 assignment for {{name}}',
    body: 'Hello {{name}}, your EST1 room is {{room_est1}} at {{building}} in {{governorate}}. Location: {{location}}',
  },
  {
    name: 'Seed - Email Only',
    type: TemplateType.EMAIL,
    subject: 'EST1 briefing for {{name}}',
    body: 'Hello {{name}}, your role is {{role}} at {{building}}. Room: {{room_est1}}. Address: {{address}}',
  },
  {
    name: 'Seed - WhatsApp Only',
    type: TemplateType.WHATSAPP,
    subject: 'WhatsApp briefing',
    body: 'Hello {{name}}, you are assigned as {{role}} ({{type}}) in {{building}}. Room: {{room_est1}}',
  },
] as const;

const SEEDED_RECIPIENTS = EST1_ALL_FIXTURE_ROWS.map((row, index) => ({
  id: `seed-est1-${String(index + 1).padStart(4, '0')}`,
  ...normalizeRecipientImport(row, index),
  status: RecipientStatus.PENDING,
  error_message: null,
  attempts_count: 0,
  last_attempt_at: null,
}));

const SEEDED_LOGS: Array<{
  recipientName: string;
  status: RecipientStatus;
  error: string | null;
  created_at: Date;
}> = [];

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

  const seededRecipientIds = SEEDED_RECIPIENTS.map((recipient) => recipient.id);

  const existingSeedRecipients = await client.recipient.findMany({
    where: { id: { in: seededRecipientIds } },
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

  if (SEEDED_LOGS.length) {
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
