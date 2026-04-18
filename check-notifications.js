const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkNotifications() {
  const users = await prisma.user.findMany({
    where: { email: 'mayanksharma0205@gmail.com' }
  });
  
  if (users.length === 0) {
    console.log('User not found');
    return;
  }

  const user = users[0];
  console.log('User ID:', user.id);

  const notifications = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' }
  });

  console.log('Notification Count:', notifications.length);
  console.log('Last 5 notifications:', JSON.stringify(notifications.slice(0, 5), null, 2));
}

checkNotifications()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
