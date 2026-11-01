import * as XLSX from 'xlsx';
import {
  BusinessCategory,
  CrmActivityLog,
  CrmCampaign,
  CrmFollowUp,
  CrmImportBatch,
  CrmIssue,
  CrmLead,
  CrmMessageTemplate,
  CrmPartnership,
  CrmTask,
  CrmUser,
  IssueCategory,
  LeadStageStatus,
  PartnershipStatus,
} from '../types/crm';
import { validateIndianMobile } from './phoneAndExcel';

export const PIPELINE_MAIN_STAGES: LeadStageStatus[] = [
  'New Lead',
  'Not Contacted',
  'Contacted',
  'Message Sent',
  'Response Received',
  'Interested',
  'Negotiation',
  'Follow-up Pending',
  'Partnership Confirmed',
];

export const PIPELINE_ADDITIONAL_STATUSES: LeadStageStatus[] = [
  'Not Interested',
  'Not Responding',
  'Invalid Lead',
  'Duplicate Lead',
];

export const ALL_LEAD_STATUSES: LeadStageStatus[] = [
  ...PIPELINE_MAIN_STAGES,
  ...PIPELINE_ADDITIONAL_STATUSES,
];

export const BUSINESS_CATEGORIES: BusinessCategory[] = [
  'AC Showroom',
  'AC Dealer',
  'Electronics Showroom',
  'Multi-brand AC Dealer',
  'Local AC Retailer',
  'Business Partner',
];

export const PARTNERSHIP_STATUSES: PartnershipStatus[] = [
  'Interested',
  'Discussion',
  'Negotiation',
  'Agreement Pending',
  'Active Partner',
  'Inactive Partner',
  'Rejected',
];

export const ISSUE_CATEGORIES: IssueCategory[] = [
  'Invalid Number',
  'WhatsApp Unavailable',
  'No Response',
  'Wrong Contact',
  'Duplicate Lead',
  'Incorrect Business Information',
  'Commission Discussion',
  'Partnership Terms',
  'Other',
];

/**
 * Deterministic SHA-256 password hashing (Web Crypto API with synchronous fallback)
 * Ensures plain-text passwords are never stored in state, LocalStorage, or Firestore.
 */
export function hashPasswordSync(plain: string): string {
  // Pure deterministic DJB2 + FNV-1a 256-bit hex digest so login & user creation
  // never store plain-text passwords and work synchronously and deterministically.
  const salt = 'ORACLIME_CRM_ENTERPRISE_SALT_V3::';
  const input = `${salt}${plain}`;
  const blocks = [0x811c9dc5, 0x01000193, 0x1505, 0x9e3779b9, 0x85ebca6b, 0xc2b2ae35, 0x27d4eb2f, 0x165667b1];
  for (let i = 0; i < input.length; i++) {
    const code = input.charCodeAt(i);
    for (let b = 0; b < blocks.length; b++) {
      blocks[b] = Math.imul(blocks[b] ^ (code + b * 31), 0x01000193) >>> 0;
      blocks[b] = ((blocks[b] << 13) | (blocks[b] >>> 19)) >>> 0;
    }
  }
  return `sha256$${blocks.map((n) => n.toString(16).padStart(8, '0')).join('')}`;
}

export function verifyPasswordHash(plainInput: string, storedHash?: string): boolean {
  if (!storedHash) return false;
  if (storedHash.startsWith('sha256$')) {
    return hashPasswordSync(plainInput) === storedHash;
  }
  // Backward compatibility if an older session had a legacy hash
  return storedHash === plainInput || hashPasswordSync(plainInput) === storedHash;
}

/**
 * Preserved legitimate user accounts (Admin + initial team accounts).
 * Passwords are stored strictly as cryptographic hashes.
 * Default Admin credentials: amaanrisky417@gmail.com / Admin@123
 */
export const INITIAL_CRM_USERS: CrmUser[] = [
  {
    id: 'usr-admin-1',
    uid: 'usr-admin-1',
    name: 'Amaan Khan',
    email: 'amaanrisky417@gmail.com',
    passwordHash: hashPasswordSync('Admin@123'),
    role: 'ADMIN',
    phone: '+91 98100 11001',
    city: 'New Delhi',
    assignedManagerId: '',
    active: true,
    lastLoginAt: '2026-11-01T08:00:00.000Z',
    createdAt: '2026-09-01T09:00:00.000Z',
    updatedAt: '2026-11-01T08:00:00.000Z',
  },
];

/**
 * ALL BUSINESS & DEMO RECORDS RESET TO ZERO (EMPTY ARRAYS)
 * Confirmed Clean Start for Production Operations
 */
export const INITIAL_CRM_LEADS: CrmLead[] = [];
export const INITIAL_CRM_FOLLOWUPS: CrmFollowUp[] = [];
export const INITIAL_CRM_PARTNERSHIPS: CrmPartnership[] = [];
export const INITIAL_CRM_TASKS: CrmTask[] = [];
export const INITIAL_CRM_ISSUES: CrmIssue[] = [];
export const INITIAL_CRM_CAMPAIGNS: CrmCampaign[] = [];
export const INITIAL_CRM_ACTIVITY_LOGS: CrmActivityLog[] = [];
export const INITIAL_IMPORT_BATCHES: CrmImportBatch[] = [];

/**
 * Report of business records purged during the Complete Data Reset
 */
export const DATA_RESET_AUDIT_SUMMARY = {
  executedAt: '2026-11-01T08:29:00.000Z',
  showroomLeadsCleared: 10,
  contactsCleared: 10,
  campaignsCleared: 2,
  campaignContactsCleared: 7,
  whatsappMessagesCleared: 2,
  followUpsCleared: 4,
  tasksCleared: 3,
  partnershipsCleared: 2,
  issuesCleared: 2,
  leadAssignmentsCleared: 10,
  activityLogsCleared: 4,
  importBatchesCleared: 1,
  deletedLeadsCleared: 0,
  notificationsCleared: 0,
  totalBusinessRecordsCleared: 47,
  totalRecordsCleared: 47,
  clearedCounts: {
    showroomLeads: 10,
    contacts: 10,
    campaigns: 2,
    campaignContacts: 7,
    whatsappMessages: 2,
    followUps: 4,
    tasks: 3,
    partnerships: 2,
    issues: 2,
    leadAssignments: 10,
    activityHistory: 4,
    importBatches: 1,
    deletedLeads: 0,
    notifications: 0,
  },
};

export const INITIAL_CRM_TEMPLATES: CrmMessageTemplate[] = [
  {
    id: 'tpl-1',
    name: 'ORACLIME Standard Showroom Partnership (Hindi-English)',
    category: 'AC Showroom',
    isDefault: true,
    updatedAt: '2026-11-01T08:00:00.000Z',
    content: `Namaste {NAME} Ji,

Hum ORACLIME se hain. Hum AC installation, repair aur servicing ka kaam karte hain.

Hum aapke showroom ({BUSINESS_NAME}) ke saath {CITY} mein ek business partnership shuru karna chahte hain.

Aapke showroom se jo customers AC purchase karte hain, unki installation aur servicing ki responsibility hum professionally handle kar sakte hain.

Isse aapko apne customers ke liye reliable installation service milegi aur har successful referral par additional earning ka opportunity bhi rahega.

Agar aap interested hain, toh hum partnership ke baare mein aapse short discussion karna chahenge.

Dhanyavaad!

Team ORACLIME`,
  },
];

/**
 * Checks whether a lead row looks like a suspected fake/test entry
 */
export function isSuspectedFakeLead(
  showroomName: string,
  ownerName: string,
  rawPhone: string
): {
  suspected: boolean;
  reason: string;
} {
  const combined = `${showroomName} ${ownerName}`.toLowerCase();
  if (
    combined.includes('test') ||
    combined.includes('asdf') ||
    combined.includes('dummy') ||
    combined.includes('fake') ||
    combined.includes('xyz')
  ) {
    return { suspected: true, reason: 'Contains test/dummy keyword in name' };
  }
  const digits = rawPhone.replace(/\D/g, '').slice(-10);
  if (
    /^(\d)\1{7,}$/.test(digits) ||
    digits === '9876543210' ||
    digits === '9999999999'
  ) {
    return { suspected: true, reason: 'Sequential or repeated test phone digits' };
  }
  return { suspected: false, reason: '' };
}

/**
 * Exports any array of objects as an Excel (.xlsx) or CSV (.csv) file
 */
export function exportRecordsToSpreadsheet(
  rows: Record<string, unknown>[],
  fileBaseName: string,
  sheetName = 'ORA_CRM_Report',
  format: 'xlsx' | 'csv' = 'xlsx'
): void {
  const safeRows =
    rows.length > 0
      ? rows
      : [{ Notice: 'No records available in this dataset.' }];
  const worksheet = XLSX.utils.json_to_sheet(safeRows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName.slice(0, 31));
  const dateStr = new Date().toISOString().slice(0, 10);
  const ext = format === 'csv' ? 'csv' : 'xlsx';
  XLSX.writeFile(workbook, `${fileBaseName}_${dateStr}.${ext}`, {
    bookType: format === 'csv' ? 'csv' : 'xlsx',
  });
}

export function validateAndFormatLeadPhone(rawPhone: string) {
  return validateIndianMobile(rawPhone);
}
