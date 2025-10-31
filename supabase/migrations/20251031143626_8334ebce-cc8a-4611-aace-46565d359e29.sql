-- Create a security definer function to check user roles (bypasses RLS)
CREATE OR REPLACE FUNCTION public.get_user_role(user_id uuid)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = user_id;
$$;

-- Drop ALL existing policies on profiles
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins and Faculty can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- Recreate profiles policies without recursion
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Admins and Faculty view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (public.get_user_role(auth.uid()) IN ('ADMIN', 'FACULTY'));

CREATE POLICY "Users update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Fix whitelist policies
DROP POLICY IF EXISTS "Admins can view all whitelist entries" ON public.whitelist;
DROP POLICY IF EXISTS "Admins can insert whitelist entries" ON public.whitelist;
DROP POLICY IF EXISTS "Admins can delete whitelist entries" ON public.whitelist;

CREATE POLICY "Admin view whitelist"
  ON public.whitelist FOR SELECT
  TO authenticated
  USING (public.get_user_role(auth.uid()) = 'ADMIN');

CREATE POLICY "Admin insert whitelist"
  ON public.whitelist FOR INSERT
  TO authenticated
  WITH CHECK (public.get_user_role(auth.uid()) = 'ADMIN');

CREATE POLICY "Admin delete whitelist"
  ON public.whitelist FOR DELETE
  TO authenticated
  USING (public.get_user_role(auth.uid()) = 'ADMIN');

-- Fix students policies
DROP POLICY IF EXISTS "Students can view their own data" ON public.students;
DROP POLICY IF EXISTS "Admins and Faculty can view all students" ON public.students;
DROP POLICY IF EXISTS "Admins can insert students" ON public.students;
DROP POLICY IF EXISTS "Admins can update students" ON public.students;

CREATE POLICY "Student view own data"
  ON public.students FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admin Faculty view students"
  ON public.students FOR SELECT
  TO authenticated
  USING (public.get_user_role(auth.uid()) IN ('ADMIN', 'FACULTY'));

CREATE POLICY "Admin insert students"
  ON public.students FOR INSERT
  TO authenticated
  WITH CHECK (public.get_user_role(auth.uid()) = 'ADMIN');

CREATE POLICY "Admin update students"
  ON public.students FOR UPDATE
  TO authenticated
  USING (public.get_user_role(auth.uid()) = 'ADMIN');

-- Fix attendance policies
DROP POLICY IF EXISTS "Students can view their own attendance" ON public.attendance;
DROP POLICY IF EXISTS "Faculty and Admins can view all attendance" ON public.attendance;
DROP POLICY IF EXISTS "Faculty can mark attendance" ON public.attendance;
DROP POLICY IF EXISTS "Faculty can update attendance" ON public.attendance;

CREATE POLICY "Student view own attendance"
  ON public.attendance FOR SELECT
  TO authenticated
  USING (student_id IN (SELECT id FROM students WHERE user_id = auth.uid()));

CREATE POLICY "Admin Faculty view attendance"
  ON public.attendance FOR SELECT
  TO authenticated
  USING (public.get_user_role(auth.uid()) IN ('ADMIN', 'FACULTY'));

CREATE POLICY "Faculty mark attendance"
  ON public.attendance FOR INSERT
  TO authenticated
  WITH CHECK (public.get_user_role(auth.uid()) = 'FACULTY');

CREATE POLICY "Faculty update attendance"
  ON public.attendance FOR UPDATE
  TO authenticated
  USING (marked_by = auth.uid())
  WITH CHECK (marked_by = auth.uid());

-- Fix timetable policies
DROP POLICY IF EXISTS "Everyone can view timetable" ON public.timetable;
DROP POLICY IF EXISTS "Admins and Faculty can manage timetable" ON public.timetable;

CREATE POLICY "Everyone view timetable"
  ON public.timetable FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin Faculty manage timetable"
  ON public.timetable FOR ALL
  TO authenticated
  USING (public.get_user_role(auth.uid()) IN ('ADMIN', 'FACULTY'))
  WITH CHECK (public.get_user_role(auth.uid()) IN ('ADMIN', 'FACULTY'));

-- Fix announcements policies
DROP POLICY IF EXISTS "Everyone can view announcements" ON public.announcements;
DROP POLICY IF EXISTS "Admins can create announcements" ON public.announcements;
DROP POLICY IF EXISTS "Admins can update announcements" ON public.announcements;
DROP POLICY IF EXISTS "Admins can delete announcements" ON public.announcements;

CREATE POLICY "Everyone view announcements"
  ON public.announcements FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin create announcements"
  ON public.announcements FOR INSERT
  TO authenticated
  WITH CHECK (public.get_user_role(auth.uid()) = 'ADMIN');

CREATE POLICY "Admin update announcements"
  ON public.announcements FOR UPDATE
  TO authenticated
  USING (public.get_user_role(auth.uid()) = 'ADMIN');

CREATE POLICY "Admin delete announcements"
  ON public.announcements FOR DELETE
  TO authenticated
  USING (public.get_user_role(auth.uid()) = 'ADMIN');