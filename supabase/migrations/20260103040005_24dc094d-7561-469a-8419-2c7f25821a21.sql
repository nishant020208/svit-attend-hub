-- Add RLS policy for parents to view their children's attendance
CREATE POLICY "Parents view children attendance"
ON public.attendance
FOR SELECT
TO authenticated
USING (
  student_id IN (
    SELECT student_id 
    FROM public.parent_student_relation 
    WHERE parent_id = auth.uid()
  )
);

-- Add RLS policy for parents to view their children's results
CREATE POLICY "Parents view children results"
ON public.results
FOR SELECT
TO authenticated
USING (
  student_id IN (
    SELECT student_id 
    FROM public.parent_student_relation 
    WHERE parent_id = auth.uid()
  )
);

-- Add RLS policy for parents to view their children's student record
CREATE POLICY "Parents view children student data"
ON public.students
FOR SELECT
TO authenticated
USING (
  id IN (
    SELECT student_id 
    FROM public.parent_student_relation 
    WHERE parent_id = auth.uid()
  )
);

-- Add RLS policy for parents to view their children's leave requests
CREATE POLICY "Parents view children leave requests"
ON public.leave_requests
FOR SELECT
TO authenticated
USING (
  student_id IN (
    SELECT student_id 
    FROM public.parent_student_relation 
    WHERE parent_id = auth.uid()
  )
);