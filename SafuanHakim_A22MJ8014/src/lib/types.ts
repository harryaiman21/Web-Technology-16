export type IncidentStatus =
  | "new"
  | "triaged"
  | "assigned"
  | "in_progress"
  | "waiting_customer"
  | "resolved"
  | "closed";

export type IncidentPriority = "low" | "medium" | "high" | "critical";

export type IncidentSource =
  | "manual"
  | "email"
  | "google_drive"
  | "teams"
  | "whatsapp"
  | "phone"
  | "warehouse_note";

export type Incident = {
  id: string;
  title: string;
  summary: string;
  status: IncidentStatus;
  priority: IncidentPriority;
  source: IncidentSource;
  department: string;
  issueType: string;
  customerName: string;
  trackingNumber: string;
  assignedTo: string;
  duplicateOf: string | null;
  createdAt: string;
  updatedAt: string;
};

export type RawInput = {
  id: string;
  source: IncidentSource;
  content: string;
  fileName?: string;
  processingStatus: "received" | "processed" | "failed";
  createdAt: string;
};

export type RpaRun = {
  id: string;
  source: "email" | "google_drive" | "mixed";
  status: "running" | "completed" | "failed";
  processed: number;
  failed: number;
  summary: string;
  startedAt: string;
  finishedAt?: string;
};

export type Department = {
  id: string;
  name: string;
  defaultOwner: string | null;
};

export type ContentStatus = "draft" | "reviewed" | "published";

export type ContentItem = {
  id: string;
  title: string;
  status: ContentStatus;
  tags: string[];
  currentVersion: number;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ContentVersion = {
  id: string;
  contentId: string;
  version: number;
  status: ContentStatus;
  body: string;
  createdBy: string | null;
  createdAt: string;
};
