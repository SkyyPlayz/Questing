export type SafetyIncidentSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type RiskLevel = "LOW" | "MEDIUM" | "HIGH";

type RiskScoredIncident = {
  severity: string;
};

export function calculateRiskLevel(incidents: RiskScoredIncident[]): RiskLevel {
  if (incidents.some((incident) => incident.severity === "HIGH" || incident.severity === "CRITICAL")) {
    return "HIGH";
  }

  if (incidents.length >= 3) {
    return "HIGH";
  }

  if (incidents.length >= 1) {
    return "MEDIUM";
  }

  return "LOW";
}
