-- Update handle_new_user function to include LIBRARIAN role
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
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
  
  -- Validate role is a valid app_role enum value (including LIBRARIAN)
  IF whitelist_entry.role NOT IN ('STUDENT', 'FACULTY', 'PARENT', 'ADMIN', 'LIBRARIAN') THEN
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