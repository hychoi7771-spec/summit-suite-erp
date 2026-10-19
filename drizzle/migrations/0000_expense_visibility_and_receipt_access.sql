ALTER TABLE public.expenses ADD COLUMN is_confidential boolean NOT NULL DEFAULT false, ADD COLUMN allowed_viewer_ids uuid[] NOT NULL DEFAULT '{}';
COMMENT ON COLUMN public.expenses.allowed_viewer_ids IS 'Profile IDs permitted to read a confidential expense; submitter and approval admins retain access.';
CREATE OR REPLACE FUNCTION public.can_read_expense(_confidential boolean, _submitter uuid, _viewers uuid[]) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
 SELECT auth.uid() IS NOT NULL AND (NOT _confidential OR public.has_role(auth.uid(), 'ceo') OR public.has_role(auth.uid(), 'general_director') OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = auth.uid() AND (p.id = _submitter OR p.id = ANY(_viewers))));
$$;
REVOKE ALL ON FUNCTION public.can_read_expense(boolean,uuid,uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_read_expense(boolean,uuid,uuid[]) TO authenticated;
DROP POLICY "Expenses viewable by authenticated" ON public.expenses;
CREATE POLICY "Expenses visible within selected audience" ON public.expenses FOR SELECT TO authenticated USING (public.can_read_expense(is_confidential, submitted_by, allowed_viewer_ids));
CREATE OR REPLACE FUNCTION public.protect_expense_visibility() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
 IF auth.uid() IS NOT NULL THEN
  IF NEW.submitted_by IS DISTINCT FROM OLD.submitted_by THEN RAISE EXCEPTION 'Expense ownership cannot be changed'; END IF;
  IF (NEW.is_confidential IS DISTINCT FROM OLD.is_confidential OR NEW.allowed_viewer_ids IS DISTINCT FROM OLD.allowed_viewer_ids) AND NOT (public.has_role(auth.uid(),'ceo') OR public.has_role(auth.uid(),'general_director') OR EXISTS(SELECT 1 FROM public.profiles WHERE id=OLD.submitted_by AND user_id=auth.uid())) THEN
   RAISE EXCEPTION 'Only the submitter or approval admins may change visibility';
  END IF;
 END IF;
 RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.protect_expense_visibility() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER protect_expense_visibility BEFORE UPDATE ON public.expenses FOR EACH ROW EXECUTE FUNCTION public.protect_expense_visibility();
CREATE OR REPLACE FUNCTION public.can_read_expense_receipt(_path text) RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE _linked boolean; _permitted boolean;
BEGIN
 IF auth.uid() IS NULL THEN RETURN false; END IF;
 SELECT count(*) > 0, bool_and(public.can_read_expense(e.is_confidential,e.submitted_by,e.allowed_viewer_ids)) INTO _linked,_permitted FROM public.expenses e
 WHERE e.receipt_url = _path OR split_part(split_part(e.receipt_url, '/receipts/', 2),'?',1) = _path;
 IF _linked THEN RETURN coalesce(_permitted,false); END IF;
 RETURN split_part(_path,'/',1) = auth.uid()::text OR (split_part(_path,'/',1)='expenses' AND split_part(_path,'/',2)=auth.uid()::text) OR split_part(_path,'/',1)='library' OR public.has_role(auth.uid(),'ceo') OR public.has_role(auth.uid(),'general_director') OR public.has_role(auth.uid(),'managing_director');
END;
$$;
REVOKE ALL ON FUNCTION public.can_read_expense_receipt(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_read_expense_receipt(text) TO authenticated;
DROP POLICY "Receipts readable by owner or admin" ON storage.objects;
CREATE POLICY "Receipts readable within expense audience" ON storage.objects FOR SELECT TO authenticated USING (bucket_id='receipts' AND public.can_read_expense_receipt(name));