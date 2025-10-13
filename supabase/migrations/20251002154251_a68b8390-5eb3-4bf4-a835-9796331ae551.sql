-- Create diet_entries table
CREATE TABLE public.diet_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  family_id uuid NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  care_recipient_id uuid REFERENCES public.care_recipients(id) ON DELETE SET NULL,
  meal_type text NOT NULL CHECK (meal_type IN ('breakfast','lunch','dinner','snacks','drinks')),
  description text NOT NULL,
  portion_left text CHECK (portion_left IN ('all','most','some','none')),
  notes text,
  photo_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on diet_entries
ALTER TABLE public.diet_entries ENABLE ROW LEVEL SECURITY;

-- RLS Policies for diet_entries
CREATE POLICY "Family members can view diet entries"
ON public.diet_entries FOR SELECT
USING (is_member(auth.uid(), family_id));

CREATE POLICY "Family members can create diet entries"
ON public.diet_entries FOR INSERT
WITH CHECK (is_member(auth.uid(), family_id) AND user_id = auth.uid());

CREATE POLICY "Authors and admins can update diet entries"
ON public.diet_entries FOR UPDATE
USING (
  user_id = auth.uid() OR 
  has_family_role(auth.uid(), family_id, 'family_admin') OR 
  has_family_role(auth.uid(), family_id, 'disabled_person')
);

CREATE POLICY "Authors and admins can delete diet entries"
ON public.diet_entries FOR DELETE
USING (
  user_id = auth.uid() OR 
  has_family_role(auth.uid(), family_id, 'family_admin') OR 
  has_family_role(auth.uid(), family_id, 'disabled_person')
);

-- Create trigger for updated_at
CREATE TRIGGER update_diet_entries_updated_at
BEFORE UPDATE ON public.diet_entries
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create money_entries table
CREATE TABLE public.money_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  family_id uuid NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  care_recipient_id uuid REFERENCES public.care_recipients(id) ON DELETE SET NULL,
  description text NOT NULL,
  amount numeric(10,2) NOT NULL,
  paid_by uuid NOT NULL REFERENCES public.profiles(id),
  notes text,
  photo_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on money_entries
ALTER TABLE public.money_entries ENABLE ROW LEVEL SECURITY;

-- RLS Policies for money_entries
CREATE POLICY "Family members can view money entries"
ON public.money_entries FOR SELECT
USING (is_member(auth.uid(), family_id));

CREATE POLICY "Family members can create money entries"
ON public.money_entries FOR INSERT
WITH CHECK (is_member(auth.uid(), family_id) AND user_id = auth.uid());

CREATE POLICY "Authors and admins can update money entries"
ON public.money_entries FOR UPDATE
USING (
  user_id = auth.uid() OR 
  has_family_role(auth.uid(), family_id, 'family_admin') OR 
  has_family_role(auth.uid(), family_id, 'disabled_person')
);

CREATE POLICY "Authors and admins can delete money entries"
ON public.money_entries FOR DELETE
USING (
  user_id = auth.uid() OR 
  has_family_role(auth.uid(), family_id, 'family_admin') OR 
  has_family_role(auth.uid(), family_id, 'disabled_person')
);

-- Create trigger for updated_at
CREATE TRIGGER update_money_entries_updated_at
BEFORE UPDATE ON public.money_entries
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Extend care_notes with photo support
ALTER TABLE public.care_notes ADD COLUMN photo_url text;

-- Extend profiles with profile picture
ALTER TABLE public.profiles ADD COLUMN profile_picture_url text;

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public) 
VALUES 
  ('profile_pictures', 'profile_pictures', true),
  ('diet_photos', 'diet_photos', false),
  ('money_receipts', 'money_receipts', false),
  ('care_photos', 'care_photos', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for profile_pictures (public bucket)
CREATE POLICY "Anyone can view profile pictures"
ON storage.objects FOR SELECT
USING (bucket_id = 'profile_pictures');

CREATE POLICY "Authenticated users can upload profile pictures"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'profile_pictures' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own profile pictures"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'profile_pictures'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own profile pictures"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'profile_pictures'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Storage policies for diet_photos
CREATE POLICY "Diet photos upload by authenticated"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'diet_photos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Diet photos visible to family"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'diet_photos'
  AND EXISTS (
    SELECT 1 FROM public.user_memberships um1
    JOIN public.user_memberships um2 ON um1.family_id = um2.family_id
    WHERE um1.user_id = auth.uid()
      AND um2.user_id::text = (storage.foldername(name))[1]
  )
);

CREATE POLICY "Only uploader can delete diet photos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'diet_photos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Storage policies for money_receipts
CREATE POLICY "Money receipts upload by authenticated"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'money_receipts' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Money receipts visible to family"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'money_receipts'
  AND EXISTS (
    SELECT 1 FROM public.user_memberships um1
    JOIN public.user_memberships um2 ON um1.family_id = um2.family_id
    WHERE um1.user_id = auth.uid()
      AND um2.user_id::text = (storage.foldername(name))[1]
  )
);

CREATE POLICY "Only uploader can delete money receipts"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'money_receipts'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Storage policies for care_photos
CREATE POLICY "Care photos upload by authenticated"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'care_photos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Care photos visible to family"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'care_photos'
  AND EXISTS (
    SELECT 1 FROM public.user_memberships um1
    JOIN public.user_memberships um2 ON um1.family_id = um2.family_id
    WHERE um1.user_id = auth.uid()
      AND um2.user_id::text = (storage.foldername(name))[1]
  )
);

CREATE POLICY "Only uploader can delete care photos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'care_photos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);