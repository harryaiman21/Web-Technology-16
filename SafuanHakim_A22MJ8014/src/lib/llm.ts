import type { IncidentPriority } from "./types";

export type ExtractionResult = {
  title: string;
  summary: string;
  issueType: string;
  priority: IncidentPriority;
  suggestedDepartment: string;
  trackingNumber: string;
  duplicateHint: string | null;
};

export function extractIncidentFields(rawText: string): ExtractionResult {
  const text = rawText.toLowerCase();
  const trackingMatch = rawText.match(/[A-Z]{2}\d{7,10}/);
  const hasDamage = /damage|broken|crushed|torn|claim/.test(text);
  const hasAddress = /address|jalan|postcode|wrong location/.test(text);
  const hasSystem = /error|portal|system|booking|login/.test(text);
  const hasLate = /late|delay|delayed|not arrived|still no/.test(text);
  const hasCod = /cod|cash on delivery|refund|invoice|collected/.test(text);
  const urgent = /urgent|angry|vip|before dispatch|today|social media|missing/.test(text);

  const issueType = hasDamage
    ? "Damaged parcel"
    : hasAddress
      ? "Address issue"
      : hasSystem
        ? "System error"
        : hasCod
          ? "COD dispute"
          : hasLate
            ? "Late delivery"
            : "Customer complaint";

  const suggestedDepartment = hasDamage
    ? "Claims"
    : hasAddress
      ? "Address Resolution"
      : hasSystem
        ? "IT Systems"
        : hasCod
          ? "Finance"
          : hasLate
            ? "Last Mile Delivery"
            : "Customer Support";

  return {
    title: issueType,
    summary: rawText.trim().replace(/\s+/g, " ").slice(0, 240),
    issueType,
    priority: urgent ? "critical" : hasDamage || hasSystem ? "medium" : "high",
    suggestedDepartment,
    trackingNumber: trackingMatch?.[0] ?? "N/A",
    duplicateHint: trackingMatch ? `Search for existing incidents with ${trackingMatch[0]}` : null
  };
}
