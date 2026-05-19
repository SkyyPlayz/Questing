import type { Metadata } from "next";
import dynamic from "next/dynamic";

export const metadata: Metadata = {
  title: "Quest Map — Job Quest",
  description: "Find quests near you on the map",
};

const MapClient = dynamic(() => import("./MapClient"), { ssr: false });

export default function MapPage() {
  return <MapClient />;
}
