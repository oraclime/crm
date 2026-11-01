-- =============================================================================
-- ORA CRM by ORACLIME | Enterprise PostgreSQL & Supabase Migration (001)
-- Target Project: ora-crm-production
-- Description: Complete 19-table relational schema + UUID PKs + Foreign Keys
--              + Indexes + Row Level Security (RLS) for ADMIN, MANAGER, STAFF
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. crm_roles
CREATE TABLE IF NOT EXISTS public.crm_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_code TEXT NOT NULL UNIQUE CHECK (role_code IN ('ADMIN', 'MANAGER', 'STAFF')),
  display_name TEXT NOT NULL,
  permissions JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.crm_roles (role_code, display_name, permissions)
VALUES
  ('ADMIN', 'System Administrator', '{"all": true}'::jsonb),
  ('MANAGER', 'Business Development Manager', '{"leads": true, "team": true, "imports": true, "partnerships": true, "reports": true}'::jsonb),
  ('STAFF', 'Sales & Outreach Executive', '{"assigned_leads": true, "whatsapp": true, "followups": true, "tasks": true}'::jsonb)
ON CONFLICT (role_code) DO NOTHING;

-- 2. crm_users
CREATE TABLE IF NOT EXISTS public.crm_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'STAFF' CHECK (role IN ('ADMIN', 'MANAGER', 'STAFF')),
  phone TEXT,
  city TEXT DEFAULT 'New Delhi',
  assigned_manager_id UUID REFERENCES public.crm_users(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. crm_contacts
CREATE TABLE IF NOT EXISTS public.crm_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  showroom_name TEXT NOT NULL,
  owner_name TEXT,
  contact_person TEXT,
  whatsapp_number TEXT NOT NULL UNIQUE,
  alternative_number TEXT,
  email TEXT,
  city TEXT NOT NULL,
  state TEXT DEFAULT 'Delhi NCR',
  full_address TEXT,
  business_category TEXT NOT NULL DEFAULT 'AC Showroom',
  partnership_status TEXT DEFAULT 'Prospect',
  created_by UUID REFERENCES public.crm_users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. crm_leads
CREATE TABLE IF NOT EXISTS public.crm_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_code TEXT NOT NULL UNIQUE,
  contact_id UUID REFERENCES public.crm_contacts(id) ON DELETE SET NULL,
  showroom_name TEXT NOT NULL,
  business_name TEXT,
  owner_name TEXT,
  contact_person TEXT,
  whatsapp_number TEXT NOT NULL,
  normalized_phone TEXT NOT NULL,
  alternative_number TEXT,
  email TEXT,
  city TEXT NOT NULL,
  state TEXT DEFAULT 'Delhi NCR',
  full_address TEXT,
  business_category TEXT NOT NULL,
  lead_source TEXT NOT NULL DEFAULT 'Excel Import',
  assigned_manager_id UUID REFERENCES public.crm_users(id) ON DELETE SET NULL,
  assigned_staff_id UUID REFERENCES public.crm_users(id) ON DELETE SET NULL,
  priority TEXT NOT NULL DEFAULT 'Medium' CHECK (priority IN ('High', 'Medium', 'Low')),
  current_status TEXT NOT NULL DEFAULT 'New Lead',
  last_contact_date TIMESTAMPTZ,
  next_followup_date TIMESTAMPTZ,
  remarks TEXT,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES public.crm_users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_leads_phone ON public.crm_leads(normalized_phone);
CREATE INDEX IF NOT EXISTS idx_crm_leads_status ON public.crm_leads(current_status);
CREATE INDEX IF NOT EXISTS idx_crm_leads_city ON public.crm_leads(city);
CREATE INDEX IF NOT EXISTS idx_crm_leads_staff ON public.crm_leads(assigned_staff_id);

-- 5. crm_lead_assignments
CREATE TABLE IF NOT EXISTS public.crm_lead_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.crm_leads(id) ON DELETE CASCADE,
  assigned_to_user_id UUID NOT NULL REFERENCES public.crm_users(id) ON DELETE CASCADE,
  assigned_by_user_id UUID REFERENCES public.crm_users(id) ON DELETE SET NULL,
  assignment_role TEXT NOT NULL CHECK (assignment_role IN ('MANAGER', 'STAFF')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. crm_lead_history
CREATE TABLE IF NOT EXISTS public.crm_lead_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.crm_leads(id) ON DELETE CASCADE,
  previous_status TEXT,
  new_status TEXT NOT NULL,
  changed_by UUID REFERENCES public.crm_users(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. crm_followups
CREATE TABLE IF NOT EXISTS public.crm_followups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.crm_leads(id) ON DELETE CASCADE,
  scheduled_at TIMESTAMPTZ NOT NULL,
  assigned_staff_id UUID REFERENCES public.crm_users(id) ON DELETE SET NULL,
  followup_notes TEXT,
  call_outcome TEXT,
  customer_response TEXT,
  next_followup_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Completed', 'Overdue', 'Rescheduled')),
  created_by UUID REFERENCES public.crm_users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. crm_tasks
CREATE TABLE IF NOT EXISTS public.crm_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  assigned_staff_id UUID REFERENCES public.crm_users(id) ON DELETE SET NULL,
  related_lead_id UUID REFERENCES public.crm_leads(id) ON DELETE CASCADE,
  priority TEXT NOT NULL DEFAULT 'Medium' CHECK (priority IN ('High', 'Medium', 'Low')),
  due_date TIMESTAMPTZ NOT NULL,
  task_status TEXT NOT NULL DEFAULT 'Pending' CHECK (task_status IN ('Pending', 'In Progress', 'Completed', 'Overdue', 'Cancelled')),
  created_by UUID REFERENCES public.crm_users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 9. crm_partnerships
CREATE TABLE IF NOT EXISTS public.crm_partnerships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partnership_code TEXT NOT NULL UNIQUE,
  lead_id UUID REFERENCES public.crm_leads(id) ON DELETE SET NULL,
  showroom_name TEXT NOT NULL,
  owner_name TEXT,
  contact_details TEXT NOT NULL,
  city TEXT NOT NULL,
  partnership_date DATE NOT NULL DEFAULT CURRENT_DATE,
  partnership_status TEXT NOT NULL DEFAULT 'Interested' CHECK (partnership_status IN ('Interested', 'Discussion', 'Negotiation', 'Agreement Pending', 'Active Partner', 'Inactive Partner', 'Rejected')),
  agreed_commission_terms TEXT,
  service_categories TEXT[] DEFAULT ARRAY['Split AC Installation', 'Window AC Installation', 'AC Servicing'],
  agreement_notes TEXT,
  assigned_manager_id UUID REFERENCES public.crm_users(id) ON DELETE SET NULL,
  next_review_date DATE,
  created_by UUID REFERENCES public.crm_users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 10. crm_message_templates
CREATE TABLE IF NOT EXISTS public.crm_message_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Showroom Partnership',
  body_text TEXT NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES public.crm_users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 11. crm_campaigns
CREATE TABLE IF NOT EXISTS public.crm_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_name TEXT NOT NULL,
  campaign_type TEXT NOT NULL,
  template_id UUID REFERENCES public.crm_message_templates(id) ON DELETE SET NULL,
  assigned_user_id UUID REFERENCES public.crm_users(id) ON DELETE SET NULL,
  start_date DATE,
  end_date DATE,
  campaign_status TEXT NOT NULL DEFAULT 'Draft' CHECK (campaign_status IN ('Draft', 'Active', 'Paused', 'Completed', 'Stopped')),
  created_by UUID REFERENCES public.crm_users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 12. crm_campaign_contacts
CREATE TABLE IF NOT EXISTS public.crm_campaign_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.crm_campaigns(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES public.crm_leads(id) ON DELETE CASCADE,
  chat_opened_at TIMESTAMPTZ,
  manually_confirmed_at TIMESTAMPTZ,
  delivery_status TEXT NOT NULL DEFAULT 'Pending' CHECK (delivery_status IN ('Pending', 'Chat Opened', 'Manually Confirmed', 'Skipped', 'Interested', 'Opted Out')),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(campaign_id, lead_id)
);

-- 13. crm_messages
CREATE TABLE IF NOT EXISTS public.crm_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.crm_leads(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES public.crm_campaigns(id) ON DELETE SET NULL,
  channel_mode TEXT NOT NULL DEFAULT 'Manual Click-to-Chat' CHECK (channel_mode IN ('Manual Click-to-Chat', 'Official Meta Cloud API')),
  message_text TEXT NOT NULL,
  chat_opened_at TIMESTAMPTZ,
  manually_confirmed_sent_at TIMESTAMPTZ,
  api_delivery_status TEXT,
  sent_by UUID REFERENCES public.crm_users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 14. crm_issues
CREATE TABLE IF NOT EXISTS public.crm_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES public.crm_leads(id) ON DELETE SET NULL,
  category TEXT NOT NULL CHECK (category IN ('Invalid Number', 'WhatsApp Unavailable', 'No Response', 'Wrong Contact', 'Duplicate Lead', 'Incorrect Business Information', 'Commission Discussion', 'Partnership Terms', 'Other')),
  priority TEXT NOT NULL DEFAULT 'Medium' CHECK (priority IN ('High', 'Medium', 'Low')),
  assigned_person_id UUID REFERENCES public.crm_users(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  resolution_notes TEXT,
  issue_status TEXT NOT NULL DEFAULT 'Open' CHECK (issue_status IN ('Open', 'In Progress', 'Resolved')),
  created_by UUID REFERENCES public.crm_users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 15. crm_activity_logs
CREATE TABLE IF NOT EXISTS public.crm_activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES public.crm_leads(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL,
  description TEXT NOT NULL,
  performed_by UUID REFERENCES public.crm_users(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 16. crm_notifications
CREATE TABLE IF NOT EXISTS public.crm_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_user_id UUID NOT NULL REFERENCES public.crm_users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 17. crm_opt_outs
CREATE TABLE IF NOT EXISTS public.crm_opt_outs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES public.crm_leads(id) ON DELETE SET NULL,
  whatsapp_number TEXT NOT NULL UNIQUE,
  reason TEXT,
  recorded_by UUID REFERENCES public.crm_users(id),
  opted_out_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 18. crm_import_batches
CREATE TABLE IF NOT EXISTS public.crm_import_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name TEXT NOT NULL,
  total_rows INTEGER NOT NULL DEFAULT 0,
  imported_count INTEGER NOT NULL DEFAULT 0,
  duplicate_count INTEGER NOT NULL DEFAULT 0,
  invalid_count INTEGER NOT NULL DEFAULT 0,
  imported_by UUID REFERENCES public.crm_users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 19. crm_deleted_leads
CREATE TABLE IF NOT EXISTS public.crm_deleted_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.crm_leads(id) ON DELETE CASCADE,
  deletion_reason TEXT NOT NULL,
  deleted_by UUID REFERENCES public.crm_users(id),
  deleted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  restored_at TIMESTAMPTZ
);

-- Enable Row Level Security across all 19 tables
ALTER TABLE public.crm_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_lead_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_lead_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_followups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_partnerships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_message_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_campaign_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_opt_outs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_import_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_deleted_leads ENABLE ROW LEVEL SECURITY;
