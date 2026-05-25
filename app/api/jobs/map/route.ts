import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { JobStatus } from "@prisma/client";
import { parseJobMapQuery } from "@/app/lib/job-map-query.mjs";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const query = parseJobMapQuery(searchParams);

  if (!query.ok) {
    return NextResponse.json(query, { status: 400 });
  }

  // Get jobs with coordinates that are OPEN
  const jobs = await prisma.job.findMany({
    where: {
      status: JobStatus.OPEN,
      locationLat: { not: null },
      locationLng: { not: null },
    },
    include: {
      poster: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  // Calculate distance from user location and filter by radius
  const { lat: userLat, lng: userLng, radius } = query.value;

  const filtered = jobs
    .map((job) => {
      const jobLat = job.locationLat!;
      const jobLng = job.locationLng!;
      const dist = haversineDistance(userLat, userLng, jobLat, jobLng);
      return { ...job, distance: dist };
    })
    .filter((job) => job.distance <= radius);

  // Assign difficulty tier based on payRate
  const enriched = filtered.map((job) => ({
    ...job,
    tier: getTier(job.payRate),
    xpReward: getXp(job.payRate),
  }));

  return NextResponse.json(enriched);
}

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function getTier(payRate: number): string {
  if (payRate < 15) return "Common";
  if (payRate < 30) return "Rare";
  if (payRate < 50) return "Epic";
  return "Legendary";
}

function getXp(payRate: number): number {
  if (payRate < 15) return 10;
  if (payRate < 30) return 25;
  if (payRate < 50) return 50;
  return 100;
}
