import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://postgres.qeszrfvfblsmaexmwqxn:ALRMY1A0Nn.@aws-0-ap-south-1.pooler.supabase.com:5432/postgres'
    }
  }
});

prisma.user.findFirst().then(console.log).catch(console.error).finally(() => prisma.$disconnect());
