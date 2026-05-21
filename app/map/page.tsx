import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Quest Map — Job Quest",
  description: "Find quests near you on the map",
};

import MapClient from "./MapClient";

export default function MapPage() {
  return <MapClient />;
}
