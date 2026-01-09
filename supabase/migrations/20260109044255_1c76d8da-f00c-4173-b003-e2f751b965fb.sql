-- Ensure the existing auth user for admin@svit.ac.in has an ADMIN role.
-- (User id sourced from auth logs: 546e9950-dfd2-4ea4-a638-0eea0da67b8f)

INSERT INTO public.profiles (id, email, name, role)
SELECT
  '546e9950-dfd2-4ea4-a638-0eea0da67b8f'::uuid,
  'admin@svit.ac.in',
  'SVIT Admin',
  'ADMIN'::public.app_role
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles p
  WHERE p.id = '546e9950-dfd2-4ea4-a638-0eea0da67b8f'::uuid
);

INSERT INTO public.user_roles (user_id, role)
SELECT
  '546e9950-dfd2-4ea4-a638-0eea0da67b8f'::uuid,
  'ADMIN'::public.app_role
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_roles ur
  WHERE ur.user_id = '546e9950-dfd2-4ea4-a638-0eea0da67b8f'::uuid
    AND ur.role = 'ADMIN'::public.app_role
);
