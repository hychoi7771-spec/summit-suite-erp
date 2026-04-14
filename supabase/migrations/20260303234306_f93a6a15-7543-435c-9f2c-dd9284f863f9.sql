
-- 1. User roles enum
CREATE TYPE public.app_role AS ENUM ('ceo', 'general_director', 'deputy_gm', 'md', 'designer', 'staff');
CREATE TYPE public.presence_status AS ENUM ('working', 'away', 'offline');
CREATE TYPE public.product_category AS ENUM ('의약외품', '뷰티', '건강기능식품');
CREATE TYPE public.product_stage AS ENUM ('Planning', 'R&D/Sampling', 'Design', 'Certification', 'Production', 'Launch');
CREATE TYPE public.task_status AS ENUM ('todo', 'in-progress', 'review', 'done');
CREATE TYPE public.task_priority AS ENUM ('low', 'medium', 'high', 'urgent');
CREATE TYPE public.expense_category AS ENUM ('샘플링', '마케팅', '일반', '출장', '장비');
CREATE TYPE public.expense_status AS ENUM ('Pending', 'Approved', 'Reimbursed', 'Rejected');

-- 2. Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  name TEXT NOT NULL,
  name_kr TEXT NOT NULL,
  avatar TEXT NOT NULL DEFAULT '',
  presence presence_status NOT NULL DEFAULT 'offline',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles viewable by authenticated users" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- 3. User roles table (separate for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Roles viewable by authenticated users" ON public.user_roles FOR SELECT TO authenticated USING (true);

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

-- Only CEO or General Director can manage roles
CREATE POLICY "Admins can insert roles" ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'ceo') OR public.has_role(auth.uid(), 'general_director'));
CREATE POLICY "Admins can delete roles" ON public.user_roles FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'ceo') OR public.has_role(auth.uid(), 'general_director'));

-- 4. Products table
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category product_category NOT NULL,
  stage product_stage NOT NULL DEFAULT 'Planning',
  assignee_id UUID REFERENCES public.profiles(id),
  progress INTEGER NOT NULL DEFAULT 0,
  deadline DATE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Products viewable by authenticated" ON public.products FOR SELECT TO authenticated USING (true);
CREATE POLICY "Products insertable by authenticated" ON public.products FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Products updatable by authenticated" ON public.products FOR UPDATE TO authenticated USING (true);

-- 5. Tasks table
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  status task_status NOT NULL DEFAULT 'todo',
  priority task_priority NOT NULL DEFAULT 'medium',
  assignee_id UUID REFERENCES public.profiles(id),
  due_date DATE,
  tags TEXT[] DEFAULT '{}',
  meeting_id UUID,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tasks viewable by authenticated" ON public.tasks FOR SELECT TO authenticated USING (true);
CREATE POLICY "Tasks insertable by authenticated" ON public.tasks FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Tasks updatable by authenticated" ON public.tasks FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Tasks deletable by authenticated" ON public.tasks FOR DELETE TO authenticated USING (true);

-- 6. Meetings table
CREATE TABLE public.meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  attendee_ids UUID[] DEFAULT '{}',
  category TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Meetings viewable by authenticated" ON public.meetings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Meetings insertable by authenticated" ON public.meetings FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Meetings updatable by authenticated" ON public.meetings FOR UPDATE TO authenticated USING (true);

-- 7. Expenses table
CREATE TABLE public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount INTEGER NOT NULL,
  category expense_category NOT NULL,
  description TEXT,
  submitted_by UUID REFERENCES public.profiles(id) NOT NULL,
  status expense_status NOT NULL DEFAULT 'Pending',
  receipt_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Expenses viewable by authenticated" ON public.expenses FOR SELECT TO authenticated USING (true);
CREATE POLICY "Expenses insertable by authenticated" ON public.expenses FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Expenses updatable by admins" ON public.expenses FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'ceo') OR public.has_role(auth.uid(), 'general_director') OR submitted_by = (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

-- 8. Sales data table
CREATE TABLE public.sales_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform TEXT NOT NULL,
  month TEXT NOT NULL,
  revenue INTEGER NOT NULL DEFAULT 0,
  target INTEGER NOT NULL DEFAULT 0,
  roas NUMERIC(4,1) NOT NULL DEFAULT 0,
  orders INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.sales_data ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Sales viewable by authenticated" ON public.sales_data FOR SELECT TO authenticated USING (true);
CREATE POLICY "Sales insertable by authenticated" ON public.sales_data FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Sales updatable by authenticated" ON public.sales_data FOR UPDATE TO authenticated USING (true);

-- 9. Daily logs table
CREATE TABLE public.daily_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  today_work TEXT NOT NULL DEFAULT '',
  tomorrow_plan TEXT NOT NULL DEFAULT '',
  blockers TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.daily_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Logs viewable by authenticated" ON public.daily_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users insert own logs" ON public.daily_logs FOR INSERT TO authenticated WITH CHECK (user_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid()));
CREATE POLICY "Users update own logs" ON public.daily_logs FOR UPDATE TO authenticated USING (user_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

-- 10. Asset files table
CREATE TABLE public.asset_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  category TEXT NOT NULL,
  uploaded_by UUID REFERENCES public.profiles(id) NOT NULL,
  size TEXT,
  url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.asset_files ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Assets viewable by authenticated" ON public.asset_files FOR SELECT TO authenticated USING (true);
CREATE POLICY "Assets insertable by authenticated" ON public.asset_files FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Assets deletable by admins" ON public.asset_files FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'ceo') OR public.has_role(auth.uid(), 'general_director'));

-- 11. Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Apply triggers
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_meetings_updated_at BEFORE UPDATE ON public.meetings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON public.expenses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_daily_logs_updated_at BEFORE UPDATE ON public.daily_logs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 12. Auto-create profile on signup trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, name, name_kr, avatar)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'name_kr', ''),
    COALESCE(LEFT(UPPER(NEW.raw_user_meta_data->>'name'), 2), LEFT(UPPER(NEW.email), 2))
  );
  -- Default role: staff
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'staff');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 13. Admin delete profiles policy
CREATE POLICY "Admins can delete profiles" ON public.profiles FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'ceo') OR public.has_role(auth.uid(), 'general_director'));
