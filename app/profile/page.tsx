import { auth } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";
import Link from "next/link";

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-600">Sign in to view your profile.</p>
      </div>
    );
  }
  const user = session.user as { id: string; name?: string | null; role?: string; email?: string };

  if (user.role !== "WORKER") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">This page is for workers only.</p>
      </div>
    );
  }

  const [workerProfile, bgCheckFee, competencyScore, riskScore] = await Promise.all([
    prisma.workerProfile.findUnique({ where: { userId: user.id } }),
    prisma.backgroundCheckFee.findFirst({ where: { workerId: user.id } }),
    prisma.competencyScore.findUnique({ where: { userId: user.id } }),
    prisma.riskScore.findUnique({ where: { userId: user.id } }),
  ]);

  const bgCheckStatus = bgCheckFee?.status ?? "NOT_STARTED";
  const bgCheckFeeCents = (await prisma.adminConfig.findUnique({
    where: { key: "BACKGROUND_CHECK_FEE_CENTS" },
  }))?.value ?? "2500";
  const bgCheckFeeDollar = (parseInt(bgCheckFeeCents, 10) / 100).toFixed(2);

  const statusColors: Record<string, string> = {
    NOT_STARTED: "text-gray-400",
    PENDING: "text-yellow-600",
    PAID: "text-green-600",
    VOIDED: "text-gray-400",
    REFUNDED: "text-red-600",
  };

  const statusLabels: Record<string, string> = {
    NOT_STARTED: "Not started",
    PENDING: "Payment pending",
    PAID: "Paid — verified",
    VOIDED: "Cancelled",
    REFUNDED: "Refunded",
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-blue-700">Your Profile</h1>
          <Link href="/" className="text-gray-500 hover:text-blue-600 text-sm">
            Back to site
          </Link>
        </div>

        {/* Worker Info */}
        <div className="bg-white rounded-lg border p-6 mb-6">
          <h2 className="text-lg font-bold mb-3 text-gray-800">Account Info</h2>
          <div className="space-y-2 text-sm">
            <p><span className="text-gray-500">Name:</span> {user.name || "—"}</p>
            <p><span className="text-gray-500">Email:</span> {user.email}</p>
            <p><span className="text-gray-500">Role:</span> Worker</p>
          </div>
        </div>

        {/* Worker Profile */}
        {workerProfile && (
          <div className="bg-white rounded-lg border p-6 mb-6">
            <h2 className="text-lg font-bold mb-3 text-gray-800">Worker Profile</h2>
            <div className="space-y-2 text-sm">
              <p><span className="text-gray-500">Skills:</span> {workerProfile.skills.length > 0 ? workerProfile.skills.join(", ") : "—"}</p>
              <p><span className="text-gray-500">Availability:</span> {workerProfile.availability || "—"}</p>
              <p><span className="text-gray-500">Hourly Rate:</span> {workerProfile.hourlyRate ? `$${workerProfile.hourlyRate.toFixed(2)}` : "—"}</p>
              <p><span className="text-gray-500">ID Verified:</span> {workerProfile.idVerified ? "Yes" : "No"}</p>
            </div>
          </div>
        )}

        {/* Background Check */}
        <div className="bg-white rounded-lg border p-6 mb-6">
          <h2 className="text-lg font-bold mb-3 text-gray-800">Background Check</h2>
          <div className="flex items-center gap-3 mb-3">
            <span className={`text-lg font-bold ${statusColors[bgCheckStatus]}`}>
              {statusLabels[bgCheckStatus]}
            </span>
          </div>
          <p className="text-sm text-gray-500 mb-4">
            Background check fee: ${bgCheckFeeDollar} (one-time charge)
          </p>

          {bgCheckStatus === "NOT_STARTED" && (
            <form action={async () => {
              "use server";
              const response = await fetch(`${process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/api/profile/background-check`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({}),
              });
              const data = await response.json();
              if (data.url) {
                return new Response(null, {
                  status: 303,
                  headers: { Location: data.url },
                });
              }
            }}>
              <button
                type="submit"
                className="bg-blue-600 text-white px-6 py-2 rounded font-medium hover:bg-blue-700 text-sm"
              >
                Pay Background Check Fee — ${bgCheckFeeDollar}
              </button>
            </form>
          )}

          {bgCheckStatus === "PENDING" && (
            <p className="text-sm text-yellow-600">
              Payment initiated — awaiting Stripe confirmation.
            </p>
          )}
        </div>

        {/* Competency & Risk */}
        <div className="grid grid-cols-2 gap-4">
          {competencyScore && (
            <div className="bg-white rounded-lg border p-4">
              <h3 className="text-sm font-bold text-gray-700 mb-2">Competency Score</h3>
              <p className="text-2xl font-bold text-blue-700">{competencyScore.overallScore.toFixed(2)}</p>
              <p className="text-xs text-gray-500">
                {competencyScore.jobsCompleted} jobs completed · {competencyScore.reliabilityPct.toFixed(0)}% reliable
              </p>
            </div>
          )}
          {riskScore && (
            <div className="bg-white rounded-lg border p-4">
              <h3 className="text-sm font-bold text-gray-700 mb-2">Risk Level</h3>
              <p className={`text-2xl font-bold ${
                riskScore.riskLevel === "LOW" ? "text-green-600" :
                riskScore.riskLevel === "MEDIUM" ? "text-yellow-600" :
                "text-red-600"
              }`}>{riskScore.riskLevel}</p>
              <p className="text-xs text-gray-500">{riskScore.incidentCount} incidents</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
