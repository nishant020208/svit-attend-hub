
-- =========================================================
-- 1. Storage: HOMEWORK (bucket already switched to private)
-- =========================================================
DROP POLICY IF EXISTS "Anyone can view homework files" ON storage.objects;
DROP POLICY IF EXISTS "Students can upload homework files" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own homework files" ON storage.objects;

CREATE POLICY "Homework: student read own, faculty/admin/teacher read all"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'homework' AND (
    public.has_role(auth.uid(), 'ADMIN'::app_role)
    OR public.has_role(auth.uid(), 'FACULTY'::app_role)
    OR (storage.foldername(name))[1] = auth.uid()::text
  )
);

CREATE POLICY "Homework: student uploads into own folder"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'homework'
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND EXISTS (SELECT 1 FROM public.students s WHERE s.user_id = auth.uid())
);

CREATE POLICY "Homework: student updates own files"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'homework'
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND EXISTS (
    SELECT 1 FROM public.homework_submissions hs
    JOIN public.students s ON s.id = hs.student_id
    WHERE s.user_id = auth.uid()
      AND hs.file_url IS NOT NULL
      AND position(storage.objects.name in hs.file_url) > 0
  )
);

CREATE POLICY "Homework: student deletes own files"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'homework'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- =========================================================
-- 2. Storage: LEAVE ATTACHMENTS
-- =========================================================
DROP POLICY IF EXISTS "Authenticated users view leave attachments" ON storage.objects;
DROP POLICY IF EXISTS "Students upload leave attachments" ON storage.objects;

CREATE POLICY "Leave: owner/faculty/admin can view"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'leave-attachments' AND (
    public.has_role(auth.uid(), 'ADMIN'::app_role)
    OR public.has_role(auth.uid(), 'FACULTY'::app_role)
    OR (storage.foldername(name))[1] = auth.uid()::text
  )
);

CREATE POLICY "Leave: student uploads into own folder"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'leave-attachments'
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND EXISTS (SELECT 1 FROM public.students s WHERE s.user_id = auth.uid())
);

CREATE POLICY "Leave: owner updates own files"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'leave-attachments'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Leave: owner/admin deletes"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'leave-attachments' AND (
    public.has_role(auth.uid(), 'ADMIN'::app_role)
    OR (storage.foldername(name))[1] = auth.uid()::text
  )
);

-- =========================================================
-- 3. Storage: ANNOUNCEMENTS - tighten SELECT to targeted audience
-- =========================================================
DROP POLICY IF EXISTS "Authenticated users view announcement files" ON storage.objects;

CREATE POLICY "Announcements: view files if in target audience"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'announcements' AND (
    public.has_role(auth.uid(), 'ADMIN'::app_role)
    OR public.has_role(auth.uid(), 'FACULTY'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.announcements a
      WHERE a.attachment_url = storage.objects.name
        AND (
          a.target_type = 'all'
          OR (a.target_type = 'student'
              AND EXISTS (SELECT 1 FROM public.students s
                          WHERE s.id = a.target_student_id
                            AND s.user_id = auth.uid()))
        )
    )
  )
);

-- =========================================================
-- 4. SECURITY DEFINER function hardening
-- =========================================================
-- Trivial helper doesn't need elevated rights
ALTER FUNCTION public.update_updated_at() SECURITY INVOKER;

-- Revoke broad execute; only grant what the app / RLS truly needs
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role)      FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_user_role(uuid)           FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_list_whitelist(text)    FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.rls_regression_check()        FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user()             FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.whitelist_audit_trigger()     FROM PUBLIC, anon, authenticated;

-- has_role / get_user_role are referenced by RLS policies for signed-in users
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role)   TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_role(uuid)        TO authenticated;
-- Admin-only client RPCs (they self-guard internally)
GRANT EXECUTE ON FUNCTION public.admin_list_whitelist(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rls_regression_check()     TO authenticated;
