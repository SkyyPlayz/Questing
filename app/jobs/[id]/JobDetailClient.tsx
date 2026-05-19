"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import JobChat from "@/app/components/JobChat";
import ToolRecommendations from "@/app/components/ToolRecommendations";

type Application = {
  id: string;
  workerId: string;
  status: string;
  message: string | null;
  acceptedAt: string | null;
  worker: { id: string; name: string | null; email: string };
};

type JobCheckIn = {
  id: string;
  latitude: number;
  longitude: number;
  distanceM: number;
  verified: boolean;
  timestamp: string;
  worker: { id: string; name: string | null };
};

type Job = {
  id: string;
  title: string;
  description: string;
  category: string;
  location: string;
  locationLat: number | null;
  locationLng: number | null;
  payRate: number;
  payUnit: string;
  status: string;
  fcfsMode: boolean;
  fcfsTimeoutMinutes: number | null;
  startDate: string | null;
  endDate: string | null;
  poster: { id: string; name: string | null };
  applications: Application[];
  jobCheckIns: JobCheckIn[];
  payment: { id: string; amount: number; status: string; stripePaymentIntentId: string | null } | null;
  platformFees: { id: string; amount: number; percent: number; status: string; type: string }[];
};

export default function JobDetailClient({
  job,
  userId,
  userRole,
  userApplication,
  isPoster,
  payment,
  platformFees,
}: {
  job: Job;
  userId?: string;
  userRole?: string;
  userApplication: Application | null;
  isPoster: boolean;
  payment: { id: string; amount: number; status: string; stripePaymentIntentId: string | null } | null;
  platformFees: { id: string; amount: number; percent: number; status: string; type: string }[];
}) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState("");
  const [statusLoading, setStatusLoading] = useState(false);
  const [checkInLoading, setCheckInLoading] = useState(false);
  const [checkInResult, setCheckInResult] = useState<{
    distanceM: number;
    verified: boolean;
    message: string;
  } | null>(null);
  const [checkInError, setCheckInError] = useState("");
  const [threadCreating, setThreadCreating] = useState(false);
  const [threadError, setThreadError] = useState("");
  const [threadSuccess, setThreadSuccess] = useState("");
  const [sosLoading, setSosLoading] = useState(false);
  const [sosResult, setSosResult] = useState<{ incidentId: string; emergencyContact: string | null; adminContact: string } | null>(null);
  const [sosError, setSosError] = useState("");

  const statusColors: Record<string, string> = {
    DRAFT: "bg-gray-100 text-gray-700",
    OPEN: "bg-green-100 text-green-700",
    IN_PROGRESS: "bg-blue-100 text-blue-700",
    COMPLETED: "bg-purple-100 text-purple-700",
    CANCELLED: "bg-red-100 text-red-700",
    DISPUTED: "bg-yellow-100 text-yellow-700",
    FCFS_ACCEPTED: "bg-emerald-100 text-emerald-700",
  };

  const appStatusColors: Record<string, string> = {
    PENDING: "bg-gray-100 text-gray-700",
    ACCEPTED: "bg-green-100 text-green-700",
    REJECTED: "bg-red-100 text-red-700",
    WITHDRAWN: "bg-orange-100 text-orange-700",
    FCFS_ACCEPTED: "bg-emerald-100 text-emerald-700",
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

  async function handleThreadCreate(threadType: "PUBLIC_QA" | "PRIVATE", workerId?: string) {
    setThreadCreating(true);
    setThreadError("");
    setThreadSuccess("");
    const res = await fetch(`/api/jobs/${job.id}/chat/threads`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ threadType, workerId }),
    });
    setThreadCreating(false);
    if (!res.ok) {
      const data = await res.json();
      setThreadError(data.error || "Failed to create thread");
    } else {
      setThreadSuccess(`Chat thread created (${threadType})`);
      router.refresh();
    }
  }

  async function handleCheckIn() {
    setCheckInLoading(true);
    setCheckInError("");
    setCheckInResult(null);

    // Try to get geolocation from browser
    let lat: number, lng: number;
    if (navigator.geolocation) {
      lat = await new Promise<number>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve(pos.coords.latitude),
          (err) => reject(err),
          { enableHighAccuracy: true, timeout: 10000 }
        );
      });
      lng = await new Promise<number>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve(pos.coords.longitude),
          (err) => reject(err),
          { enableHighAccuracy: true, timeout: 10000 }
        );
      });
    } else {
      setCheckInError("Geolocation not available in this browser");
      setCheckInLoading(false);
      return;
    }

    const res = await fetch(`/api/jobs/${job.id}/checkin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ latitude: lat, longitude: lng }),
    });
    setCheckInLoading(false);

    if (!res.ok) {
      const data = await res.json();
      setCheckInError(data.error || "Check-in failed");
    } else {
      const data = await res.json();
      setCheckInResult({
        distanceM: data.distanceM,
        verified: data.verified,
        message: data.message,
      });
      router.refresh();
    }
  }

  async function handleSOS() {
    setSosLoading(true);
    setSosError("");
    setSosResult(null);
    const res = await fetch(`/api/jobs/${job.id}/sos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    setSosLoading(false);
    if (!res.ok) {
      const data = await res.json();
      setSosError(data.error || "SOS failed");
    } else {
      const data = await res.json();
      setSosResult({
        incidentId: data.incidentId,
        emergencyContact: data.emergencyContact,
        adminContact: data.adminContact,
      });
    }
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
          {job.fcfsMode && (
            <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full text-xs font-medium">
              FCFS Mode
              {job.fcfsTimeoutMinutes && ` (timeout: ${job.fcfsTimeoutMinutes}min)`}
            </span>
          )}
          {!job.fcfsMode && (
            <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs font-medium">
              Poster Review Mode
            </span>
          )}
        </div>

        <p className="text-gray-700 whitespace-pre-wrap mb-6">{job.description}</p>

        {/* Tool Recommendations */}
        <ToolRecommendations jobId={job.id} category={job.category} />

        {/* Payment & Fee breakdown */}
        {job.payment && (
          <div className="border-t pt-4 mt-4">
            <h2 className="font-semibold mb-3">💰 Payment & Fees</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Job Payment:</span>
                <span className="font-medium">${(job.payment.amount / 100).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Status:</span>
                <span className={`font-medium ${
                  job.payment.status === "HELD" ? "text-yellow-600" :
                  job.payment.status === "RELEASED" ? "text-green-600" :
                  job.payment.status === "VOIDED" ? "text-gray-400" :
                  "text-gray-600"
                }`}>{job.payment.status}</span>
              </div>
              {job.platformFees.length > 0 && (
                <>
                  <div className="border-t pt-2 mt-2">
                    {job.platformFees.map((fee) => (
                      <div key={fee.id} className="flex justify-between text-sm">
                        <span className="text-gray-500">Platform Fee ({(fee.percent * 100).toFixed(0)}%):</span>
                        <span className="font-medium">${(fee.amount / 100).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between font-bold text-gray-800 border-t pt-2 mt-2">
                    <span>Net to Worker:</span>
                    <span className="text-green-700">
                      ${((job.payment.amount - job.platformFees.reduce((s, f) => s + f.amount, 0)) / 100).toFixed(2)}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

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
                            appStatusColors[app.status] || "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {app.status}
                          {app.status === "FCFS_ACCEPTED" && " (FCFS)"}
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

            {/* Chat thread management */}
            <div className="border-t pt-4 mt-4">
              <h2 className="font-semibold mb-3">💬 Chat Threads</h2>
              {threadSuccess && <p className="text-green-600 text-sm mb-2">{threadSuccess}</p>}
              {threadError && <p className="text-red-600 text-sm mb-2">{threadError}</p>}
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => handleThreadCreate("PUBLIC_QA")}
                  disabled={threadCreating}
                  className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                >
                  {threadCreating ? "Creating..." : "Create Public Q&A"}
                </button>
                {job.applications.filter(a => a.status === "ACCEPTED" || a.status === "FCFS_ACCEPTED").length > 0 && (
                  job.applications
                    .filter(a => a.status === "ACCEPTED" || a.status === "FCFS_ACCEPTED")
                    .map(app => (
                      <button
                        key={app.id}
                        onClick={() => handleThreadCreate("PRIVATE", app.workerId)}
                        disabled={threadCreating}
                        className="bg-indigo-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
                      >
                        {threadCreating ? "Creating..." : `Private Chat with ${app.worker.name}`}
                      </button>
                    ))
                )}
              </div>
            </div>
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

        {/* GPS Check-in section — for accepted workers on IN_PROGRESS jobs */}
        {userRole === "WORKER" && job.status === "IN_PROGRESS" && !isPoster && userApplication &&
          (userApplication.status === "FCFS_ACCEPTED" || userApplication.status === "ACCEPTED") && (
          <div className="border-t pt-4 mt-4">
            <h2 className="font-semibold mb-3">📍 GPS Check-In</h2>
            <p className="text-sm text-gray-600 mb-3">
              Confirm your location at the job site. Verified if within 500m of the job location.
            </p>
            {checkInResult && (
              <div className={`rounded p-3 mb-3 text-sm ${
                checkInResult.verified
                  ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
                  : "bg-amber-50 border border-amber-200 text-amber-800"
              }`}>
                <p className="font-semibold">
                  {checkInResult.verified ? "✅ Verified" : "⚠️ Flagged"}
                </p>
                <p>Distance: {checkInResult.distanceM}m from job location</p>
                <p>{checkInResult.message}</p>
              </div>
            )}
            {checkInError && <p className="text-red-600 text-sm mb-3">{checkInError}</p>}
            <button
              onClick={handleCheckIn}
              disabled={checkInLoading}
              className="bg-indigo-600 text-white px-5 py-2 rounded font-medium hover:bg-indigo-700 disabled:opacity-50 text-sm"
            >
              {checkInLoading ? "Checking location..." : "Check In Now"}
            </button>
          </div>
        )}

        {/* SOS Emergency button — for accepted workers on IN_PROGRESS jobs */}
        {userRole === "WORKER" && job.status === "IN_PROGRESS" && !isPoster && userApplication &&
          (userApplication.status === "FCFS_ACCEPTED" || userApplication.status === "ACCEPTED") && (
          <div className="border-t pt-4 mt-4">
            <h2 className="font-semibold mb-3 text-red-700">🚨 Emergency SOS</h2>
            <p className="text-sm text-gray-600 mb-3">
              If you're in danger, press SOS to log a high-severity incident and notify your emergency contact and admin.
            </p>
            {sosResult && (
              <div className="bg-red-50 border border-red-200 rounded p-3 mb-3 text-sm text-red-800">
                <p className="font-semibold">🚨 Emergency Incident Logged</p>
                <p>Incident ID: {sosResult.incidentId}</p>
                {sosResult.emergencyContact && <p>Emergency contact notified: {sosResult.emergencyContact}</p>}
                <p>Admin contact: {sosResult.adminContact}</p>
                <p className="mt-2 text-red-600 font-medium">Job flagged for admin review.</p>
              </div>
            )}
            {sosError && <p className="text-red-600 text-sm mb-3">{sosError}</p>}
            <button
              onClick={handleSOS}
              disabled={sosLoading}
              className="bg-red-700 text-white px-6 py-2 rounded font-bold hover:bg-red-800 disabled:opacity-50 text-sm uppercase tracking-wide"
            >
              {sosLoading ? "Triggering SOS..." : "🚨 SOS Emergency"}
            </button>
          </div>
        )}

        {/* Check-in history — for poster and accepted workers */}
        {job.jobCheckIns.length > 0 && (
          <div className="border-t pt-4 mt-4">
            <h2 className="font-semibold mb-3">Check-In History ({job.jobCheckIns.length})</h2>
            <div className="space-y-2">
              {job.jobCheckIns.map((ci) => (
                <div key={ci.id} className="border rounded p-2 flex items-center justify-between text-sm">
                  <div>
                    <p className="font-medium">{ci.worker.name}</p>
                    <p className="text-xs text-gray-500">
                      {ci.latitude.toFixed(4)}, {ci.longitude.toFixed(4)} · {new Date(ci.timestamp).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-600">{ci.distanceM}m</span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      ci.verified
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-amber-100 text-amber-700"
                    }`}>
                      {ci.verified ? "Verified" : "Flagged"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Job Chat */}
        <JobChat jobId={job.id} userId={userId} isPoster={isPoster} />
      </div>
    </div>
  );
}
