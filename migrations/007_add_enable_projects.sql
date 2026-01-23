-- ============================================================================
-- MIGRATION 007: Add Capital Projects Feature
-- ============================================================================
--
-- Adds the complete Capital Projects module:
--   - enable_projects flag in portal_settings
--   - capital_projects table
--   - capital_project_images table
--   - RLS policies, indexes, and triggers
--   - Storage policies for branding and project-images buckets
--
-- Run on ALL customer databases where Projects feature is needed.
--
-- ALSO REQUIRED: Create storage buckets manually (see end of file)
-- ============================================================================


-- ============================================================================
-- 1. ADD FEATURE FLAG TO PORTAL_SETTINGS
-- ============================================================================

ALTER TABLE portal_settings 
ADD COLUMN IF NOT EXISTS enable_projects BOOLEAN NOT NULL DEFAULT false;


-- ============================================================================
-- 2. CAPITAL PROJECTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.capital_projects (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  city_slug TEXT NOT NULL DEFAULT 'portal',
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  short_description TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'in_progress', 'completed')),
  published BOOLEAN NOT NULL DEFAULT false,
  location_text TEXT,
  map_url TEXT,
  start_date DATE,
  estimated_completion_date DATE,
  actual_completion_date DATE,
  estimated_cost NUMERIC,
  funding_source TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  
  CONSTRAINT capital_projects_pkey PRIMARY KEY (id),
  CONSTRAINT capital_projects_slug_unique UNIQUE (city_slug, slug)
);

ALTER TABLE public.capital_projects ENABLE ROW LEVEL SECURITY;


-- ============================================================================
-- 3. CAPITAL PROJECT IMAGES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.capital_project_images (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL,
  city_slug TEXT NOT NULL DEFAULT 'portal',
  image_url TEXT NOT NULL,
  alt_text TEXT NOT NULL,
  caption TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  
  CONSTRAINT capital_project_images_pkey PRIMARY KEY (id),
  CONSTRAINT capital_project_images_project_fkey 
    FOREIGN KEY (project_id) REFERENCES public.capital_projects(id) ON DELETE CASCADE
);

ALTER TABLE public.capital_project_images ENABLE ROW LEVEL SECURITY;


-- ============================================================================
-- 4. INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_capital_projects_city_slug 
  ON public.capital_projects (city_slug);
CREATE INDEX IF NOT EXISTS idx_capital_projects_published 
  ON public.capital_projects (city_slug, published);
CREATE INDEX IF NOT EXISTS idx_capital_projects_status 
  ON public.capital_projects (city_slug, status);
CREATE INDEX IF NOT EXISTS idx_capital_projects_updated_at 
  ON public.capital_projects (updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_capital_project_images_project_id 
  ON public.capital_project_images (project_id);
CREATE INDEX IF NOT EXISTS idx_capital_project_images_sort_order 
  ON public.capital_project_images (project_id, sort_order);


-- ============================================================================
-- 5. UPDATED_AT TRIGGER
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = timezone('utc', now());
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_capital_projects_updated_at ON public.capital_projects;
CREATE TRIGGER trg_capital_projects_updated_at
  BEFORE UPDATE ON public.capital_projects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();


-- ============================================================================
-- 6. ROW LEVEL SECURITY POLICIES - TABLES
-- ============================================================================

-- Capital Projects: Public read when portal published AND project published
CREATE POLICY "Public read published projects when portal published"
  ON public.capital_projects FOR SELECT
  USING (
    is_portal_published() 
    AND published = true
  );

-- Capital Projects: Admins full access
CREATE POLICY "capital_projects_admins_rw"
  ON public.capital_projects FOR ALL
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role = ANY (ARRAY['admin', 'super_admin'])
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role = ANY (ARRAY['admin', 'super_admin'])
  ));

-- Project Images: Public read when portal published AND parent project published
CREATE POLICY "Public read images of published projects when portal published"
  ON public.capital_project_images FOR SELECT
  USING (
    is_portal_published()
    AND EXISTS (
      SELECT 1 FROM public.capital_projects cp
      WHERE cp.id = capital_project_images.project_id
        AND cp.published = true
    )
  );

-- Project Images: Admins full access
CREATE POLICY "capital_project_images_admins_rw"
  ON public.capital_project_images FOR ALL
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role = ANY (ARRAY['admin', 'super_admin'])
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role = ANY (ARRAY['admin', 'super_admin'])
  ));


-- ============================================================================
-- 7. STORAGE POLICIES - BRANDING BUCKET
-- ============================================================================
-- These were missing from the original schema.sql

-- Public can view branding images
CREATE POLICY "Public can view branding images"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'branding');

-- Admins can upload to branding bucket
CREATE POLICY "Admins can upload branding images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'branding' 
    AND EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = ANY (ARRAY['admin', 'super_admin'])
    )
  );

-- Admins can update branding images
CREATE POLICY "Admins can update branding images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'branding'
    AND EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = ANY (ARRAY['admin', 'super_admin'])
    )
  );

-- Admins can delete branding images
CREATE POLICY "Admins can delete branding images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'branding'
    AND EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = ANY (ARRAY['admin', 'super_admin'])
    )
  );


-- ============================================================================
-- 8. STORAGE POLICIES - PROJECT-IMAGES BUCKET
-- ============================================================================

-- Public can view project images
CREATE POLICY "Public can view project images"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'project-images');

-- Admins can upload to project-images bucket
CREATE POLICY "Admins can upload project images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'project-images' 
    AND EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = ANY (ARRAY['admin', 'super_admin'])
    )
  );

-- Admins can update project images
CREATE POLICY "Admins can update project images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'project-images'
    AND EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = ANY (ARRAY['admin', 'super_admin'])
    )
  );

-- Admins can delete project images
CREATE POLICY "Admins can delete project images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'project-images'
    AND EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = ANY (ARRAY['admin', 'super_admin'])
    )
  );


-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- Check column exists:
--   SELECT enable_projects FROM portal_settings WHERE id = 1;
--
-- Check tables exist:
--   SELECT tablename FROM pg_tables 
--     WHERE schemaname = 'public' 
--     AND tablename IN ('capital_projects', 'capital_project_images');
--
-- Check RLS enabled:
--   SELECT tablename, rowsecurity FROM pg_tables 
--     WHERE schemaname = 'public' 
--     AND tablename IN ('capital_projects', 'capital_project_images');
--
-- Check storage policies:
--   SELECT policyname, cmd FROM pg_policies 
--     WHERE tablename = 'objects' AND schemaname = 'storage';
-- ============================================================================


-- ============================================================================
-- STORAGE BUCKETS (Manual Step Required)
-- ============================================================================
-- 
-- Create these buckets in Supabase Dashboard → Storage:
--
-- 1. "branding" bucket (if not already created):
--    - Public: YES
--    - Allowed MIME types: image/png, image/jpeg, image/webp
--    - Max file size: 10MB
--    - DO NOT allow SVG
--
-- 2. "project-images" bucket:
--    - Public: YES
--    - Allowed MIME types: image/png, image/jpeg, image/webp
--    - Max file size: 10MB
--    - DO NOT allow SVG
--
-- ============================================================================
