const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const bots = await prisma.bot.findMany();
  for (let bot of bots) {
    const res = await fetch('http://localhost:3000/api/bots/' + bot.id);
    const botData = await res.json();
    const putRes = await fetch('http://localhost:3000/api/bots/' + bot.id, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...botData, docsUploaded: true })
    });
    if (!putRes.ok) {
      console.error('Failed for bot', bot.id, await putRes.json());
    }
  }
  console.log('Done testing all bots.');
}
main().finally(() => prisma.$disconnect());
