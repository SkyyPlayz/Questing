import Link from "next/link";
import { auth, signOut } from "@/app/lib/auth";

export default async function Nav() {
  const session = await auth();
  const user = session?.user as { name?: string | null; role?: string } | undefined;

  return (
    <nav className="bg-white border-b px-4 py-3 flex items-center justify-between">
      <Link href="/" className="font-bold text-lg text-blue-700">
        Job Quest
      </Link>
      <div className="flex items-center gap-4 text-sm">
        <Link href="/jobs" className="text-gray-600 hover:text-blue-600">
          Jobs
        </Link>
        {user ? (
          <>
            {user.role === "POSTER" && (
              <Link href="/jobs/new" className="text-gray-600 hover:text-blue-600">
                Post Job
              </Link>
            )}
            {user.role === "WORKER" && (
              <>
                <Link href="/jobs/active" className="text-gray-600 hover:text-blue-600">
                  My Jobs
                </Link>
                <Link href="/profile" className="text-gray-600 hover:text-blue-600">
                  Profile
                </Link>
              </>
            )}
            {user.role === "ADMIN" && (
              <Link href="/admin" className="text-gray-600 hover:text-blue-600">
                Admin
              </Link>
            )}
            <span className="text-gray-400">|</span>
            <span className="text-gray-700">{user.name}</span>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/" });
              }}
            >
              <button type="submit" className="text-gray-500 hover:text-red-600">
                Sign out
              </button>
            </form>
          </>
        ) : (
          <>
            <Link href="/login" className="text-gray-600 hover:text-blue-600">
              Sign in
            </Link>
            <Link
              href="/register"
              className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
            >
              Register
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}
