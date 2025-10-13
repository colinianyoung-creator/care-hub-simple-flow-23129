-- Fix missing RLS policies for remaining tables (skip care_notes which is already secured)

-- Check and enable RLS for care_plans if not already done
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'care_plans' 
    AND policyname = 'Family members can view care plans'
  ) THEN
    ALTER TABLE public.care_plans ENABLE ROW LEVEL SECURITY;
    
    CREATE POLICY "Family members can view care plans" 
    ON public.care_plans 
    FOR SELECT 
    USING (is_member(auth.uid(), family_id));

    CREATE POLICY "Family admins can manage care plans" 
    ON public.care_plans 
    FOR ALL 
    USING (
      has_family_role(auth.uid(), family_id, 'family_admin') OR 
      has_family_role(auth.uid(), family_id, 'disabled_person')
    )
    WITH CHECK (
      (has_family_role(auth.uid(), family_id, 'family_admin') OR 
       has_family_role(auth.uid(), family_id, 'disabled_person')) AND 
      created_by = auth.uid()
    );
  END IF;
END $$;

-- Check and enable RLS for care_recipients if not already done
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'care_recipients' 
    AND policyname = 'Family members can view care recipients'
  ) THEN
    ALTER TABLE public.care_recipients ENABLE ROW LEVEL SECURITY;
    
    CREATE POLICY "Family members can view care recipients" 
    ON public.care_recipients 
    FOR SELECT 
    USING (is_member(auth.uid(), family_id));

    CREATE POLICY "Family admins can manage care recipients" 
    ON public.care_recipients 
    FOR ALL 
    USING (
      has_family_role(auth.uid(), family_id, 'family_admin') OR 
      has_family_role(auth.uid(), family_id, 'disabled_person')
    )
    WITH CHECK (
      has_family_role(auth.uid(), family_id, 'family_admin') OR 
      has_family_role(auth.uid(), family_id, 'disabled_person')
    );
  END IF;
END $$;

-- Check and enable RLS for tasks if not already done
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'tasks' 
    AND policyname = 'Family members can view tasks'
  ) THEN
    ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
    
    CREATE POLICY "Family members can view tasks" 
    ON public.tasks 
    FOR SELECT 
    USING (is_member(auth.uid(), family_id));

    CREATE POLICY "Family members can create tasks" 
    ON public.tasks 
    FOR INSERT 
    WITH CHECK (is_member(auth.uid(), family_id) AND created_by = auth.uid());

    CREATE POLICY "Creators and admins can update tasks" 
    ON public.tasks 
    FOR UPDATE 
    USING (
      (created_by = auth.uid()) OR 
      (assigned_to = auth.uid()) OR
      (has_family_role(auth.uid(), family_id, 'family_admin')) OR 
      (has_family_role(auth.uid(), family_id, 'disabled_person'))
    );

    CREATE POLICY "Creators and admins can delete tasks" 
    ON public.tasks 
    FOR DELETE 
    USING (
      (created_by = auth.uid()) OR 
      (has_family_role(auth.uid(), family_id, 'family_admin')) OR 
      (has_family_role(auth.uid(), family_id, 'disabled_person'))
    );
  END IF;
END $$;

-- Check and enable RLS for time_entries if not already done
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'time_entries' 
    AND policyname = 'Family members can view time entries'
  ) THEN
    ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;
    
    CREATE POLICY "Family members can view time entries" 
    ON public.time_entries 
    FOR SELECT 
    USING (is_member(auth.uid(), family_id));

    CREATE POLICY "Users can create their own time entries" 
    ON public.time_entries 
    FOR INSERT 
    WITH CHECK (is_member(auth.uid(), family_id) AND user_id = auth.uid());

    CREATE POLICY "Users and admins can update time entries" 
    ON public.time_entries 
    FOR UPDATE 
    USING (
      (user_id = auth.uid()) OR 
      (has_family_role(auth.uid(), family_id, 'family_admin')) OR 
      (has_family_role(auth.uid(), family_id, 'disabled_person'))
    );

    CREATE POLICY "Users and admins can delete time entries" 
    ON public.time_entries 
    FOR DELETE 
    USING (
      (user_id = auth.uid()) OR 
      (has_family_role(auth.uid(), family_id, 'family_admin')) OR 
      (has_family_role(auth.uid(), family_id, 'disabled_person'))
    );
  END IF;
END $$;