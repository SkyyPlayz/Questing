import Link from "next/link";
import { auth, signOut } from "@/app/lib/auth";
import MobileNavToggle from "./MobileNavToggle";

export default async function Nav() {
  const session = await auth();
  const user = session?.user as { name?: string | null; role?: string } | undefined;

  const links = user ? (
    <>
      <Link href="/jobs" className="block py-2 text-gray-700 hover:text-blue-600">
        Jobs
      </Link>
      <Link href="/map" className="block py-2 text-gray-700 hover:text-blue-600">
        Map
      </Link>
      {user.role === "POSTER" && (
        <Link href="/jobs/new" className="block py-2 text-gray-700 hover:text-blue-600">
          Post Job
        </Link>
      )}
      {user.role === "WORKER" && (
        <>
          <Link href="/jobs/active" className="block py-2 text-gray-700 hover:text-blue-600">
            My Jobs
          </Link>
          <Link href="/profile" className="block py-2 text-gray-700 hover:text-blue-600">
            Profile
          </Link>
          <Link href="/settings/emergency" className="block py-2 text-gray-700 hover:text-blue-600">
            Emergency Contact
          </Link>
        </>
      )}
      {user.role === "ADMIN" && (
        <Link href="/admin" className="block py-2 text-gray-700 hover:text-blue-600">
          Admin
        </Link>
      )}
      <div className="border-t my-2" />
      <span className="block py-1 text-gray-500 text-sm">{user.name}</span>
      <form
        action={async () => {
          "use server";
          await signOut({ redirectTo: "/" });
        }}
      >
        <button type="submit" className="block py-2 text-red-500 hover:text-red-700 text-sm">
          Sign out
        </button>
      </form>
    </>
  ) : (
    <>
      <Link href="/jobs" className="block py-2 text-gray-700 hover:text-blue-600">
        Jobs
      </Link>
      <Link href="/map" className="block py-2 text-gray-700 hover:text-blue-600">
        Map
      </Link>
      <div className="border-t my-2" />
      <Link href="/login" className="block py-2 text-gray-700 hover:text-blue-600">
        Sign in
      </Link>
      <Link href="/register" className="block py-2 text-blue-600 font-medium hover:text-blue-700">
        Register
      </Link>
    </>
  );

  return (
    <nav className="bg-white border-b px-4 py-3">
      <div className="flex items-center justify-between">
        <Link href="/" className="font-bold text-lg text-blue-700">
          Job Quest
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-4 text-sm">
          <Link href="/jobs" className="text-gray-600 hover:text-blue-600">Jobs</Link>
          <Link href="/map" className="text-gray-600 hover:text-blue-600">🗺️ Map</Link>
          {user ? (
            <>
              {user.role === "POSTER" && (
                <Link href="/jobs/new" className="text-gray-600 hover:text-blue-600">Post Job</Link>
              )}
              {user.role === "WORKER" && (
                <>
                  <Link href="/jobs/active" className="text-gray-600 hover:text-blue-600">My Jobs</Link>
                  <Link href="/profile" className="text-gray-600 hover:text-blue-600">Profile</Link>
                </>
              )}
              {user.role === "ADMIN" && (
                <Link href="/admin" className="text-gray-600 hover:text-blue-600">Admin</Link>
              )}
              <span className="text-gray-400">|</span>
              <span className="text-gray-700">{user.name}</span>
              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/" });
                }}
              >
                <button type="submit" className="text-gray-500 hover:text-red-600">Sign out</button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login" className="text-gray-600 hover:text-blue-600">Sign in</Link>
              <Link href="/register" className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700">
                Register
              </Link>
            </>
          )}
        </div>

        {/* Mobile hamburger */}
        <div className="md:hidden">
          <MobileNavToggle>{links}</MobileNavToggle>
        </div>
      </div>
    </nav>
  );
}
