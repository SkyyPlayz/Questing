"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

const JOB_CATEGORIES = [
  "Landscaping",
  "Construction",
  "Moving",
  "Cleaning",
  "Farming",
  "Snow Removal",
  "General Labor",
  "Delivery",
  "Maintenance",
  "Other",
];

const STEPS = ["Location", "Categories", "Safety", "Done"];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [location, setLocation] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [safetyAcknowledged, setSafetyAcknowledged] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function toggleCategory(cat: string) {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  }

  async function completeOnboarding() {
    setSaving(true);
    setError("");
    const res = await fetch("/api/onboarding", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ location, skills: selectedCategories }),
    });
    setSaving(false);
    if (!res.ok) {
      setError("Failed to save. Please try again.");
      return;
    }
    setStep(3);
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-start justify-center pt-12 px-4">
      <div className="w-full max-w-lg">
        {/* Progress bar */}
        <div className="flex gap-2 mb-8">
          {STEPS.map((label, i) => (
            <div key={label} className="flex-1">
              <div
                className={`h-1.5 rounded-full ${i <= step ? "bg-blue-600" : "bg-gray-200"}`}
              />
              <p className={`text-xs mt-1 text-center ${i === step ? "text-blue-700 font-medium" : "text-gray-400"}`}>
                {label}
              </p>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-xl border shadow-sm p-6">
          {step === 0 && (
            <>
              <h1 className="text-xl font-bold mb-1">Welcome to Job Quest!</h1>
              <p className="text-sm text-gray-500 mb-6">
                Let&apos;s get your profile set up so employers can find you in Lincoln County, Wyoming.
              </p>
              <label className="block text-sm font-medium mb-1">Your location (city / area)</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Kemmerer, WY"
                className="w-full border rounded px-3 py-2 text-sm mb-6"
              />
              <button
                onClick={() => setStep(1)}
                disabled={!location.trim()}
                className="w-full bg-blue-600 text-white py-2 rounded font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                Next
              </button>
            </>
          )}

          {step === 1 && (
            <>
              <h1 className="text-xl font-bold mb-1">Job Categories</h1>
              <p className="text-sm text-gray-500 mb-4">Select the types of work you&apos;re interested in.</p>
              <div className="grid grid-cols-2 gap-2 mb-6">
                {JOB_CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => toggleCategory(cat)}
                    className={`text-sm px-3 py-2 rounded-lg border text-left transition ${
                      selectedCategories.includes(cat)
                        ? "bg-blue-600 text-white border-blue-600"
                        : "border-gray-200 hover:border-blue-300"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
              <div className="flex gap-3">
                <button onClick={() => setStep(0)} className="flex-1 border rounded py-2 text-sm">
                  Back
                </button>
                <button
                  onClick={() => setStep(2)}
                  disabled={selectedCategories.length === 0}
                  className="flex-1 bg-blue-600 text-white py-2 rounded font-medium hover:bg-blue-700 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <h1 className="text-xl font-bold mb-1">Safety Guidelines</h1>
              <p className="text-sm text-gray-500 mb-4">
                Job Quest prioritizes your safety. Please acknowledge the following:
              </p>
              <ul className="space-y-2 text-sm text-gray-700 mb-6 list-none">
                {[
                  "Never start a job without reviewing the job details and meeting the poster in a safe location.",
                  "Set an emergency contact in Settings so help can be reached quickly.",
                  "Use the SOS button on any active job if you are in danger — it alerts admin immediately.",
                  "Report unsafe conditions or incidents immediately through the app.",
                  "Background check verification is required before accepting paid jobs.",
                ].map((item, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-blue-600 font-bold shrink-0">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
              <label className="flex items-start gap-3 cursor-pointer mb-6">
                <input
                  type="checkbox"
                  checked={safetyAcknowledged}
                  onChange={(e) => setSafetyAcknowledged(e.target.checked)}
                  className="mt-0.5"
                />
                <span className="text-sm">
                  I have read and acknowledge the safety guidelines.
                </span>
              </label>
              {error && <p className="text-red-600 text-sm mb-3">{error}</p>}
              <div className="flex gap-3">
                <button onClick={() => setStep(1)} className="flex-1 border rounded py-2 text-sm">
                  Back
                </button>
                <button
                  onClick={completeOnboarding}
                  disabled={!safetyAcknowledged || saving}
                  className="flex-1 bg-blue-600 text-white py-2 rounded font-medium hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Complete Setup"}
                </button>
              </div>
            </>
          )}

          {step === 3 && (
            <div className="text-center py-4">
              <div className="text-5xl mb-4">🎉</div>
              <h1 className="text-xl font-bold mb-2">You&apos;re all set!</h1>
              <p className="text-sm text-gray-500 mb-6">
                Your profile is ready. Complete a background check to unlock paid jobs.
              </p>
              <div className="flex flex-col gap-3">
                <a
                  href="/profile"
                  className="w-full bg-blue-600 text-white py-2 rounded font-medium hover:bg-blue-700 text-center"
                >
                  Pay for Background Check
                </a>
                <button
                  onClick={() => router.push("/jobs")}
                  className="w-full border rounded py-2 text-sm hover:bg-gray-50"
                >
                  Browse Jobs First
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
