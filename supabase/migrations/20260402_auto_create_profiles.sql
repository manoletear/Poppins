-- Auto-create user_profiles when a new auth.users row is inserted
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_profiles (
    auth_user_id, email, nombre, apellido, rol, avatar_url, onboarding_completado
  ) VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'nombre', split_part(COALESCE(NEW.email, ''), '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'apellido', ''),
    COALESCE(NEW.raw_user_meta_data->>'rol', 'empleador'),
    NEW.raw_user_meta_data->>'avatar_url',
    false
  )
  ON CONFLICT (auth_user_id) DO UPDATE SET
    email = EXCLUDED.email,
    nombre = COALESCE(NULLIF(EXCLUDED.nombre, ''), user_profiles.nombre),
    avatar_url = COALESCE(EXCLUDED.avatar_url, user_profiles.avatar_url),
    updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE OF raw_user_meta_data, email ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Auto-link worker by email: when user_profiles is created/updated
CREATE OR REPLACE FUNCTION public.auto_link_worker_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_trabajador_id UUID;
BEGIN
  IF NEW.trabajador_id IS NULL AND NEW.rol = 'empleado' THEN
    SELECT id INTO v_trabajador_id FROM trabajadores
    WHERE email = NEW.email AND estado = 'activo' LIMIT 1;
    IF v_trabajador_id IS NOT NULL THEN
      NEW.trabajador_id := v_trabajador_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS auto_link_worker ON user_profiles;
CREATE TRIGGER auto_link_worker
  BEFORE INSERT OR UPDATE OF email, rol ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.auto_link_worker_profile();

-- Reverse: when employer sets worker email, link existing user_profile
CREATE OR REPLACE FUNCTION public.auto_link_on_worker_email_set()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email IS NOT NULL AND (OLD.email IS NULL OR OLD.email != NEW.email) THEN
    UPDATE user_profiles SET trabajador_id = NEW.id
    WHERE email = NEW.email AND trabajador_id IS NULL AND rol = 'empleado';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS link_worker_on_email ON trabajadores;
CREATE TRIGGER link_worker_on_email
  AFTER INSERT OR UPDATE OF email ON trabajadores
  FOR EACH ROW EXECUTE FUNCTION public.auto_link_on_worker_email_set();
