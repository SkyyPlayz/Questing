import { prisma } from "@/app/lib/prisma";
import { XPAction } from "@prisma/client";

export const XP_REWARDS: Record<XPAction, number> = {
  JOB_ACCEPTED: 10,
  STAGE_COMPLETED: 25,
  QUEST_COMPLETED: 100,
  RATING_RECEIVED_5_STAR: 50,
  USER_CREATED: 50,
};

const LEVEL_THRESHOLDS = [
  { level: "Apprentice", min: 0, next: "Journeyman", nextMin: 500 },
  { level: "Journeyman", min: 500, next: "Skilled", nextMin: 1500 },
  { level: "Skilled", min: 1500, next: "Expert", nextMin: 3500 },
  { level: "Expert", min: 3500, next: "Master", nextMin: 7500 },
  { level: "Master", min: 7500, next: null, nextMin: null },
];

function computeLevel(totalXP: number) {
  let entry = LEVEL_THRESHOLDS[0];
  for (const t of LEVEL_THRESHOLDS) {
    if (totalXP >= t.min) entry = t;
  }
  return {
    level: entry.level,
    nextLevel: entry.next,
    xpToNext: entry.nextMin != null ? entry.nextMin - totalXP : null,
  };
}

export async function awardXP(userId: string, action: XPAction, jobId?: string) {
  const xpAwarded = XP_REWARDS[action];

  await prisma.xPTransaction.create({
    data: { userId, jobId: jobId ?? null, action, xpAwarded },
  });

  const agg = await prisma.xPTransaction.aggregate({
    where: { userId },
    _sum: { xpAwarded: true },
  });
  const totalXP = agg._sum.xpAwarded ?? 0;
  const { level, nextLevel, xpToNext } = computeLevel(totalXP);

  await prisma.userLevel.upsert({
    where: { userId },
    create: { userId, totalXP, level, nextLevel, xpToNext },
    update: { totalXP, level, nextLevel, xpToNext },
  });

  return { xpAwarded, totalXP, level, nextLevel, xpToNext };
}
