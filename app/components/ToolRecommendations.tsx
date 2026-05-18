"use client";

import { useEffect, useState } from "react";

type AffiliateLink = {
  id: string;
  jobCategory: string;
  toolName: string;
  description: string;
  affiliateUrl: string;
  retailer: string;
  imageUrl: string | null;
  clickCount: number;
  isActive: boolean;
};

export default function ToolRecommendations({ jobId, category }: { jobId: string; category: string }) {
  const [links, setLinks] = useState<AffiliateLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [clicking, setClicking] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/affiliate-links?category=${encodeURIComponent(category)}`)
      .then((res) => res.json())
      .then((data) => {
        setLinks(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [category]);

  async function handleBuy(linkId: string, url: string) {
    setClicking(linkId);
    try {
      await fetch(`/api/affiliate-links/${linkId}/click`, { method: "POST" });
      window.open(url, "_blank");
    } catch {
      window.open(url, "_blank");
    }
    setClicking(null);
  }

  if (loading) return <div className="border-t pt-4 mt-4 text-sm text-gray-400">Loading recommendations...</div>;
  if (links.length === 0) return null;

  const retailerIcons: Record<string, string> = {
    AMAZON: "🛒",
    HOME_DEPOT: "🏠",
    LOWES: "🔨",
    OTHER: "🔗",
  };

  return (
    <div className="border-t pt-4 mt-4">
      <h2 className="font-semibold mb-3">🛠 Recommended Tools for {category}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {links.map((link) => (
          <div key={link.id} className="border rounded-lg p-3 bg-gray-50">
            {link.imageUrl && (
              <img
                src={link.imageUrl}
                alt={link.toolName}
                className="w-full h-32 object-cover rounded mb-2"
              />
            )}
            <div className="flex items-center gap-1 text-sm text-gray-500 mb-1">
              <span>{retailerIcons[link.retailer] || "🔗"}</span>
              <span>{link.retailer}</span>
              <span className="text-xs text-gray-400 ml-auto">({link.clickCount} clicks)</span>
            </div>
            <h3 className="font-medium text-sm">{link.toolName}</h3>
            <p className="text-xs text-gray-600 mt-1">{link.description}</p>
            <button
              onClick={() => handleBuy(link.id, link.affiliateUrl)}
              disabled={clicking === link.id}
              className="mt-2 w-full bg-blue-600 text-white px-3 py-1.5 rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {clicking === link.id ? "Opening..." : "Buy Now"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
