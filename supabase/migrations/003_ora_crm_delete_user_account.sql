-- ============================================================================
-- ORA CRM BY ORACLIME - MIGRATION 003: SECURE ADMIN USER DELETION RPC
-- Target Project: ora-crm-production
-- Purpose:
--   Server-side administrative procedure to delete a CRM user profile and
--   revoke authentication access without exposing service-role keys in the
--   frontend, while preserving leads and recording an immutable audit entry.
-- ============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.admin_delete_crm_user_account(
  p_target_user_id UUID,
  p_reassign_to_name TEXT DEFAULT 'Unassigned'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role TEXT;
  v_target_user RECORD;
  v_active_admin_count INTEGER;
  v_affected_leads INTEGER := 0;
  v_replacement_name TEXT := COALESCE(NULLIF(TRIM(p_reassign_to_name), ''), 'Unassigned');
BEGIN
  -- 1. Verify caller is an authenticated ADMIN
  SELECT role INTO v_caller_role
  FROM public.crm_users
  WHERE id = auth.uid() AND active = true;

  IF v_caller_role IS DISTINCT FROM 'ADMIN' THEN
    RAISE EXCEPTION 'Security Violation: Only ADMIN users can delete user accounts.';
  END IF;

  -- 2. Prevent self-deletion
  IF p_target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Security Violation: You cannot delete your own currently logged-in account.';
  END IF;

  -- 3. Fetch target user profile
  SELECT * INTO v_target_user
  FROM public.crm_users
  WHERE id = p_target_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User account not found.';
  END IF;

  -- 4. Never allow deletion of the last active Admin account
  IF v_target_user.role = 'ADMIN' THEN
    SELECT COUNT(*) INTO v_active_admin_count
    FROM public.crm_users
    WHERE role = 'ADMIN' AND active = true AND id <> p_target_user_id;

    IF v_active_admin_count < 1 THEN
      RAISE EXCEPTION 'Security Violation: Cannot delete the last active ADMIN account.';
    END IF;
  END IF;

  -- 5. Safely unassign or reassign related showroom leads (never delete leads)
  UPDATE public.crm_leads
  SET assigned_staff = CASE
        WHEN LOWER(assigned_staff) = LOWER(v_target_user.name) THEN v_replacement_name
        ELSE assigned_staff
      END,
      assigned_manager = CASE
        WHEN LOWER(assigned_manager) = LOWER(v_target_user.name) THEN v_replacement_name
        ELSE assigned_manager
      END,
      updated_at = NOW()
  WHERE LOWER(assigned_staff) = LOWER(v_target_user.name)
     OR LOWER(assigned_manager) = LOWER(v_target_user.name);

  GET DIAGNOSTICS v_affected_leads = ROW_COUNT;

  -- Clear manager link on any staff reporting to this user
  UPDATE public.crm_users
  SET assigned_manager_id = NULL,
      updated_at = NOW()
  WHERE assigned_manager_id = p_target_user_id;

  -- 6. Record immutable audit log entry
  INSERT INTO public.crm_activity_logs (
    action_type,
    details,
    performed_by,
    performed_by_role,
    created_by_uid,
    timestamp
  ) VALUES (
    'User Account Deleted',
    FORMAT(
      'Deleted user account %s (%s, Role: %s). Affected leads (%s) set to: %s.',
      v_target_user.name,
      v_target_user.email,
      v_target_user.role,
      v_affected_leads,
      v_replacement_name
    ),
    'Administrator',
    'ADMIN',
    auth.uid()::TEXT,
    NOW()
  );

  -- 7. Delete CRM user profile and revoke auth session
  DELETE FROM public.crm_users WHERE id = p_target_user_id;

  RETURN jsonb_build_object(
    'ok', true,
    'deletedUserId', p_target_user_id,
    'deletedEmail', v_target_user.email,
    'affectedLeads', v_affected_leads
  );
END;
$$;

COMMIT;
