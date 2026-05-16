import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center px-4">
      <h1 className="text-4xl font-bold text-blue-700 mb-4">Job Quest</h1>
      <p className="text-xl text-gray-600 mb-2">Local Gig Marketplace — Lincoln County, Wyoming</p>
      <p className="text-gray-500 mb-8">
        Find work. Hire workers. Get things done locally.
      </p>
      <div className="flex gap-4">
        <Link
          href="/jobs"
          className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700"
        >
          Browse Jobs
        </Link>
        <Link
          href="/register"
          className="border border-blue-600 text-blue-600 px-6 py-3 rounded-lg font-medium hover:bg-blue-50"
        >
          Get Started
        </Link>
      </div>
    </div>
  );
}
