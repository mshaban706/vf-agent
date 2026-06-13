-- Migration 004: add ON DELETE rules to profile FKs so deleting a user
-- (auth.users → profiles cascade) no longer fails with FK violations.
-- Idempotent — safe to run multiple times.

DO $$
DECLARE r RECORD;
BEGIN
  -- drop and recreate each profile-referencing FK with the right delete rule
  FOR r IN
    SELECT tc.table_name, tc.constraint_name, kcu.column_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage ccu
      ON tc.constraint_name = ccu.constraint_name AND tc.table_schema = ccu.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_schema = 'public'
      AND ccu.table_schema = 'public'
      AND ccu.table_name = 'profiles'
      AND tc.table_name IN ('tasks', 'approvals', 'files', 'reports', 'automations')
  LOOP
    EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT %I', r.table_name, r.constraint_name);

    IF (r.table_name = 'tasks' AND r.column_name = 'created_by')
       OR (r.table_name = 'approvals' AND r.column_name = 'requested_by')
       OR (r.table_name = 'reports' AND r.column_name = 'created_by')
       OR (r.table_name = 'automations' AND r.column_name = 'created_by') THEN
      EXECUTE format(
        'ALTER TABLE public.%I ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES public.profiles(id) ON DELETE CASCADE',
        r.table_name, r.constraint_name, r.column_name
      );
    ELSE
      -- reviewed_by, uploaded_by and similar audit columns: keep the row, null the user
      EXECUTE format(
        'ALTER TABLE public.%I ALTER COLUMN %I DROP NOT NULL',
        r.table_name, r.column_name
      );
      EXECUTE format(
        'ALTER TABLE public.%I ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES public.profiles(id) ON DELETE SET NULL',
        r.table_name, r.constraint_name, r.column_name
      );
    END IF;
  END LOOP;
END $$;

SELECT pg_notify('pgrst', 'reload schema');
