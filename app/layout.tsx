import type { Metadata } from "next";
import { Geist } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import "leaflet/dist/leaflet.css";
import Nav from "./components/Nav";
import { auth } from "./lib/auth";
import { prisma } from "./lib/prisma";

const geist = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Job Quest — Local Gig Marketplace",
  description: "Find local gig work in Lincoln County, Wyoming",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const user = session?.user as { id?: string; role?: string } | undefined;

  let showOnboardingBanner = false;
  if (user?.id && user.role === "WORKER") {
    const profile = await prisma.workerProfile.findUnique({ where: { userId: user.id } });
    showOnboardingBanner = !profile?.onboardingComplete;
  }

  return (
    <html lang="en" className={`${geist.variable} h-full`}>
      <body className="min-h-full flex flex-col bg-gray-50">
        <Nav />
        {showOnboardingBanner && (
          <div className="bg-blue-600 text-white text-sm px-4 py-2 flex items-center justify-between gap-4">
            <span>Complete your worker profile to start finding jobs.</span>
            <Link
              href="/onboarding"
              className="bg-white text-blue-700 font-medium px-3 py-1 rounded text-xs hover:bg-blue-50 shrink-0"
            >
              Finish Setup
            </Link>
          </div>
        )}
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}
