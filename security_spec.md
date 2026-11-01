# ORA CRM – Application Security Specification (Phase 0 TDD)

## 1. Data Invariants

1. **Authentication & Email Verification Gate**: Every read and write operation requires an authenticated user (`request.auth != null`) with `request.auth.token.email_verified == true`.
2. **Document ID Hardening**: All single-document operations (`get`, `create`, `update`, `delete`) validate path variables via `isValidId(id)` (`^[a-zA-Z0-9_\-]+$`, max 128 chars).
3. **Ownership & Role Isolation**:
   - Every created document in `/crm_leads`, `/crm_followups`, `/crm_partnerships`, `/crm_tasks`, `/crm_issues`, `/crm_campaigns`, and `/crm_activity_logs` must have `incoming().createdByUid == request.auth.uid`.
   - `allow list` rules strictly evaluate `resource.data.createdByUid == request.auth.uid || isAdmin()` so no blanket reads occur.
   - `createdByUid` is immutable across all updates (`incoming().createdByUid == existing().createdByUid`).
4. **Role Escalation Prevention**: Users cannot self-assign `ADMIN` in `/crm_users/{userId}` unless they are already the bootstrapped admin (`amaanrisky417@gmail.com` with `email_verified == true`) or listed in `/admins/{uid}`.
5. **Strict Schema & Volumetric Bounds**: All string fields enforce `.size() <= MAX` matching `firebase-blueprint.json`.

## 2. The "Dirty Dozen" Payloads

1. **Unverified Admin Email Spoof**: Attempting write with `email == 'amaanrisky417@gmail.com'` but `email_verified == false`.
2. **Self-Privilege Escalation**: Creating `/crm_users/{uid}` with `role: 'ADMIN'` by a non-admin user.
3. **Cross-User Lead Spoofing**: Creating `/crm_leads/lead_1` with `createdByUid: 'other_user_uid'`.
4. **Shadow Ghost Field Injection**: Updating `/crm_leads/lead_1` with an undeclared field `isSuperVerified: true`.
5. **Oversized String Denial-of-Wallet**: Creating `/crm_leads/lead_1` with `remarks` of 10,000 characters (`maxLength: 2000`).
6. **ID Poisoning Attack**: Creating a document with path ID containing spaces or special characters (`lead$123!`).
7. **Immutable Creator Mutation**: Updating `/crm_leads/lead_1` to change `createdByUid` after creation.
8. **Blanket List Scraping**: Listing `/crm_leads` without filtering `where('createdByUid', '==', auth.uid)` as a non-admin.
9. **Unauthorized PII Read**: Reading `/crm_users/{otherUserId}` as a non-owner, non-admin user.
10. **Invalid Enum Status Injection**: Setting `status: 'HACKED_STAGE'` on `/crm_leads/lead_1`.
11. **Activity Log Tampering**: Attempting to `update` or `delete` an immutable `/crm_activity_logs/{logId}` entry by a standard user.
12. **Unauthenticated Write**: Attempting to create a follow-up in `/crm_followups/f1` with `request.auth == null`.
