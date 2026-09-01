CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, name, name_kr, avatar, hire_date)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'name_kr', ''),
    COALESCE(LEFT(UPPER(NEW.raw_user_meta_data->>'name'), 2), LEFT(UPPER(NEW.email), 2)),
    CURRENT_DATE
  );
  -- Default role: staff
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'staff');
  RETURN NEW;
END;
$$;