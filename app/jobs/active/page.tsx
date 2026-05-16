import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";

export default async function ActiveJobsPage() {
  const session = await auth();
  const user = session?.user as { id?: string; role?: string } | undefined;

  if (!user?.id) redirect("/login");
  if (user.role !== "WORKER") redirect("/jobs");

  const applications = await prisma.application.findMany({
    where: { workerId: user.id, status: "ACCEPTED" },
    include: {
      job: {
        include: { poster: { select: { id: true, name: true } } },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">My Active Jobs</h1>
      {applications.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <p>No active jobs yet.</p>
          <Link href="/jobs" className="text-blue-600 hover:underline mt-2 block">
            Browse open jobs
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {applications.map((app) => (
            <Link
              key={app.id}
              href={`/jobs/${app.job.id}`}
              className="block bg-white border rounded-lg p-4 hover:border-blue-400 hover:shadow-sm transition"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="font-semibold text-lg">{app.job.title}</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    {app.job.location} · {app.job.category} · by {app.job.poster.name}
                  </p>
                </div>
                <div className="ml-4 text-right shrink-0">
                  <span className="inline-block px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                    {app.job.status}
                  </span>
                  <p className="font-bold text-green-700 mt-1">
                    ${app.job.payRate}/{app.job.payUnit}
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
