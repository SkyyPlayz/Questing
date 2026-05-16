import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import Nav from "./components/Nav";

const geist = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Job Quest — Local Gig Marketplace",
  description: "Find local gig work in Lincoln County, Wyoming",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} h-full`}>
      <body className="min-h-full flex flex-col bg-gray-50">
        <Nav />
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}
