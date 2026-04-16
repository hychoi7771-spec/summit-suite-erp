-- Enable realtime for cross-tab synchronization between tasks and daily_work_reports
ALTER TABLE public.tasks REPLICA IDENTITY FULL;
ALTER TABLE public.daily_work_reports REPLICA IDENTITY FULL;
ALTER TABLE public.daily_logs REPLICA IDENTITY FULL;

-- Add tables to the realtime publication (use DO block to avoid errors if already added)
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.daily_work_reports;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.daily_logs;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;