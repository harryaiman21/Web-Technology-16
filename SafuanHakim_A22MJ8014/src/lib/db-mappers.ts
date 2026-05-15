import type { Department, Incident, RawInput, RpaRun } from "./types";

type IncidentRow = {
  id: string;
  title: string;
  summary: string;
  status: Incident["status"];
  priority: Incident["priority"];
  source: Incident["source"];
  department: string | null;
  issue_type: string | null;
  customer_name: string | null;
  tracking_number: string | null;
  assigned_to: string | null;
  duplicate_of: string | null;
  created_at: string;
  updated_at: string;
};

type RawInputRow = {
  id: string;
  source: RawInput["source"];
  content: string;
  file_name: string | null;
  processing_status: RawInput["processingStatus"];
  created_at: string;
};

type RpaRunRow = {
  id: string;
  source: RpaRun["source"];
  status: RpaRun["status"];
  processed: number;
  failed: number;
  summary: string;
  started_at: string;
  finished_at: string | null;
};

type DepartmentRow = {
  id: string;
  name: string;
  default_owner: string | null;
};

export function mapIncident(row: IncidentRow): Incident {
  return {
    id: row.id,
    title: row.title,
    summary: row.summary,
    status: row.status,
    priority: row.priority,
    source: row.source,
    department: row.department ?? "Customer Support",
    issueType: row.issue_type ?? "Customer complaint",
    customerName: row.customer_name ?? "Unknown customer",
    trackingNumber: row.tracking_number ?? "N/A",
    assignedTo: row.assigned_to ?? "Unassigned",
    duplicateOf: row.duplicate_of,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function mapRawInput(row: RawInputRow): RawInput {
  return {
    id: row.id,
    source: row.source,
    content: row.content,
    fileName: row.file_name ?? undefined,
    processingStatus: row.processing_status,
    createdAt: row.created_at
  };
}

export function mapRpaRun(row: RpaRunRow): RpaRun {
  return {
    id: row.id,
    source: row.source,
    status: row.status,
    processed: row.processed,
    failed: row.failed,
    summary: row.summary,
    startedAt: row.started_at,
    finishedAt: row.finished_at ?? undefined
  };
}

export function mapDepartment(row: DepartmentRow): Department {
  return {
    id: row.id,
    name: row.name,
    defaultOwner: row.default_owner
  };
}
