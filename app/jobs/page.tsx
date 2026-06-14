import Link from "next/link";
import { prisma } from "@/app/lib/prisma";
import { auth } from "@/app/lib/auth";
import { buildPublicJobsQuery } from "@/app/lib/publicJobsQuery";

const CATEGORIES = ["All", "Landscaping", "Cleaning", "Moving", "Handyman", "Childcare", "Delivery", "Other"];

type SearchParams = { category?: string; status?: string };

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await auth();
  const user = session?.user as { id?: string; role?: string } | undefined;
  const sp = await searchParams;
  const category = sp.category;
  const jobs = await prisma.job.findMany(buildPublicJobsQuery({ category, status: sp.status }));

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
