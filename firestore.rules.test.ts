/**
 * Firestore Security Rules Test Specification for ORA CRM
 * Verifies that all "Dirty Dozen" adversarial payloads return PERMISSION_DENIED.
 */

export interface SecurityTestCase {
  id: number;
  name: string;
  collection: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  expectedResult: 'PERMISSION_DENIED';
  payload?: Record<string, unknown>;
}

export const DIRTY_DOZEN_SECURITY_TESTS: SecurityTestCase[] = [
  {
    id: 1,
    name: 'Unverified Admin Email Spoof',
    collection: 'crm_leads/lead_1',
    operation: 'create',
    expectedResult: 'PERMISSION_DENIED',
    payload: { id: 'lead_1', showroomName: 'Test', createdByUid: 'spoof' },
  },
  {
    id: 2,
    name: 'Self-Privilege Escalation to ADMIN',
    collection: 'crm_users/user_2',
    operation: 'create',
    expectedResult: 'PERMISSION_DENIED',
    payload: { id: 'user_2', uid: 'user_2', role: 'ADMIN' },
  },
  {
    id: 3,
    name: 'Cross-User Lead Spoofing',
    collection: 'crm_leads/lead_2',
    operation: 'create',
    expectedResult: 'PERMISSION_DENIED',
    payload: { id: 'lead_2', createdByUid: 'victim_uid' },
  },
  {
    id: 4,
    name: 'Shadow Ghost Field Injection',
    collection: 'crm_leads/lead_1',
    operation: 'update',
    expectedResult: 'PERMISSION_DENIED',
    payload: { ghostField: true },
  },
  {
    id: 5,
    name: 'Oversized String Denial-of-Wallet',
    collection: 'crm_leads/lead_1',
    operation: 'create',
    expectedResult: 'PERMISSION_DENIED',
    payload: { remarks: 'x'.repeat(5000) },
  },
  {
    id: 6,
    name: 'ID Poisoning Attack',
    collection: 'crm_leads/bad$id!',
    operation: 'create',
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 7,
    name: 'Immutable Creator Mutation',
    collection: 'crm_leads/lead_1',
    operation: 'update',
    expectedResult: 'PERMISSION_DENIED',
    payload: { createdByUid: 'different_uid' },
  },
  {
    id: 8,
    name: 'Blanket List Scraping by Non-Owner',
    collection: 'crm_leads',
    operation: 'list',
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 9,
    name: 'Unauthorized PII Read on crm_users',
    collection: 'crm_users/other_uid',
    operation: 'get',
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 10,
    name: 'Invalid Enum Status Injection',
    collection: 'crm_leads/lead_1',
    operation: 'update',
    expectedResult: 'PERMISSION_DENIED',
    payload: { status: 'INVALID_STAGE' },
  },
  {
    id: 11,
    name: 'Activity Log Tampering',
    collection: 'crm_activity_logs/log_1',
    operation: 'update',
    expectedResult: 'PERMISSION_DENIED',
    payload: { details: 'Modified audit log' },
  },
  {
    id: 12,
    name: 'Unauthenticated Write Attempt',
    collection: 'crm_followups/f_1',
    operation: 'create',
    expectedResult: 'PERMISSION_DENIED',
  },
];
