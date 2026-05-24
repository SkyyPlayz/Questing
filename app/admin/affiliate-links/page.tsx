"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

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
  createdAt: string;
  updatedAt: string;
};

export default function AdminAffiliateLinksPage() {
  const [links, setLinks] = useState<AffiliateLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [form, setForm] = useState({
    jobCategory: "",
    toolName: "",
    description: "",
    affiliateUrl: "",
    retailer: "AMAZON",
    imageUrl: "",
  });

  const retailers = ["AMAZON", "HOME_DEPOT", "LOWES", "OTHER"];
  const retailerIcons: Record<string, string> = {
    AMAZON: "🛒",
    HOME_DEPOT: "🏠",
    LOWES: "🔨",
    OTHER: "🔗",
  };

  useEffect(() => {
    fetch("/api/admin/affiliate-links")
      .then((res) => res.json())
      .then((data) => {
        setLinks(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  function resetForm() {
    setForm({
      jobCategory: "",
      toolName: "",
      description: "",
      affiliateUrl: "",
      retailer: "AMAZON",
      imageUrl: "",
    });
    setEditingId(null);
    setFormOpen(false);
    setError(null);
    setSuccess(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!form.jobCategory || !form.toolName || !form.description || !form.affiliateUrl) {
      setError("Missing required fields: category, toolName, description, affiliateUrl");
      return;
    }

    try {
      if (editingId) {
        const res = await fetch(`/api/admin/affiliate-links/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        if (!res.ok) {
          const data = await res.json();
          setError(data.error || "Update failed");
          return;
        }
        setSuccess("Link updated successfully");
      } else {
        const res = await fetch("/api/admin/affiliate-links", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        if (!res.ok) {
          const data = await res.json();
          setError(data.error || "Create failed");
          return;
        }
        setSuccess("Link created successfully");
      }
      // Refresh list
      const refreshed = await fetch("/api/admin/affiliate-links").then((r) => r.json());
      setLinks(refreshed);
      resetForm();
    } catch (err) {
      setError("Request failed");
    }
  }

  async function handleToggle(id: string, currentActive: boolean) {
    try {
      const res = await fetch(`/api/admin/affiliate-links/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !currentActive }),
      });
      if (res.ok) {
        setLinks(links.map((l) => (l.id === id ? { ...l, isActive: !currentActive } : l)));
      }
    } catch {
      setError("Toggle failed");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this affiliate link?")) return;
    try {
      const res = await fetch(`/api/admin/affiliate-links/${id}`, { method: "DELETE" });
      if (res.ok) {
        setLinks(links.filter((l) => l.id !== id));
        setSuccess("Link deleted");
      }
    } catch {
      setError("Delete failed");
    }
  }

  function startEdit(link: AffiliateLink) {
    setForm({
      jobCategory: link.jobCategory,
      toolName: link.toolName,
      description: link.description,
      affiliateUrl: link.affiliateUrl,
      retailer: link.retailer,
      imageUrl: link.imageUrl || "",
    });
    setEditingId(link.id);
    setFormOpen(true);
    setError(null);
    setSuccess(null);
  }

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><p className="text-gray-400">Loading...</p></div>;

  const categories = [...new Set(links.map((l) => l.jobCategory))].sort();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-blue-700">Affiliate Links Management</h1>
          <Link href="/admin" className="text-gray-500 hover:text-blue-600 text-sm">
            Back to Admin Dashboard
          </Link>
        </div>

        {error && <div className="bg-red-50 border border-red-200 rounded p-3 mb-4 text-red-700 text-sm">{error}</div>}
        {success && <div className="bg-green-50 border border-green-200 rounded p-3 mb-4 text-green-700 text-sm">{success}</div>}

        {/* Summary stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg p-4 border">
            <p className="text-sm text-gray-500">Total Links</p>
            <p className="text-2xl font-bold">{links.length}</p>
          </div>
          <div className="bg-white rounded-lg p-4 border">
            <p className="text-sm text-gray-500">Active Links</p>
            <p className="text-2xl font-bold text-green-700">{links.filter((l) => l.isActive).length}</p>
          </div>
          <div className="bg-white rounded-lg p-4 border">
            <p className="text-sm text-gray-500">Total Clicks</p>
            <p className="text-2xl font-bold text-blue-700">{links.reduce((s, l) => s + l.clickCount, 0)}</p>
          </div>
        </div>

        {/* Add / Edit form */}
        {formOpen && (
          <div className="bg-white rounded-lg border p-6 mb-6">
            <h2 className="text-xl font-bold mb-4 text-gray-800">
              {editingId ? "Edit Affiliate Link" : "Add New Affiliate Link"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Job Category *</label>
                  <input
                    type="text"
                    value={form.jobCategory}
                    onChange={(e) => setForm({ ...form, jobCategory: e.target.value })}
                    className="border rounded px-3 py-2 w-full text-sm"
                    placeholder="e.g. landscaping, cleaning, moving"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tool Name *</label>
                  <input
                    type="text"
                    value={form.toolName}
                    onChange={(e) => setForm({ ...form, toolName: e.target.value })}
                    className="border rounded px-3 py-2 w-full text-sm"
                    placeholder="e.g. Professional Lawn Mower"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Retailer</label>
                  <select
                    value={form.retailer}
                    onChange={(e) => setForm({ ...form, retailer: e.target.value })}
                    className="border rounded px-3 py-2 w-full text-sm"
                  >
                    {retailers.map((r) => (
                      <option key={r} value={r}>{retailerIcons[r]} {r}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Image URL</label>
                  <input
                    type="text"
                    value={form.imageUrl}
                    onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                    className="border rounded px-3 py-2 w-full text-sm"
                    placeholder="https://..."
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    className="border rounded px-3 py-2 w-full text-sm h-20 resize-none"
                    placeholder="Why this tool is recommended for this job category..."
                    required
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Affiliate URL *</label>
                  <input
                    type="text"
                    value={form.affiliateUrl}
                    onChange={(e) => setForm({ ...form, affiliateUrl: e.target.value })}
                    className="border rounded px-3 py-2 w-full text-sm"
                    placeholder="https://amazon.com/dp/... with your affiliate tag"
                    required
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="bg-blue-600 text-white px-5 py-2 rounded text-sm font-medium hover:bg-blue-700"
                >
                  {editingId ? "Update Link" : "Create Link"}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="bg-gray-200 text-gray-700 px-5 py-2 rounded text-sm hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Add new button */}
        {!formOpen && (
          <button
            onClick={() => setFormOpen(true)}
            className="bg-blue-600 text-white px-5 py-2 rounded text-sm font-medium hover:bg-blue-700 mb-6"
          >
            + Add New Affiliate Link
          </button>
        )}

        {/* Links grouped by category */}
        {categories.length === 0 ? (
          <div className="bg-white rounded-lg border p-6 text-center">
            <p className="text-gray-400">No affiliate links configured yet.</p>
            <p className="text-sm text-gray-500 mt-2">Use the button above to add your first link.</p>
          </div>
        ) : (
          categories.map((cat) => (
            <div key={cat} className="bg-white rounded-lg border p-6 mb-6">
              <h2 className="text-lg font-bold mb-3 text-gray-800">
                {cat.charAt(0).toUpperCase() + cat.slice(1)} ({links.filter((l) => l.jobCategory === cat).length} links)
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-gray-500">
                      <th className="text-left py-2 px-3">Tool</th>
                      <th className="text-left py-2 px-3">Retailer</th>
                      <th className="text-left py-2 px-3">Description</th>
                      <th className="text-right py-2 px-3">Clicks</th>
                      <th className="text-center py-2 px-3">Status</th>
                      <th className="text-left py-2 px-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {links.filter((l) => l.jobCategory === cat).map((link) => (
                      <tr key={link.id} className="border-b">
                        <td className="py-2 px-3 font-medium">{link.toolName}</td>
                        <td className="py-2 px-3">
                          <span className="text-xs">{retailerIcons[link.retailer]} {link.retailer}</span>
                        </td>
                        <td className="py-2 px-3 text-gray-600 max-w-xs truncate">{link.description}</td>
                        <td className="py-2 px-3 text-right font-mono">{link.clickCount}</td>
                        <td className="py-2 px-3 text-center">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                            link.isActive
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-gray-100 text-gray-700"
                          }`}>
                            {link.isActive ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="py-2 px-3">
                          <div className="flex gap-1">
                            <button
                              onClick={() => startEdit(link)}
                              className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs hover:bg-blue-200"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleToggle(link.id, link.isActive)}
                              className={`px-2 py-1 rounded text-xs font-medium ${
                                link.isActive
                                  ? "bg-amber-100 text-amber-700 hover:bg-amber-200"
                                  : "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                              }`}
                            >
                              {link.isActive ? "Disable" : "Enable"}
                            </button>
                            <button
                              onClick={() => handleDelete(link.id)}
                              className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs hover:bg-red-200"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
