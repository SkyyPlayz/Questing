"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type MapJob = {
  id: string;
  tier: string;
  title: string;
  payRate: number;
  xpReward: number;
};

export default function JobMap() {
  const [jobs, setJobs] = useState<MapJob[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchJobs = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/jobs/map?lat=43.0731&lng=-104.1458&radius=25");
        const data = await res.json();
        setJobs(res.ok && Array.isArray(data) ? data : []);
      } catch {
        setJobs([]);
      }
      setLoading(false);
    };
    fetchJobs();
  }, []);

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] bg-gray-900 text-white">
      <div className="bg-gray-900 text-white px-4 py-2 flex items-center gap-4 text-sm">
        <span className="font-bold text-yellow-400 text-base">🗺️ Quest Map</span>
        <span className="text-gray-400">{loading ? "Loading..." : `${jobs.length} quests nearby`}</span>
      </div>
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400 mb-4">Interactive map requires Leaflet (client-side only)</p>
          <Link href="/map" className="bg-yellow-400 hover:bg-yellow-300 text-gray-900 font-bold py-2 px-6 rounded inline-block">
            Open Full Map →
          </Link>
        </div>
      </div>
      <div className="bg-gray-800 p-4 max-h-48 overflow-y-auto">
        <h3 className="font-bold text-yellow-400 mb-2">Nearby Quests</h3>
        {jobs.length === 0 ? (
          <p className="text-gray-400 text-sm">No quests found in your area.</p>
        ) : (
          <div className="grid grid-cols-1 gap-2">
            {jobs.slice(0, 5).map((job) => (
              <Link key={job.id} href={`/jobs/${job.id}`} className="bg-gray-700 hover:bg-gray-600 rounded p-3 flex items-center gap-3">
                <span className="text-lg">{job.tier === "Legendary" ? "🏆" : job.tier === "Epic" ? "💎" : job.tier === "Rare" ? "🗡️" : "⚔️"}</span>
                <div>
                  <div className="font-bold text-sm">{job.title}</div>
                  <div className="text-gray-400 text-xs">${job.payRate}/hr · +{job.xpReward} XP</div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
