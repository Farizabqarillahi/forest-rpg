-- ============================================================
-- Forest Realm RPG — Supabase Database Schema (Email Auth)
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── players ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.players (
  id          UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username    TEXT        NOT NULL DEFAULT 'Traveler',
  hp          INTEGER     NOT NULL DEFAULT 100,
  x           FLOAT       NOT NULL DEFAULT 384,
  y           FLOAT       NOT NULL DEFAULT 384,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_players_updated_at ON public.players;
CREATE TRIGGER trg_players_updated_at
  BEFORE UPDATE ON public.players
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── inventories ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.inventories (
  id          UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id   UUID    NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  item_id     TEXT    NOT NULL,
  qty         INTEGER NOT NULL DEFAULT 1 CHECK (qty > 0)
);

CREATE INDEX IF NOT EXISTS idx_inventories_player ON public.inventories(player_id);

-- ── equipments ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.equipments (
  player_id   UUID  NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  slot        TEXT  NOT NULL CHECK (slot IN ('weapon','helmet','armor','boots','accessory')),
  item_id     TEXT  NOT NULL,
  PRIMARY KEY (player_id, slot)
);

-- ============================================================
-- Row Level Security (RLS)
-- ============================================================

ALTER TABLE public.players     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipments  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Players: own row" ON public.players;
CREATE POLICY "Players: own row" ON public.players
  FOR ALL USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Players: read others" ON public.players;
CREATE POLICY "Players: read others" ON public.players
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Inventories: own rows" ON public.inventories;
CREATE POLICY "Inventories: own rows" ON public.inventories
  FOR ALL USING (auth.uid() = player_id) WITH CHECK (auth.uid() = player_id);

DROP POLICY IF EXISTS "Equipments: own rows" ON public.equipments;
CREATE POLICY "Equipments: own rows" ON public.equipments
  FOR ALL USING (auth.uid() = player_id) WITH CHECK (auth.uid() = player_id);

-- ============================================================
-- Auto-create player row on signup (UPDATED FOR EMAIL AUTH)
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.players (id, username)
  VALUES (
    NEW.id,
    split_part(NEW.email, '@', 1)  -- ← username otomatis dari email
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_on_auth_user_created ON auth.users;
CREATE TRIGGER trg_on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================

SELECT 'Schema created successfully ✓' AS status;