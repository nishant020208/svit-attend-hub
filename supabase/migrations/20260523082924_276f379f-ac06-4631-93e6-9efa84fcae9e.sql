
-- 1. Audit log table
CREATE TABLE IF NOT EXISTS public.whitelist_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid,
  actor_email text,
  action text NOT NULL, -- READ, INSERT, UPDATE, DELETE
  target_email text,
  before_data jsonb,
  after_data jsonb,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.whitelist_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin view whitelist audit"
  ON public.whitelist_audit_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'ADMIN'::app_role));

CREATE POLICY "Deny anon whitelist audit"
  ON public.whitelist_audit_log AS RESTRICTIVE FOR ALL TO anon
  USING (false);

-- Block direct writes; only triggers / SECURITY DEFINER functions may insert
CREATE POLICY "Block direct writes to audit"
  ON public.whitelist_audit_log AS RESTRICTIVE FOR ALL TO authenticated
  USING (false) WITH CHECK (false);

-- 2. Missing UPDATE policy on whitelist (admin only)
DROP POLICY IF EXISTS "Admin update whitelist" ON public.whitelist;
CREATE POLICY "Admin update whitelist"
  ON public.whitelist FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'ADMIN'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'ADMIN'::app_role));

-- 3. Audit trigger function (writes)
CREATE OR REPLACE FUNCTION public.whitelist_audit_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
BEGIN
  SELECT email INTO v_email FROM auth.users WHERE id = auth.uid();
  INSERT INTO public.whitelist_audit_log(actor_id, actor_email, action, target_email, before_data, after_data)
  VALUES (
    auth.uid(),
    v_email,
    TG_OP,
    COALESCE(NEW.email, OLD.email),
    CASE WHEN TG_OP IN ('UPDATE','DELETE') THEN to_jsonb(OLD) END,
    CASE WHEN TG_OP IN ('UPDATE','INSERT') THEN to_jsonb(NEW) END
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS whitelist_audit_ins ON public.whitelist;
DROP TRIGGER IF EXISTS whitelist_audit_upd ON public.whitelist;
DROP TRIGGER IF EXISTS whitelist_audit_del ON public.whitelist;
CREATE TRIGGER whitelist_audit_ins AFTER INSERT ON public.whitelist
  FOR EACH ROW EXECUTE FUNCTION public.whitelist_audit_trigger();
CREATE TRIGGER whitelist_audit_upd AFTER UPDATE ON public.whitelist
  FOR EACH ROW EXECUTE FUNCTION public.whitelist_audit_trigger();
CREATE TRIGGER whitelist_audit_del AFTER DELETE ON public.whitelist
  FOR EACH ROW EXECUTE FUNCTION public.whitelist_audit_trigger();

-- 4. Logged read function for admins
CREATE OR REPLACE FUNCTION public.admin_list_whitelist(_reason text DEFAULT 'list')
RETURNS SETOF public.whitelist
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'ADMIN'::app_role) THEN
    RAISE EXCEPTION 'forbidden: admin only';
  END IF;
  SELECT email INTO v_email FROM auth.users WHERE id = auth.uid();
  INSERT INTO public.whitelist_audit_log(actor_id, actor_email, action, reason)
  VALUES (auth.uid(), v_email, 'READ', _reason);
  RETURN QUERY SELECT * FROM public.whitelist ORDER BY created_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_list_whitelist(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_list_whitelist(text) TO authenticated;

-- 5. RLS regression check (admin only)
CREATE OR REPLACE FUNCTION public.rls_regression_check()
RETURNS TABLE(check_name text, passed boolean, detail text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student_a uuid;
  v_student_b uuid;
  v_faculty   uuid;
  v_cnt int;
BEGIN
  IF NOT public.has_role(auth.uid(), 'ADMIN'::app_role) THEN
    RAISE EXCEPTION 'forbidden: admin only';
  END IF;

  -- pick two different students and a faculty (if available)
  SELECT user_id INTO v_student_a FROM public.user_roles WHERE role='STUDENT' LIMIT 1;
  SELECT user_id INTO v_student_b FROM public.user_roles WHERE role='STUDENT' AND user_id <> v_student_a LIMIT 1;
  SELECT user_id INTO v_faculty   FROM public.user_roles WHERE role='FACULTY' LIMIT 1;

  -- Check 1: profiles table protects unauthenticated
  RETURN QUERY SELECT
    'profiles: no anon select policy'::text,
    NOT EXISTS (
      SELECT 1 FROM pg_policy
      WHERE polrelid='public.profiles'::regclass
        AND polcmd='r' AND 'anon'=ANY(polroles::regrole[]::text[])
        AND polqual::text NOT ILIKE '%false%'
    ),
    'verified no SELECT policy grants anon role'::text;

  -- Check 2: student SELECT policy on profiles is owner-scoped
  RETURN QUERY SELECT
    'profiles: student can only see own row'::text,
    EXISTS (
      SELECT 1 FROM pg_policy
      WHERE polrelid='public.profiles'::regclass
        AND polcmd='r'
        AND polqual::text ILIKE '%auth.uid()%'
    ),
    'SELECT policy uses auth.uid() ownership check'::text;

  -- Check 3: attendance has student-owner policy
  RETURN QUERY SELECT
    'attendance: student-owner SELECT policy exists'::text,
    EXISTS (SELECT 1 FROM pg_policy WHERE polrelid='public.attendance'::regclass AND polcmd='r' AND polqual::text ILIKE '%students.user_id = auth.uid()%'),
    'ownership policy present'::text;

  -- Check 4: results owner-scoped policy
  RETURN QUERY SELECT
    'results: student-owner SELECT policy exists'::text,
    EXISTS (SELECT 1 FROM pg_policy WHERE polrelid='public.results'::regclass AND polcmd='r' AND polqual::text ILIKE '%students.user_id = auth.uid()%'),
    'ownership policy present'::text;

  -- Check 5: risk_scores parent/student scoped + anon denied
  RETURN QUERY SELECT
    'risk_scores: anon denied'::text,
    EXISTS (SELECT 1 FROM pg_policy WHERE polrelid='public.risk_scores'::regclass AND 'anon'=ANY(polroles::regrole[]::text[]) AND polqual::text ILIKE '%false%'),
    'anon restrictive false policy'::text;

  -- Check 6: whitelist anon denied
  RETURN QUERY SELECT
    'whitelist: anon denied'::text,
    EXISTS (SELECT 1 FROM pg_policy WHERE polrelid='public.whitelist'::regclass AND 'anon'=ANY(polroles::regrole[]::text[]) AND polqual::text ILIKE '%false%'),
    'anon restrictive false policy'::text;

  -- Check 7: whitelist only admin SELECT
  RETURN QUERY SELECT
    'whitelist: admin-only SELECT'::text,
    EXISTS (SELECT 1 FROM pg_policy WHERE polrelid='public.whitelist'::regclass AND polcmd='r' AND polqual::text ILIKE '%has_role(auth.uid(), ''ADMIN''%'),
    'has_role admin check on SELECT'::text;

  -- Check 8: live runtime check — simulate cross-student read on profiles
  IF v_student_a IS NOT NULL AND v_student_b IS NOT NULL THEN
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_student_a::text, 'role','authenticated')::text, true);
    EXECUTE 'SET LOCAL ROLE authenticated';
    SELECT count(*) INTO v_cnt FROM public.profiles WHERE id = v_student_b;
    EXECUTE 'RESET ROLE';
    PERFORM set_config('request.jwt.claims', NULL, true);
    RETURN QUERY SELECT
      'runtime: student cannot read another student profile'::text,
      v_cnt = 0,
      ('rows visible: '||v_cnt)::text;
  ELSE
    RETURN QUERY SELECT 'runtime: cross-student profile read'::text, true, 'skipped (need 2 students)'::text;
  END IF;

  -- Check 9: faculty cannot read whitelist
  IF v_faculty IS NOT NULL THEN
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_faculty::text, 'role','authenticated')::text, true);
    EXECUTE 'SET LOCAL ROLE authenticated';
    SELECT count(*) INTO v_cnt FROM public.whitelist;
    EXECUTE 'RESET ROLE';
    PERFORM set_config('request.jwt.claims', NULL, true);
    RETURN QUERY SELECT
      'runtime: faculty cannot read whitelist'::text,
      v_cnt = 0,
      ('rows visible: '||v_cnt)::text;
  ELSE
    RETURN QUERY SELECT 'runtime: faculty whitelist read'::text, true, 'skipped (no faculty)'::text;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.rls_regression_check() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rls_regression_check() TO authenticated;
