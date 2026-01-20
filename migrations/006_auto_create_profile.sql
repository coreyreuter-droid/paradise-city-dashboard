-- ============================================================================
-- MIGRATION 006: Auto-Create Profile on User Signup
-- ============================================================================
--
-- Problem: When a user is created in Supabase Auth, they need a corresponding
-- row in the profiles table to access the admin panel. Previously this was
-- a manual step that was easy to forget.
--
-- Solution: A database trigger that automatically creates a profile row
-- with 'viewer' role whenever a new user is created in auth.users.
--
-- NOTE: The first admin user still needs to be manually upgraded to 
-- 'super_admin' in the profiles table. But after that, all users created
-- via the admin panel will automatically have profiles.
--
-- ============================================================================

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, role)
  VALUES (NEW.id, 'viewer')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists (safe to re-run)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger on auth.users table
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- Test by creating a user in Auth → Users, then check:
--   SELECT * FROM profiles;
-- You should see a new row with role = 'viewer'
-- ============================================================================
