-- ------------------------------------------------------------
-- Notifications push envoyées par le serveur (Expo Push Service).
--  - push_tokens : un jeton Expo par appareil connecté
--  - push_log    : déduplication (une alerte n'est envoyée qu'une fois)
--  - cron quotidien 06:00 UTC (09:00 Madagascar) → fonction push-reminders
--  - trigger sur les nouvelles dépenses → fonction push-limit-alert
--
-- Les appels HTTP lisent deux secrets du Vault, à créer une fois :
--   select vault.create_secret('https://<ref>.supabase.co', 'project_url');
--   select vault.create_secret('<secret aléatoire>', 'push_cron_secret');
-- Tant qu'ils n'existent pas, rien n'est envoyé (aucune erreur).
-- ------------------------------------------------------------

CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- ------------------------------------------------------------
-- PUSH_TOKENS
-- ------------------------------------------------------------
CREATE TABLE public.push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_push_tokens_user_id ON public.push_tokens(user_id);

ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own push tokens"
  ON public.push_tokens FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE TRIGGER update_push_tokens_updated_at
  BEFORE UPDATE ON public.push_tokens
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Un appareil qui change de compte : le jeton est réattribué au nouvel
-- utilisateur (la policy UPDATE ne voit pas la ligne de l'ancien).
CREATE OR REPLACE FUNCTION public.register_push_token(p_token TEXT, p_platform TEXT)
RETURNS VOID AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  INSERT INTO public.push_tokens (user_id, token, platform)
  VALUES (auth.uid(), p_token, p_platform)
  ON CONFLICT (token) DO UPDATE
    SET user_id = auth.uid(), platform = EXCLUDED.platform, updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.register_push_token(TEXT, TEXT) TO authenticated;

-- ------------------------------------------------------------
-- PUSH_LOG (service role uniquement : RLS sans policy)
-- ------------------------------------------------------------
CREATE TABLE public.push_log (
  key TEXT PRIMARY KEY,
  sent_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.push_log ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------
-- Appel d'une Edge Function avec le secret partagé
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.call_push_function(p_name TEXT, p_body JSONB)
RETURNS VOID AS $$
DECLARE
  v_url TEXT;
  v_secret TEXT;
BEGIN
  SELECT decrypted_secret INTO v_url FROM vault.decrypted_secrets WHERE name = 'project_url';
  SELECT decrypted_secret INTO v_secret FROM vault.decrypted_secrets WHERE name = 'push_cron_secret';
  IF v_url IS NULL OR v_secret IS NULL THEN
    RETURN; -- push serveur pas encore configuré
  END IF;

  PERFORM net.http_post(
    url := v_url || '/functions/v1/' || p_name,
    body := p_body,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-push-secret', v_secret
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.call_push_function(TEXT, JSONB) FROM PUBLIC, anon, authenticated;

-- ------------------------------------------------------------
-- Alerte plafond : à chaque nouvelle dépense
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.on_expense_inserted_push()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.type = 'expense' THEN
    PERFORM public.call_push_function(
      'push-limit-alert',
      jsonb_build_object('transaction_id', NEW.id)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER transactions_push_limit_alert
  AFTER INSERT ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.on_expense_inserted_push();

-- ------------------------------------------------------------
-- Rappels quotidiens : 06:00 UTC = 09:00 à Madagascar
-- ------------------------------------------------------------
SELECT cron.schedule(
  'push-daily-reminders',
  '0 6 * * *',
  $$ SELECT public.call_push_function('push-reminders', '{}'::jsonb); $$
);
