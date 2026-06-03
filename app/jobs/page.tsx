import Link from "next/link";
import { prisma } from "@/app/lib/prisma";
import { auth } from "@/app/lib/auth";
import { getMissingServerEnv, isServerSetupError, type MissingServerEnv } from "@/app/lib/env";

const CATEGORIES = ["All", "Landscaping", "Cleaning", "Moving", "Handyman", "Childcare", "Delivery", "Other"];

type SearchParams = { category?: string; status?: string };

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const missingEnv = getMissingServerEnv();
  if (missingEnv.length > 0) {
    return <JobsSetupDiagnostics missingEnv={missingEnv} />;
  }

  const sp = await searchParams;
  const category = sp.category;
  const status = sp.status || "OPEN";

  const where: Record<string, unknown> = { status };
  if (category && category !== "All") where.category = category;

  let session;
  let jobs;

  try {
    session = await auth();
    jobs = await prisma.job.findMany({
      where,
      include: { poster: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
    });
  } catch (error) {
    if (isLocalSetupFailure(error)) {
      return <JobsSetupDiagnostics missingEnv={getMissingServerEnv()} error={error} />;
    }

    throw error;
  }

  const user = session?.user as { id?: string; role?: string } | undefined;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Job Board</h1>
        {user?.role === "POSTER" && (
          <Link
            href="/jobs/new"
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm"
          >
            Post a Job
          </Link>
        )}
        {user?.role === "WORKER" && (
          <Link
            href="/jobs/active"
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 text-sm"
          >
            My Active Jobs
          </Link>
        )}
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        {CATEGORIES.map((cat) => (
          <Link
            key={cat}
            href={`/jobs?category=${cat}`}
            className={`px-3 py-1 rounded-full text-sm border ${
              (category || "All") === cat
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white text-gray-700 border-gray-300 hover:border-blue-400"
            }`}
          >
            {cat}
          </Link>
        ))}
      </div>

      {jobs.length === 0 ? (
        <p className="text-gray-500 text-center py-16">No open jobs found.</p>
      ) : (
        <div className="space-y-4">
          {jobs.map((job) => (
            <Link
              key={job.id}
              href={`/jobs/${job.id}`}
              className="block bg-white border rounded-lg p-4 hover:border-blue-400 hover:shadow-sm transition"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="font-semibold text-lg">{job.title}</h2>
                  <p className="text-gray-500 text-sm mt-1">
                    {job.location} · {job.category}
                  </p>
                  <p className="text-gray-700 text-sm mt-2 line-clamp-2">{job.description}</p>
                </div>
                <div className="ml-4 text-right shrink-0">
                  <p className="font-bold text-green-700">
                    ${job.payRate}/{job.payUnit}
                  </p>
                  <p className="text-xs text-yellow-600 font-semibold mt-1">
                    ⚔️ +100 XP
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    by {job.poster.name}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function isLocalSetupFailure(error: unknown) {
  if (process.env.NODE_ENV === "production") return false;
  if (isServerSetupError(error)) return true;

  const message = error instanceof Error ? `${error.name} ${error.message}` : String(error);
  return /MissingSecret|DATABASE_URL|Prisma|database|connection|connect|P1001|P1012/i.test(message);
}

function JobsSetupDiagnostics({
  missingEnv,
  error,
}: {
  missingEnv: MissingServerEnv[];
  error?: unknown;
}) {
  const message = error instanceof Error ? error.message : undefined;

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold text-gray-950">Local setup required</h1>
      <p className="mt-3 text-gray-700">
        The job board needs server environment variables and database bootstrap before it can render.
      </p>

      {missingEnv.length > 0 && (
        <div className="mt-6 rounded border border-yellow-300 bg-yellow-50 p-4">
          <h2 className="font-semibold text-yellow-950">Missing environment variables</h2>
          <ul className="mt-3 space-y-3 text-sm text-yellow-950">
            {missingEnv.map((envVar) => (
              <li key={envVar.name}>
                <code className="font-mono font-semibold">{envVar.name}</code>
                <p className="mt-1 text-yellow-900">{envVar.reason}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {missingEnv.length === 0 && message && (
        <div className="mt-6 rounded border border-yellow-300 bg-yellow-50 p-4 text-sm text-yellow-950">
          <h2 className="font-semibold">Server bootstrap failed</h2>
          <p className="mt-2">{message}</p>
        </div>
      )}

      <div className="mt-6 rounded border border-gray-200 bg-white p-4 text-sm text-gray-800">
        <h2 className="font-semibold text-gray-950">Minimum local bootstrap</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5">
          <li>
            Copy <code className="font-mono">.env.example</code> to{" "}
            <code className="font-mono">.env.local</code>.
          </li>
          <li>Set a local PostgreSQL connection string in DATABASE_URL.</li>
          <li>
            Set NEXTAUTH_SECRET to a stable development secret, for example with{" "}
            <code className="font-mono">openssl rand -base64 32</code>.
          </li>
          <li>
            Run <code className="font-mono">npx prisma migrate dev</code>, then restart{" "}
            <code className="font-mono">npm run dev</code>.
          </li>
        </ol>
      </div>
    </div>
  );
}
