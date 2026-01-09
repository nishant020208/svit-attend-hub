-- Ensure the default admin email is allowed to sign up
INSERT INTO public.whitelist (email, name, role)
SELECT 'admin@svit.ac.in', 'SVIT Admin', 'ADMIN'::public.app_role
WHERE NOT EXISTS (
  SELECT 1 FROM public.whitelist w WHERE lower(w.email) = lower('admin@svit.ac.in')
);

-- If the admin user already exists (profile created earlier), ensure they have ADMIN in user_roles
INSERT INTO public.user_roles (user_id, role)
SELECT p.id, 'ADMIN'::public.app_role
FROM public.profiles p
WHERE lower(p.email) = lower('admin@svit.ac.in')
  AND NOT EXISTS (
    SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.id AND ur.role = 'ADMIN'::public.app_role
  );
