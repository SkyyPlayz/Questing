"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

const CATEGORIES = ["Landscaping", "Cleaning", "Moving", "Handyman", "Childcare", "Delivery", "Other"];

export default function NewJobPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "Landscaping",
    location: "",
    payRate: "",
    payUnit: "hour",
    startDate: "",
    endDate: "",
    fcfsMode: true,
    fcfsTimeoutMinutes: 30,
    locationLat: "",
    locationLng: "",
  });
  const [publish, setPublish] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, publish }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Failed to create job");
    } else {
      const job = await res.json();
      router.push(`/jobs/${job.id}`);
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Post a Job</h1>
      {error && <p className="text-red-600 mb-4 text-sm">{error}</p>}
      <form onSubmit={handleSubmit} className="space-y-4 bg-white border rounded-lg p-6">
        <div>
          <label className="block text-sm font-medium mb-1">Job Title *</label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => update("title", e.target.value)}
            className="w-full border rounded px-3 py-2 text-sm"
            placeholder="e.g. Lawn mowing needed"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Description *</label>
          <textarea
            value={form.description}
            onChange={(e) => update("description", e.target.value)}
            className="w-full border rounded px-3 py-2 text-sm h-28 resize-none"
            placeholder="Describe the job in detail..."
            required
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Category *</label>
            <select
              value={form.category}
              onChange={(e) => update("category", e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm"
            >
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Location *</label>
            <input
              type="text"
              value={form.location}
              onChange={(e) => update("location", e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm"
              placeholder="e.g. Afton, WY"
              required
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Pay Rate *</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.payRate}
              onChange={(e) => update("payRate", e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm"
              placeholder="0.00"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Per</label>
            <select
              value={form.payUnit}
              onChange={(e) => update("payUnit", e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm"
            >
              <option value="hour">Hour</option>
              <option value="day">Day</option>
              <option value="job">Fixed (whole job)</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Start Date</label>
            <input
              type="date"
              value={form.startDate}
              onChange={(e) => update("startDate", e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">End Date</label>
            <input
              type="date"
              value={form.endDate}
              onChange={(e) => update("endDate", e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm"
            />
          </div>
        </div>

        {/* FCFS settings */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="fcfsMode"
              checked={form.fcfsMode}
              onChange={(e) => update("fcfsMode", e.target.checked ? "true" : "false")}
              className="rounded"
            />
            <label htmlFor="fcfsMode" className="text-sm">
              First-come-first-served (auto-accept first worker)
            </label>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">FCFS Timeout (minutes)</label>
            <input
              type="number"
              min="1"
              value={form.fcfsTimeoutMinutes}
              onChange={(e) => update("fcfsTimeoutMinutes", e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm"
              placeholder="30"
            />
          </div>
        </div>

        {/* GPS coordinates */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Location Latitude</label>
            <input
              type="number"
              step="0.000001"
              value={form.locationLat}
              onChange={(e) => update("locationLat", e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm"
              placeholder="e.g. 42.8751"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Location Longitude</label>
            <input
              type="number"
              step="0.000001"
              value={form.locationLng}
              onChange={(e) => update("locationLng", e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm"
              placeholder="e.g. -108.9825"
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="publish"
            checked={publish}
            onChange={(e) => setPublish(e.target.checked)}
            className="rounded"
          />
          <label htmlFor="publish" className="text-sm">
            Publish immediately (otherwise saved as draft)
          </label>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Saving..." : publish ? "Publish Job" : "Save as Draft"}
        </button>
      </form>
    </div>
  );
}
