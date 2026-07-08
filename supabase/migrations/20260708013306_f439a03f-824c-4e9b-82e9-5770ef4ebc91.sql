
-- 1) sales_channels: manager-only writes
DROP POLICY IF EXISTS "channels manageable by authenticated" ON public.sales_channels;
CREATE POLICY "channels manageable by managers" ON public.sales_channels
  FOR ALL TO authenticated
  USING (
    has_role(auth.uid(), 'ceo'::app_role)
    OR has_role(auth.uid(), 'general_director'::app_role)
    OR has_role(auth.uid(), 'deputy_gm'::app_role)
  )
  WITH CHECK (
    has_role(auth.uid(), 'ceo'::app_role)
    OR has_role(auth.uid(), 'general_director'::app_role)
    OR has_role(auth.uid(), 'deputy_gm'::app_role)
  );

-- 2) leave_balances: strip self write access
DROP POLICY IF EXISTS "Leave balances insertable by manager" ON public.leave_balances;
CREATE POLICY "Leave balances insertable by manager" ON public.leave_balances
  FOR INSERT TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'ceo'::app_role)
    OR has_role(auth.uid(), 'general_director'::app_role)
    OR has_role(auth.uid(), 'managing_director'::app_role)
    OR has_role(auth.uid(), 'deputy_gm'::app_role)
  );

DROP POLICY IF EXISTS "Leave balances updatable by manager or self" ON public.leave_balances;
CREATE POLICY "Leave balances updatable by manager" ON public.leave_balances
  FOR UPDATE TO authenticated
  USING (
    has_role(auth.uid(), 'ceo'::app_role)
    OR has_role(auth.uid(), 'general_director'::app_role)
    OR has_role(auth.uid(), 'managing_director'::app_role)
    OR has_role(auth.uid(), 'deputy_gm'::app_role)
  )
  WITH CHECK (
    has_role(auth.uid(), 'ceo'::app_role)
    OR has_role(auth.uid(), 'general_director'::app_role)
    OR has_role(auth.uid(), 'managing_director'::app_role)
    OR has_role(auth.uid(), 'deputy_gm'::app_role)
  );

-- 3) calculate_leave_grant: caller role check + clamp _today to <= today
CREATE OR REPLACE FUNCTION public.calculate_leave_grant(_profile_id uuid, _today date DEFAULT CURRENT_DATE)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_hire_date DATE;
  v_year INT;
  v_months_worked INT;
  v_anniv_date DATE;
  v_monthly_grant INT := 0;
  v_annual_grant NUMERIC := 0;
  v_next_grant DATE;
  v_used NUMERIC := 0;
  v_monthly_used NUMERIC := 0;
  v_existing_monthly_total NUMERIC := 0;
  v_carryover NUMERIC := 0;
  v_final_monthly_total NUMERIC := 0;
BEGIN
  -- AuthZ: only managers may recompute leave grants
  IF auth.uid() IS NOT NULL AND NOT (
       has_role(auth.uid(), 'ceo'::app_role)
    OR has_role(auth.uid(), 'general_director'::app_role)
    OR has_role(auth.uid(), 'managing_director'::app_role)
    OR has_role(auth.uid(), 'deputy_gm'::app_role)
  ) THEN
    RAISE EXCEPTION 'Permission denied: manager role required'
      USING ERRCODE = '42501';
  END IF;

  -- Prevent future-dated abuse: cap the effective date at today
  IF _today IS NULL OR _today > CURRENT_DATE THEN
    _today := CURRENT_DATE;
  END IF;
  v_year := EXTRACT(YEAR FROM _today)::INT;

  SELECT hire_date INTO v_hire_date FROM public.profiles WHERE id = _profile_id;
  IF v_hire_date IS NULL THEN RETURN; END IF;

  SELECT COALESCE(SUM(days), 0) INTO v_used
    FROM public.leave_requests
   WHERE user_id = _profile_id AND status = 'approved'
     AND leave_type IN ('annual', 'half_day', 'sick')
     AND EXTRACT(YEAR FROM start_date) = v_year;

  SELECT COALESCE(SUM(days), 0) INTO v_monthly_used
    FROM public.leave_requests
   WHERE user_id = _profile_id AND status = 'approved'
     AND leave_type = 'monthly'
     AND EXTRACT(YEAR FROM start_date) = v_year;

  SELECT COALESCE(monthly_total_days, 0) INTO v_existing_monthly_total
    FROM public.leave_balances WHERE user_id = _profile_id AND year = v_year;

  v_anniv_date := (v_hire_date + INTERVAL '1 year')::DATE;

  IF _today < v_anniv_date THEN
    v_months_worked := EXTRACT(YEAR FROM age(_today, v_hire_date)) * 12
                     + EXTRACT(MONTH FROM age(_today, v_hire_date));
    v_monthly_grant := LEAST(GREATEST(v_months_worked, 0), 11);
    v_annual_grant := 0;
    v_final_monthly_total := v_monthly_grant;
    v_next_grant := (v_hire_date + ((v_monthly_grant + 1) || ' months')::INTERVAL)::DATE;
    IF v_next_grant > v_anniv_date THEN v_next_grant := v_anniv_date; END IF;
  ELSE
    v_carryover := GREATEST(0, v_existing_monthly_total - v_monthly_used);
    v_annual_grant := 15 + v_carryover;
    v_final_monthly_total := v_monthly_used;
    v_next_grant := (v_hire_date + ((EXTRACT(YEAR FROM age(_today, v_hire_date))::INT + 1) || ' years')::INTERVAL)::DATE;
  END IF;

  INSERT INTO public.leave_balances (user_id, year, total_days, used_days, monthly_total_days, monthly_used_days, next_grant_date)
  VALUES (_profile_id, v_year, v_annual_grant, v_used, v_final_monthly_total, v_monthly_used, v_next_grant)
  ON CONFLICT (user_id, year) DO UPDATE
    SET total_days = EXCLUDED.total_days,
        monthly_total_days = EXCLUDED.monthly_total_days,
        next_grant_date = EXCLUDED.next_grant_date,
        used_days = EXCLUDED.used_days,
        monthly_used_days = EXCLUDED.monthly_used_days,
        updated_at = now();
END;
$function$;

-- 4) send_notifications: length/target caps + auto-attribution for non-managers
CREATE OR REPLACE FUNCTION public.send_notifications(
  _user_ids uuid[],
  _title text,
  _message text,
  _type text DEFAULT 'general'::text,
  _related_id uuid DEFAULT NULL::uuid
)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_caller_name TEXT;
  v_is_manager BOOLEAN;
  v_final_title TEXT;
  v_final_message TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  IF _user_ids IS NULL OR array_length(_user_ids, 1) IS NULL THEN
    RETURN;
  END IF;

  -- Input hardening: reject clearly abusive payloads
  IF _title IS NULL OR length(_title) = 0 THEN
    RAISE EXCEPTION 'Title required';
  END IF;
  IF length(_title) > 200 THEN
    RAISE EXCEPTION 'Title too long (max 200)';
  END IF;
  IF _message IS NOT NULL AND length(_message) > 2000 THEN
    RAISE EXCEPTION 'Message too long (max 2000)';
  END IF;
  IF array_length(_user_ids, 1) > 500 THEN
    RAISE EXCEPTION 'Too many recipients (max 500)';
  END IF;

  v_is_manager := (
       has_role(auth.uid(), 'ceo'::app_role)
    OR has_role(auth.uid(), 'general_director'::app_role)
    OR has_role(auth.uid(), 'managing_director'::app_role)
    OR has_role(auth.uid(), 'deputy_gm'::app_role)
  );

  v_final_title := _title;
  v_final_message := COALESCE(_message, '');

  -- For non-managers, append actual sender name to prevent spoofing
  IF NOT v_is_manager THEN
    SELECT COALESCE(name_kr, name) INTO v_caller_name
      FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;
    IF v_caller_name IS NOT NULL THEN
      v_final_message := v_final_message ||
        CASE WHEN length(v_final_message) > 0 THEN E'\n' ELSE '' END ||
        '— ' || v_caller_name;
    END IF;
  END IF;

  INSERT INTO public.notifications (user_id, type, title, message, related_id)
  SELECT u, _type, v_final_title, v_final_message, _related_id
  FROM unnest(_user_ids) AS u
  WHERE u IS NOT NULL;
END;
$function$;

-- 5) Document notifications.user_id semantics (matches auth.uid, not profiles.id)
COMMENT ON COLUMN public.notifications.user_id IS
  'auth.users.id (auth.uid()) — RLS compares directly to auth.uid(). Callers must resolve profile_id -> profiles.user_id before inserting.';
