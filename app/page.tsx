import { auth } from "@/app/lib/auth";
import JobMap from "@/app/components/JobMap";
import LandingPage from "@/app/components/LandingPage";

export default async function Home() {
  const session = await auth();
  const user = session?.user as { id?: string; role?: string } | undefined;

  if (user && user.role === "WORKER") {
    return <JobMap />;
  }

  return <LandingPage />;
}
