-- ============================================
-- CRITICAL SECURITY FIX: Implement Secure User Roles System
-- ============================================

-- Step 1: Create user_roles table (app_role enum already exists)
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  assigned_at timestamp with time zone NOT NULL DEFAULT now(),
  assigned_by uuid REFERENCES auth.users(id),
  UNIQUE(user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Step 2: Create SECURITY DEFINER function to check roles (bypasses RLS)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  );
$$;

-- Step 3: Update get_user_role() to use user_roles table
CREATE OR REPLACE FUNCTION public.get_user_role(user_id uuid)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role 
  FROM public.user_roles 
  WHERE user_roles.user_id = get_user_role.user_id
  LIMIT 1;
$$;

-- Step 4: Migrate existing roles from profiles to user_roles
INSERT INTO public.user_roles (user_id, role, assigned_at)
SELECT id, role, created_at
FROM public.profiles
ON CONFLICT (user_id, role) DO NOTHING;

-- Step 5: Create RLS policies for user_roles table
-- Users can view their own roles
CREATE POLICY "Users can view own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Admins can view all roles
CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'ADMIN'));

-- Admins can assign roles
CREATE POLICY "Admins can assign roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'ADMIN'));

-- Admins can update roles
CREATE POLICY "Admins can update roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'ADMIN'));

-- Admins can delete roles
CREATE POLICY "Admins can delete roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'ADMIN'));

-- Step 6: Update handle_new_user() to use user_roles and add validation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  whitelist_entry RECORD;
BEGIN
  -- Check if email is whitelisted
  SELECT * INTO whitelist_entry
  FROM public.whitelist
  WHERE email = NEW.email;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Email not whitelisted. Contact admin for access.';
  END IF;
  
  -- Validate role is a valid app_role enum value
  IF whitelist_entry.role NOT IN ('STUDENT', 'FACULTY', 'PARENT', 'ADMIN') THEN
    RAISE EXCEPTION 'Invalid role assignment attempt: %', whitelist_entry.role;
  END IF;
  
  -- Create profile (keep role for backwards compatibility but it's deprecated)
  INSERT INTO public.profiles (id, email, name, role)
  VALUES (NEW.id, NEW.email, whitelist_entry.name, whitelist_entry.role);
  
  -- Assign role in user_roles table (secure approach)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, whitelist_entry.role);
  
  -- Log the profile creation (audit trail)
  RAISE NOTICE 'Profile created for user % with role %', NEW.email, whitelist_entry.role;
  
  RETURN NEW;
END;
$function$;

-- Step 7: Update ALL RLS policies to use has_role() instead of get_user_role()
-- This ensures server-side role validation

-- Update announcements policies
DROP POLICY IF EXISTS "Admin create announcements" ON public.announcements;
CREATE POLICY "Admin create announcements"
ON public.announcements
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'ADMIN'));

DROP POLICY IF EXISTS "Admin update announcements" ON public.announcements;
CREATE POLICY "Admin update announcements"
ON public.announcements
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'ADMIN'));

DROP POLICY IF EXISTS "Admin delete announcements" ON public.announcements;
CREATE POLICY "Admin delete announcements"
ON public.announcements
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'ADMIN'));

-- Update attendance policies
DROP POLICY IF EXISTS "Admin Faculty view attendance" ON public.attendance;
CREATE POLICY "Admin Faculty view attendance"
ON public.attendance
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'ADMIN') OR public.has_role(auth.uid(), 'FACULTY'));

DROP POLICY IF EXISTS "Faculty mark attendance" ON public.attendance;
CREATE POLICY "Faculty mark attendance"
ON public.attendance
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'FACULTY'));

-- Update courses policies
DROP POLICY IF EXISTS "Admin can manage courses" ON public.courses;
CREATE POLICY "Admin can manage courses"
ON public.courses
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'ADMIN'))
WITH CHECK (public.has_role(auth.uid(), 'ADMIN'));

-- Update leave_requests policies
DROP POLICY IF EXISTS "Teachers and Admins can view all leave requests" ON public.leave_requests;
CREATE POLICY "Teachers and Admins can view all leave requests"
ON public.leave_requests
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'ADMIN') OR public.has_role(auth.uid(), 'FACULTY'));

DROP POLICY IF EXISTS "Teachers can update leave requests" ON public.leave_requests;
CREATE POLICY "Teachers can update leave requests"
ON public.leave_requests
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'ADMIN') OR public.has_role(auth.uid(), 'FACULTY'));

-- Update parent_student_relation policies
DROP POLICY IF EXISTS "Admins can manage parent relations" ON public.parent_student_relation;
CREATE POLICY "Admins can manage parent relations"
ON public.parent_student_relation
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'ADMIN'))
WITH CHECK (public.has_role(auth.uid(), 'ADMIN'));

-- Update profiles policies
DROP POLICY IF EXISTS "Admins and Faculty view all profiles" ON public.profiles;
CREATE POLICY "Admins and Faculty view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'ADMIN') OR public.has_role(auth.uid(), 'FACULTY'));

-- Update sections policies
DROP POLICY IF EXISTS "Admin can manage sections" ON public.sections;
CREATE POLICY "Admin can manage sections"
ON public.sections
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'ADMIN'))
WITH CHECK (public.has_role(auth.uid(), 'ADMIN'));

-- Update students policies
DROP POLICY IF EXISTS "Admin insert students" ON public.students;
CREATE POLICY "Admin insert students"
ON public.students
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'ADMIN'));

DROP POLICY IF EXISTS "Admin update students" ON public.students;
CREATE POLICY "Admin update students"
ON public.students
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'ADMIN'));

DROP POLICY IF EXISTS "Admin Faculty view students" ON public.students;
CREATE POLICY "Admin Faculty view students"
ON public.students
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'ADMIN') OR public.has_role(auth.uid(), 'FACULTY'));

-- Update timetable policies
DROP POLICY IF EXISTS "Admin Faculty manage timetable" ON public.timetable;
CREATE POLICY "Admin Faculty manage timetable"
ON public.timetable
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'ADMIN') OR public.has_role(auth.uid(), 'FACULTY'))
WITH CHECK (public.has_role(auth.uid(), 'ADMIN') OR public.has_role(auth.uid(), 'FACULTY'));

-- Update whitelist policies
DROP POLICY IF EXISTS "Admin view whitelist" ON public.whitelist;
CREATE POLICY "Admin view whitelist"
ON public.whitelist
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'ADMIN'));

DROP POLICY IF EXISTS "Admin insert whitelist" ON public.whitelist;
CREATE POLICY "Admin insert whitelist"
ON public.whitelist
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'ADMIN'));

DROP POLICY IF EXISTS "Admin delete whitelist" ON public.whitelist;
CREATE POLICY "Admin delete whitelist"
ON public.whitelist
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'ADMIN'));

-- Add explicit DENY policies for unauthenticated users on sensitive tables
CREATE POLICY "Deny unauthenticated access to profiles"
ON public.profiles
FOR ALL
TO anon
USING (false);

CREATE POLICY "Deny unauthenticated access to students"
ON public.students
FOR ALL
TO anon
USING (false);

CREATE POLICY "Deny unauthenticated access to whitelist"
ON public.whitelist
FOR ALL
TO anon
USING (false);

COMMENT ON TABLE public.user_roles IS 'Secure storage for user roles. Use has_role() function in RLS policies.';
COMMENT ON FUNCTION public.has_role IS 'Security definer function to check user roles, bypasses RLS to prevent recursion.';
COMMENT ON COLUMN public.profiles.role IS 'DEPRECATED: Use user_roles table instead. Kept for backwards compatibility only.';