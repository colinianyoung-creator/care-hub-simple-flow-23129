-- Add foreign key relationship between time_entries and profiles
ALTER TABLE public.time_entries 
ADD CONSTRAINT fk_time_entries_user_id 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;