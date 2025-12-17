-- Allow students to mark their own attendance when scanning a teacher/admin QR code
-- (student must be marking attendance for their own student_id, and marked_by must be a FACULTY/ADMIN user)
CREATE POLICY "Students mark attendance via QR"
ON public.attendance
FOR INSERT
TO authenticated
WITH CHECK (
  student_id IN (
    SELECT students.id
    FROM public.students
    WHERE students.user_id = auth.uid()
  )
  AND (has_role(marked_by, 'FACULTY'::app_role) OR has_role(marked_by, 'ADMIN'::app_role))
  AND date = current_date
);
