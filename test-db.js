const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('@prisma/client');
async function test() {
  const adapter = new PrismaPg({ connectionString: 'postgresql://paperclip@127.0.0.1:54329/paperclip' });
  const client = new PrismaClient({ adapter });
  await client.$connect();
  const tables = await client.$queryRaw `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('Job', 'Application', 'Payment', 'Rating', 'CompetencyScore', 'SafetyIncident', 'RiskScore', 'Dispute', 'AdminNote', 'PlatformFee', 'BackgroundCheckFee', 'AdminConfig', 'JobCheckIn', 'ChatThread', 'ChatMessage', 'AffiliateLink', 'AffiliateLinkClick', 'User', 'WorkerProfile', 'PosterProfile')`;
  console.log(JSON.stringify(tables, null, 2));
  await client.$disconnect();
}
test().catch(e => console.error(e.message));
