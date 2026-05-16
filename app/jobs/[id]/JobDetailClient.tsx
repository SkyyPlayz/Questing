"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type Application = {
  id: string;
  workerId: string;
  status: string;
  message: string | null;
  worker: { id: string; name: string | null; email: string };
};

type Job = {
  id: string;
  title: string;
  description: string;
  category: string;
  location: string;
  payRate: number;
  payUnit: string;
  status: string;
  startDate: string | null;
  endDate: string | null;
  poster: { id: string; name: string | null };
  applications: Application[];
};

export default function JobDetailClient({
  job,
  userId,
  userRole,
  userApplication,
  isPoster,
}: {
  job: Job;
  userId?: string;
  userRole?: string;
  userApplication: Application | null;
  isPoster: boolean;
}) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState("");
  const [statusLoading, setStatusLoading] = useState(false);

  const statusColors: Record<string, string> = {
    DRAFT: "bg-gray-100 text-gray-700",
    OPEN: "bg-green-100 text-green-700",
    IN_PROGRESS: "bg-blue-100 text-blue-700",
    COMPLETED: "bg-purple-100 text-purple-700",
    CANCELLED: "bg-red-100 text-red-700",
    DISPUTED: "bg-yellow-100 text-yellow-700",
  };

  async function handleApply(e: React.FormEvent) {
    e.preventDefault();
    setApplying(true);
    setError("");
    const res = await fetch(`/api/jobs/${job.id}/apply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    });
    setApplying(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Failed to apply");
    } else {
      router.refresh();
    }
  }

  async function handleApplicationAction(applicationId: string, action: "accept" | "reject") {
    const res = await fetch(`/api/jobs/${job.id}/apply`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ applicationId, action }),
    });
    if (res.ok) router.refresh();
  }

  async function handleStatusChange(newStatus: string) {
    setStatusLoading(true);
    const res = await fetch(`/api/jobs/${job.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    setStatusLoading(false);
    if (res.ok) router.refresh();
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="bg-white border rounded-lg p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold">{job.title}</h1>
            <p className="text-gray-500 text-sm mt-1">
              {job.location} · {job.category} · by {job.poster.name}
            </p>
          </div>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[job.status]}`}>
            {job.status}
          </span>
        </div>

        <div className="flex gap-6 mb-6 text-sm text-gray-700">
          <span className="font-bold text-green-700 text-lg">
            ${job.payRate}/{job.payUnit}
          </span>
          {job.startDate && <span>Start: {new Date(job.startDate).toLocaleDateString()}</span>}
          {job.endDate && <span>End: {new Date(job.endDate).toLocaleDateString()}</span>}
        </div>

        <p className="text-gray-700 whitespace-pre-wrap mb-6">{job.description}</p>

        {/* Poster controls */}
        {isPoster && (
          <div className="border-t pt-4 mt-4">
            <div className="flex gap-2 mb-4 flex-wrap">
              {job.status === "DRAFT" && (
                <button
                  onClick={() => handleStatusChange("OPEN")}
                  disabled={statusLoading}
                  className="bg-green-600 text-white px-4 py-2 rounded text-sm hover:bg-green-700"
                >
                  Publish
                </button>
              )}
              {job.status === "IN_PROGRESS" && (
                <button
                  onClick={() => handleStatusChange("COMPLETED")}
                  disabled={statusLoading}
                  className="bg-purple-600 text-white px-4 py-2 rounded text-sm hover:bg-purple-700"
                >
                  Mark Completed
                </button>
              )}
              {["DRAFT", "OPEN", "IN_PROGRESS"].includes(job.status) && (
                <button
                  onClick={() => handleStatusChange("CANCELLED")}
                  disabled={statusLoading}
                  className="bg-red-600 text-white px-4 py-2 rounded text-sm hover:bg-red-700"
                >
                  Cancel Job
                </button>
              )}
            </div>

            {job.applications.length > 0 && (
              <div>
                <h2 className="font-semibold mb-3">Applicants ({job.applications.length})</h2>
                <div className="space-y-3">
                  {job.applications.map((app) => (
                    <div key={app.id} className="border rounded p-3 flex items-center justify-between">
                      <div>
                        <p className="font-medium">{app.worker.name}</p>
                        <p className="text-xs text-gray-500">{app.worker.email}</p>
                        {app.message && <p className="text-sm text-gray-700 mt-1">{app.message}</p>}
                        <span
                          className={`text-xs font-medium mt-1 inline-block px-2 py-0.5 rounded-full ${
                            app.status === "ACCEPTED"
                              ? "bg-green-100 text-green-700"
                              : app.status === "REJECTED"
                              ? "bg-red-100 text-red-700"
                              : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {app.status}
                        </span>
                      </div>
                      {app.status === "PENDING" && job.status === "OPEN" && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleApplicationAction(app.id, "accept")}
                            className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
                          >
                            Accept
                          </button>
                          <button
                            onClick={() => handleApplicationAction(app.id, "reject")}
                            className="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Worker apply section */}
        {userRole === "WORKER" && job.status === "OPEN" && !isPoster && (
          <div className="border-t pt-4 mt-4">
            {userApplication ? (
              <div className="text-center py-4">
                <p className="text-gray-600">
                  You applied — status:{" "}
                  <span className="font-semibold">{userApplication.status}</span>
                </p>
              </div>
            ) : userId ? (
              <form onSubmit={handleApply}>
                <h2 className="font-semibold mb-3">Apply for this job</h2>
                {error && <p className="text-red-600 text-sm mb-3">{error}</p>}
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Optional message to the poster..."
                  className="w-full border rounded px-3 py-2 text-sm mb-3 h-24 resize-none"
                />
                <button
                  type="submit"
                  disabled={applying}
                  className="bg-blue-600 text-white px-6 py-2 rounded font-medium hover:bg-blue-700 disabled:opacity-50"
                >
                  {applying ? "Applying..." : "Apply Now"}
                </button>
              </form>
            ) : (
              <p className="text-center text-gray-600">
                <a href="/login" className="text-blue-600 hover:underline">Sign in</a> to apply
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
