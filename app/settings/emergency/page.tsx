"use client";
import { useState, useEffect } from "react";

export default function EmergencyContactSettings() {
  const [contact, setContact] = useState("");
  const [phone, setPhone] = useState("");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/emergency/contact")
      .then((r) => r.json())
      .then((data) => {
        setContact(data.emergencyContact || "");
        setPhone(data.emergencyContactPhone || "");
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load emergency contact");
        setLoading(false);
      });
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaved(false);
    setError("");

    const res = await fetch("/api/emergency/contact", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emergencyContact: contact, emergencyContactPhone: phone }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Failed to save");
    } else {
      setSaved(true);
    }
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-8">
      <div className="bg-white border rounded-lg p-6">
        <h1 className="text-xl font-bold mb-1">Emergency Contact</h1>
        <p className="text-sm text-gray-500 mb-6">
          Set a contact who will be notified if you trigger an SOS emergency during a job.
        </p>

        {saved && <p className="text-green-600 text-sm mb-3">✅ Saved successfully</p>}
        {error && <p className="text-red-600 text-sm mb-3">{error}</p>}

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Contact Name</label>
            <input
              type="text"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder="e.g. Jane Doe"
              className="w-full border rounded px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Phone Number</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. +1 555 123 4567"
              className="w-full border rounded px-3 py-2 text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 text-white px-5 py-2 rounded font-medium hover:bg-blue-700 disabled:opacity-50 text-sm"
          >
            {loading ? "Loading..." : "Save Emergency Contact"}
          </button>
        </form>
      </div>
    </div>
  );
}
