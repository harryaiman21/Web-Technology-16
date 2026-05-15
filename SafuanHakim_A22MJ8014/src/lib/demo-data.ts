import type { Incident, RawInput, RpaRun } from "./types";

export const departments = [
  "Customer Support",
  "Last Mile Delivery",
  "Warehouse Operations",
  "Address Resolution",
  "IT Systems",
  "Claims",
  "Finance"
];

export const incidents: Incident[] = [
  {
    id: "INC-1007",
    title: "Late delivery for corporate shipment",
    summary: "Customer reports shipment MY2849317 was expected yesterday but is still marked out for delivery.",
    status: "in_progress",
    priority: "high",
    source: "email",
    department: "Last Mile Delivery",
    issueType: "Late delivery",
    customerName: "Aisha Rahman",
    trackingNumber: "MY2849317",
    assignedTo: "Farid",
    duplicateOf: null,
    createdAt: "2026-05-13T02:15:00Z",
    updatedAt: "2026-05-13T04:45:00Z"
  },
  {
    id: "INC-1008",
    title: "Damaged parcel photo from WhatsApp",
    summary: "Image shows crushed corner and torn outer packaging. Customer asks for replacement claim instructions.",
    status: "triaged",
    priority: "medium",
    source: "whatsapp",
    department: "Claims",
    issueType: "Damaged parcel",
    customerName: "DHL Retail Desk",
    trackingNumber: "MY7751904",
    assignedTo: "Unassigned",
    duplicateOf: null,
    createdAt: "2026-05-13T03:02:00Z",
    updatedAt: "2026-05-13T03:30:00Z"
  },
  {
    id: "INC-1009",
    title: "Warehouse handwritten address correction",
    summary: "Warehouse note requests changing delivery address to Jalan Ampang before driver dispatch.",
    status: "assigned",
    priority: "critical",
    source: "warehouse_note",
    department: "Address Resolution",
    issueType: "Address issue",
    customerName: "Tan Logistics",
    trackingNumber: "MY5511029",
    assignedTo: "Mei",
    duplicateOf: null,
    createdAt: "2026-05-13T03:40:00Z",
    updatedAt: "2026-05-13T04:10:00Z"
  },
  {
    id: "INC-1010",
    title: "Portal error while booking pickup",
    summary: "Customer cannot submit pickup request; booking page returns system error after payment step.",
    status: "new",
    priority: "medium",
    source: "teams",
    department: "IT Systems",
    issueType: "System error",
    customerName: "Nora Lim",
    trackingNumber: "N/A",
    assignedTo: "Unassigned",
    duplicateOf: "INC-1003",
    createdAt: "2026-05-13T04:05:00Z",
    updatedAt: "2026-05-13T04:05:00Z"
  },
  {
    id: "INC-1011",
    title: "Address change ignored before delivery",
    summary:
      "Customer requested urgent address change for shipment MY44567789 on 5 May, but no ticket was created and parcel was delivered to the old Shah Alam address.",
    status: "new",
    priority: "critical",
    source: "email",
    department: "Address Resolution",
    issueType: "Address issue",
    customerName: "Customer from 5 May email",
    trackingNumber: "MY44567789",
    assignedTo: "Unassigned",
    duplicateOf: null,
    createdAt: "2026-05-13T05:00:00Z",
    updatedAt: "2026-05-13T05:00:00Z"
  },
  {
    id: "INC-1012",
    title: "COD amount collected does not match invoice",
    summary:
      "Customer says courier collected RM450 COD instead of RM250 shown on invoice. Finance shows RM450 and customer urgently requests RM200 refund.",
    status: "triaged",
    priority: "high",
    source: "whatsapp",
    department: "Finance",
    issueType: "COD dispute",
    customerName: "WhatsApp customer",
    trackingNumber: "N/A",
    assignedTo: "Unassigned",
    duplicateOf: null,
    createdAt: "2026-05-13T05:05:00Z",
    updatedAt: "2026-05-13T05:05:00Z"
  },
  {
    id: "INC-1013",
    title: "Damaged coffee machine with late delivery",
    summary:
      "Customer received shipment MY987623400 two days late with crushed box, water marks, dents, missing exception scan, and social media escalation risk.",
    status: "assigned",
    priority: "critical",
    source: "email",
    department: "Claims",
    issueType: "Damaged parcel",
    customerName: "Customer from 22 March email",
    trackingNumber: "MY987623400",
    assignedTo: "Claims queue",
    duplicateOf: null,
    createdAt: "2026-05-13T05:10:00Z",
    updatedAt: "2026-05-13T05:10:00Z"
  }
];

export const rawInputs: RawInput[] = [
  {
    id: "RAW-221",
    source: "email",
    content: "Subject: urgent late delivery. tracking MY2849317 still no parcel, customer angry.",
    processingStatus: "processed",
    createdAt: "2026-05-13T02:10:00Z"
  },
  {
    id: "RAW-222",
    source: "google_drive",
    content: "Uploaded image: damaged-parcel-counter-17.jpg",
    fileName: "damaged-parcel-counter-17.jpg",
    processingStatus: "processed",
    createdAt: "2026-05-13T03:01:00Z"
  },
  {
    id: "RAW-223",
    source: "warehouse_note",
    content: "Handwritten note: change address before dispatch. Jalan Ampang. MY5511029.",
    fileName: "warehouse-note-5511029.png",
    processingStatus: "received",
    createdAt: "2026-05-13T03:38:00Z"
  },
  {
    id: "RAW-224",
    source: "email",
    content:
      "Customer email dated 5 May requesting urgent address change for shipment MY44567789. Original address was residential in Shah Alam, new address is customer's office in PJ. Parcel delivered to old address on 6 May and signed by unknown person.",
    fileName: "Customer email dated 5 May requesti.txt",
    processingStatus: "processed",
    createdAt: "2026-05-13T05:00:00Z"
  },
  {
    id: "RAW-225",
    source: "whatsapp",
    content:
      "Customer WhatsApp message complains courier collected RM450 COD instead of RM250 shown on invoice. Customer attached photo of handwritten receipt. Caller wants refund of extra RM200 urgently.",
    fileName: "Customer WhatsApp message complains.txt",
    processingStatus: "processed",
    createdAt: "2026-05-13T05:05:00Z"
  },
  {
    id: "RAW-226",
    source: "email",
    content:
      "Incoming email from customer on 22 March: damaged parcel received. Shipment MY987623400 arrived two days late with crushed DHL box, torn panels, water leakage marks, dents, missing exception scan, and escalation risk.",
    fileName: "Incoming email from customer on 22.txt",
    processingStatus: "processed",
    createdAt: "2026-05-13T05:10:00Z"
  }
];

export const rpaRuns: RpaRun[] = [
  {
    id: "RPA-501",
    source: "mixed",
    status: "completed",
    processed: 42,
    failed: 2,
    summary: "Email and Google Drive scan completed. Two files failed validation because the format was unsupported.",
    startedAt: "2026-05-13T01:00:00Z",
    finishedAt: "2026-05-13T01:18:00Z"
  },
  {
    id: "RPA-502",
    source: "email",
    status: "running",
    processed: 13,
    failed: 0,
    summary: "Mailbox scan is running and creating raw input records.",
    startedAt: "2026-05-13T04:30:00Z"
  }
];
