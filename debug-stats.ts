import { prisma } from "./src/lib/prisma";

async function debug() {
  const userId = "clsh7fjh20000ux10s7as2x88"; // Need to find actual userId
  // Let's just find the first user
  const user = await prisma.user.findFirst();
  if (!user) {
    console.log("No users found");
    return;
  }
  
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - 7);
  
  const sets = await prisma.setLog.count({
    where: {
        isCompleted: true,
        workoutLog: {
            session: {
                userId: user.id,
                startTime: { gte: weekStart }
            }
        }
    }
  });
  
  console.log(`User ${user.email} has ${sets} completed sets in last 7 days`);
  
  const thisWeekStart = new Date();
  thisWeekStart.setHours(0,0,0,0);
  // Monday calculation
  const day = thisWeekStart.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  thisWeekStart.setDate(thisWeekStart.getDate() + diff);
  
  const weekSets = await prisma.setLog.count({
    where: {
        isCompleted: true,
        workoutLog: {
            session: {
                userId: user.id,
                startTime: { gte: thisWeekStart }
            }
        }
    }
  });
  
  console.log(`User ${user.email} has ${weekSets} completed sets since Monday ${thisWeekStart.toDateString()}`);
}

debug();
