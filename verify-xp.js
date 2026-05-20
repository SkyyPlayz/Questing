const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('@prisma/client');

async function verify() {
  const adapter = new PrismaPg({ connectionString: 'postgresql://paperclip@127.0.0.1:54329/paperclip' });
  const client = new PrismaClient({ adapter });
  await client.$connect();

  const tables = await client.$queryRaw`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('XPTransaction', 'UserLevel')`;
  console.log('XP tables found:', JSON.stringify(tables, null, 2));

  // Also verify the schema has the XPAction enum
  const enums = await client.$queryRaw`SELECT enum_name FROM information_schema.enum_types WHERE enum_name = 'XPAction'`;
  console.log('XPAction enum found:', JSON.stringify(enums, null, 2));

  await client.$disconnect();
}

verify().catch(e => console.error(e.message));
