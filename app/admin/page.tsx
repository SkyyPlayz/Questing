import { auth } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";
import Link from "next/link";

async function getAdminStats() {
  const [openJobs, pendingVerifications, openIncidents, openDisputes] = await Promise.all([
    prisma.job.count({ where: { status: "OPEN" } }),
    prisma.user.count({ where: { status: "PENDING_VERIFICATION" } }),
    prisma.safetyIncident.count({ where: { status: "OPEN" } }),
    prisma.dispute.count({ where: { status: "OPEN" } }),
  ]);
  return { openJobs, pendingVerifications, openIncidents, openDisputes };
}

async function getFeeConfig() {
  const configs = await prisma.adminConfig.findMany();
  return configs.reduce((acc, c) => {
    acc[c.key] = c.value;
    return acc;
  }, {} as Record<string, string>);
}

export default async function AdminPage() {
  const session = await auth();
  if (!session?.user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-600">Unauthorized — admin access required.</p>
      </div>
    );
  }
  const user = session.user as { name?: string | null; role?: string };
  if (user.role !== "ADMIN") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-600">Unauthorized — admin access required.</p>
      </div>
    );
  }

  const stats = await getAdminStats();
  const fees = await getFeeConfig();

  const platformFeePct = fees["PLATFORM_FEE_PERCENT"]
    ? `${(parseFloat(fees["PLATFORM_FEE_PERCENT"]) * 100).toFixed(1)}%`
    : "10.0%";
  const bgCheckFee = fees["BACKGROUND_CHECK_FEE_CENTS"]
    ? `$${(parseInt(fees["BACKGROUND_CHECK_FEE_CENTS"], 10) / 100).toFixed(2)}`
    : "$25.00";

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-blue-700">Admin Dashboard</h1>
          <Link href="/" className="text-gray-500 hover:text-blue-600 text-sm">
            Back to site
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg p-4 border">
            <p className="text-sm text-gray-500">Open Jobs</p>
            <p className="text-2xl font-bold">{stats.openJobs}</p>
          </div>
          <div className="bg-white rounded-lg p-4 border">
            <p className="text-sm text-gray-500">Pending Verification</p>
            <p className="text-2xl font-bold">{stats.pendingVerifications}</p>
          </div>
          <div className="bg-white rounded-lg p-4 border">
            <p className="text-sm text-gray-500">Open Incidents</p>
            <p className="text-2xl font-bold">{stats.openIncidents}</p>
          </div>
          <div className="bg-white rounded-lg p-4 border">
            <p className="text-sm text-gray-500">Open Disputes</p>
            <p className="text-2xl font-bold">{stats.openDisputes}</p>
          </div>
        </div>

        {/* Fee Configuration */}
        <div className="bg-white rounded-lg border p-6 mb-8">
          <h2 className="text-xl font-bold mb-4 text-gray-800">Fee Configuration</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Platform Fee */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Platform Service Fee (%)
              </label>
              <p className="text-2xl font-bold text-blue-700 mb-2">{platformFeePct}</p>
              <p className="text-xs text-gray-500 mb-3">
                Percentage taken from each completed job payment. Value between 0 and 1.
              </p>
              <form action={async (formData: FormData) => {
                "use server";
                const response = await fetch(`${process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/api/admin/config`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ key: "PLATFORM_FEE_PERCENT", value: formData.get("value") }),
                });
                if (response.ok) {
                  // Trigger re-render by returning empty
                }
              }}>
                <div className="flex gap-2">
                  <input
                    name="value"
                    type="number"
                    step="0.01"
                    min="0"
                    max="1"
                    defaultValue={fees["PLATFORM_FEE_PERCENT"] ?? "0.10"}
                    className="border rounded px-3 py-2 w-32 text-sm"
                    placeholder="0.10"
                  />
                  <button
                    type="submit"
                    className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700"
                  >
                    Update
                  </button>
                </div>
              </form>
            </div>

            {/* Background Check Fee */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Background Check Fee ($)
              </label>
              <p className="text-2xl font-bold text-blue-700 mb-2">{bgCheckFee}</p>
              <p className="text-xs text-gray-500 mb-3">
                One-time fee charged to workers for background verification. Value in cents.
              </p>
              <form action={async (formData: FormData) => {
                "use server";
                const response = await fetch(`${process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/api/admin/config`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ key: "BACKGROUND_CHECK_FEE_CENTS", value: formData.get("value") }),
                });
                if (response.ok) {
                  // Trigger re-render by returning empty
                }
              }}>
                <div className="flex gap-2">
                  <input
                    name="value"
                    type="number"
                    step="100"
                    min="0"
                    defaultValue={fees["BACKGROUND_CHECK_FEE_CENTS"] ?? "2500"}
                    className="border rounded px-3 py-2 w-32 text-sm"
                    placeholder="2500"
                  />
                  <button
                    type="submit"
                    className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700"
                  >
                    Update
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* Quick Links */}
        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-xl font-bold mb-4 text-gray-800">Quick Links</h2>
          <div className="flex flex-wrap gap-3">
            <Link href="/api/admin/users" className="text-blue-600 hover:text-blue-800 text-sm">
              Manage Users
            </Link>
            <Link href="/api/admin/disputes" className="text-blue-600 hover:text-blue-800 text-sm">
              Manage Disputes
            </Link>
            <Link href="/api/admin/incidents" className="text-blue-600 hover:text-blue-800 text-sm">
              Manage Incidents
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
