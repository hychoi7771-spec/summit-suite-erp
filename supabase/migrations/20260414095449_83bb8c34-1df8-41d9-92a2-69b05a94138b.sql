
-- Insert profile for admin user
INSERT INTO public.profiles (user_id, name, name_kr, avatar)
VALUES ('a707d698-0ac0-4196-bfc6-38d6ed84f3f7', 'Admin', '관리자', 'AD')
ON CONFLICT (user_id) DO NOTHING;

-- Insert role for admin user
INSERT INTO public.user_roles (user_id, role)
VALUES ('a707d698-0ac0-4196-bfc6-38d6ed84f3f7', 'general_director')
ON CONFLICT (user_id, role) DO NOTHING;

-- Recreate trigger to ensure it works for future users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
