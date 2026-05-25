"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";

type Job = {
  id: string;
  title: string;
  category: string;
  payRate: number;
  locationLat: number;
  locationLng: number;
  locationAddress: string | null;
  tier: string;
  xpReward: number;
  distance: number;
  poster: { id: string; name: string | null };
};

const TIER_COLORS: Record<string, string> = {
  Common: "#6b7280",
  Rare: "#3b82f6",
  Epic: "#8b5cf6",
  Legendary: "#f59e0b",
};

const TIER_ICONS: Record<string, string> = {
  Common: "⚔️",
  Rare: "🗡️",
  Epic: "💎",
  Legendary: "🏆",
};

export default function MapClient() {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<unknown>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selected, setSelected] = useState<Job | null>(null);
  const [userPos, setUserPos] = useState<{ lat: number; lng: number } | null>(null);
  const [radius, setRadius] = useState(25);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchJobs = async (lat: number, lng: number, r: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/jobs/map?lat=${lat}&lng=${lng}&radius=${r}`);
      const data = await res.json();
      if (!res.ok) {
        setJobs([]);
        setError(data.message || "Unable to load quests for this map view.");
        return;
      }
      setJobs(Array.isArray(data) ? data : []);
    } catch {
      setJobs([]);
      setError("Unable to load quests for this map view.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserPos(coords);
        fetchJobs(coords.lat, coords.lng, radius);
      },
      () => {
        // Default to Lincoln County, WY
        const coords = { lat: 43.0731, lng: -104.1458 };
        setUserPos(coords);
        fetchJobs(coords.lat, coords.lng, radius);
      }
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!userPos || !mapRef.current) return;

    let isMounted = true;

    import("leaflet").then((L) => {
      if (!isMounted || !mapRef.current) return;

      // Fix default marker icon paths
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      if (leafletMapRef.current) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (leafletMapRef.current as any).remove();
      }

      const map = L.map(mapRef.current).setView([userPos.lat, userPos.lng], 11);
      leafletMapRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '© <a href="https://openstreetmap.org">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      // User location marker
      L.circleMarker([userPos.lat, userPos.lng], {
        radius: 8,
        fillColor: "#10b981",
        color: "#fff",
        weight: 2,
        fillOpacity: 1,
      })
        .addTo(map)
        .bindPopup("📍 You are here");

      // Job markers
      jobs.forEach((job) => {
        const color = TIER_COLORS[job.tier] || "#6b7280";
        const icon = TIER_ICONS[job.tier] || "⚔️";

        const markerIcon = L.divIcon({
          html: `<div style="background:${color};color:white;border-radius:50%;width:32px;height:32px;display:flex;align-items:center;justify-content:center;font-size:16px;box-shadow:0 2px 6px rgba(0,0,0,0.4);border:2px solid white;">${icon}</div>`,
          className: "",
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        });

        L.marker([job.locationLat, job.locationLng], { icon: markerIcon })
          .addTo(map)
          .on("click", () => setSelected(job));
      });
    });

    return () => {
      isMounted = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userPos, jobs]);

  const handleRadiusChange = (r: number) => {
    setRadius(r);
    if (userPos) fetchJobs(userPos.lat, userPos.lng, r);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      {/* Top bar */}
      <div className="bg-gray-900 text-white px-4 py-2 flex items-center gap-4 text-sm flex-wrap">
        <span className="font-bold text-yellow-400 text-base">🗺️ Quest Map</span>
        <span className={error ? "text-red-300" : "text-gray-400"}>{error || (loading ? "Loading quests..." : `${jobs.length} quests nearby`)}</span>
        <div className="flex items-center gap-2 ml-auto">
          <span className="text-gray-400">Radius:</span>
          {[10, 25, 50, 100].map((r) => (
            <button
              key={r}
              onClick={() => handleRadiusChange(r)}
              className={`px-2 py-1 rounded text-xs font-medium ${radius === r ? "bg-yellow-400 text-gray-900" : "bg-gray-700 hover:bg-gray-600"}`}
            >
              {r}km
            </button>
          ))}
        </div>
        {/* Legend */}
        <div className="flex items-center gap-3 ml-2">
          {Object.entries(TIER_COLORS).map(([tier, color]) => (
            <span key={tier} className="flex items-center gap-1">
              <span style={{ background: color }} className="w-3 h-3 rounded-full inline-block" />
              <span className="text-gray-300">{tier}</span>
            </span>
          ))}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Map */}
        <div ref={mapRef} className="flex-1" />

        {/* Side panel */}
        {selected && (
          <div className="w-72 bg-gray-900 text-white p-4 overflow-y-auto flex flex-col gap-3">
            <button
              onClick={() => setSelected(null)}
              className="self-end text-gray-400 hover:text-white text-lg leading-none"
            >
              ✕
            </button>
            <div
              className="text-xs font-bold uppercase tracking-wide px-2 py-1 rounded self-start"
              style={{ background: TIER_COLORS[selected.tier] }}
            >
              {TIER_ICONS[selected.tier]} {selected.tier} Quest
            </div>
            <h2 className="text-lg font-bold">{selected.title}</h2>
            <p className="text-gray-400 text-sm">{selected.category}</p>
            {selected.locationAddress && (
              <p className="text-gray-300 text-sm">📍 {selected.locationAddress}</p>
            )}
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="bg-gray-800 rounded p-2">
                <div className="text-gray-400 text-xs">Pay Rate</div>
                <div className="font-bold text-green-400">${selected.payRate}/hr</div>
              </div>
              <div className="bg-gray-800 rounded p-2">
                <div className="text-gray-400 text-xs">XP Reward</div>
                <div className="font-bold text-yellow-400">+{selected.xpReward} XP</div>
              </div>
              <div className="bg-gray-800 rounded p-2">
                <div className="text-gray-400 text-xs">Distance</div>
                <div className="font-bold">{selected.distance.toFixed(1)} km</div>
              </div>
              <div className="bg-gray-800 rounded p-2">
                <div className="text-gray-400 text-xs">Posted by</div>
                <div className="font-bold truncate">{selected.poster.name || "Anonymous"}</div>
              </div>
            </div>
            <Link
              href={`/jobs/${selected.id}`}
              className="mt-2 block text-center bg-yellow-400 hover:bg-yellow-300 text-gray-900 font-bold py-2 px-4 rounded"
            >
              View Quest →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
