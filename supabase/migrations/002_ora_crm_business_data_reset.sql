-- =============================================================================
-- ORA CRM by ORACLIME | Complete Business Data Reset Migration (002)
-- Target Project: ora-crm-production
-- Description: Clears all sample, demo, test, and stored CRM business records
--              in strict foreign-key dependency order while preserving schema,
--              migrations, roles, and legitimate user authentication accounts.
-- =============================================================================

BEGIN;

-- Step 1: Clear child & junction tables first (strict foreign-key order)
DELETE FROM public.crm_deleted_leads;
DELETE FROM public.crm_campaign_contacts;
DELETE FROM public.crm_messages;
DELETE FROM public.crm_lead_assignments;
DELETE FROM public.crm_lead_history;
DELETE FROM public.crm_followups;
DELETE FROM public.crm_tasks;
DELETE FROM public.crm_partnerships;
DELETE FROM public.crm_issues;
DELETE FROM public.crm_activity_logs;
DELETE FROM public.crm_notifications;
DELETE FROM public.crm_opt_outs;
DELETE FROM public.crm_import_batches;

-- Step 2: Clear parent campaign, lead, and contact tables
DELETE FROM public.crm_campaigns;
DELETE FROM public.crm_leads;
DELETE FROM public.crm_contacts;

-- Note: public.crm_roles, public.crm_users, and public.crm_message_templates
-- are intentionally preserved so authentication, RBAC permissions, and system
-- configuration remain intact.

COMMIT;
