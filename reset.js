const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.bot.updateMany({ data: { docsUploaded: false } })
  .then(res => console.log('Reset bots:', res.count))
  .catch(console.error)
  .finally(() => prisma.$disconnect());
