const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const bot = await prisma.bot.findFirst();
  const res = await fetch('http://localhost:3000/api/bots/' + bot.id);
  const botData = await res.json();
  console.log('Saving bot:', botData.id);
  const putRes = await fetch('http://localhost:3000/api/bots/' + bot.id, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...botData, docsUploaded: true })
  });
  const putData = await putRes.json();
  console.log('Response:', putRes.status, putData);
}
main().catch(console.error).finally(() => prisma.$disconnect());
