-- Supabase Setup Script for RTS Game
-- Note: Requires `pg_cron` extension to be enabled in Supabase if not already.
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- ==========================================
-- 1. SCHEMAS & TABLES
-- ==========================================

-- Table: players
CREATE TABLE IF NOT EXISTS public.players (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: player_resources
-- Stores base generation values and the last time they were calculated server-side.
CREATE TABLE IF NOT EXISTS public.player_resources (
    player_id UUID PRIMARY KEY REFERENCES public.players(id) ON DELETE CASCADE,
    steel INTEGER DEFAULT 100,
    oil INTEGER DEFAULT 0,
    steel_generation_rate INTEGER DEFAULT 1, -- per second, just an example
    oil_generation_rate INTEGER DEFAULT 0,   -- per second
    last_collection_time TIMESTAMPTZ DEFAULT NOW()
);

-- Table: player_buildings
-- Represents buildings constructed in the home base.
CREATE TABLE IF NOT EXISTS public.player_buildings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID REFERENCES public.players(id) ON DELETE CASCADE,
    building_type TEXT NOT NULL, -- 'hq', 'worker_hut', 'steel_mine', 'oil_pump', 'barracks', etc.
    level INTEGER DEFAULT 1,
    grid_x INTEGER NOT NULL,
    grid_y INTEGER NOT NULL,
    construction_started_at TIMESTAMPTZ,
    construction_duration INTERVAL,
    is_constructed BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (player_id, grid_x, grid_y) -- One building per grid coordinate per player
);

-- Table: player_troops
-- Represents unit counts for each player
CREATE TABLE IF NOT EXISTS public.player_troops (
    player_id UUID PRIMARY KEY REFERENCES public.players(id) ON DELETE CASCADE,
    soldiers INTEGER DEFAULT 0,
    medics INTEGER DEFAULT 0,
    juggernauts INTEGER DEFAULT 0
);

-- Table: hex_overworld
-- Shared global map
CREATE TABLE IF NOT EXISTS public.hex_overworld (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    q INTEGER NOT NULL, -- Axial coordinate q
    r INTEGER NOT NULL, -- Axial coordinate r
    terrain_type TEXT DEFAULT 'plains', -- 'plains', 'mountains', 'water'
    owner_id UUID REFERENCES public.players(id) ON DELETE SET NULL, -- NULL = NPC/Unowned
    is_npc_base BOOLEAN DEFAULT FALSE,
    conscripts_generation_rate INTEGER DEFAULT 0,
    UNIQUE(q, r)
);

-- Table: deployments
-- Represents active combat/movement missions
CREATE TABLE IF NOT EXISTS public.deployments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID REFERENCES public.players(id) ON DELETE CASCADE,
    target_hex_q INTEGER NOT NULL,
    target_hex_r INTEGER NOT NULL,
    troops_soldiers INTEGER DEFAULT 0,
    troops_medics INTEGER DEFAULT 0,
    troops_juggernauts INTEGER DEFAULT 0,
    mission_type TEXT NOT NULL, -- 'attack', 'reinforce'
    started_at TIMESTAMPTZ DEFAULT NOW(),
    arrival_time TIMESTAMPTZ NOT NULL,
    is_resolved BOOLEAN DEFAULT FALSE
);


-- ==========================================
-- 2. SERVER-SIDE LOGIC (FUNCTIONS)
-- ==========================================

-- Function: calculate_and_update_resources
-- This calculates exactly how much resource a player should have based on generation rate since last calculation
CREATE OR REPLACE FUNCTION public.calculate_and_update_resources(p_id UUID)
RETURNS VOID AS $$
DECLARE
    res_record RECORD;
    seconds_passed NUMERIC;
    new_steel INTEGER;
    new_oil INTEGER;
BEGIN
    SELECT * INTO res_record FROM public.player_resources WHERE player_id = p_id;
    IF FOUND THEN
        seconds_passed := EXTRACT(EPOCH FROM (NOW() - res_record.last_collection_time));
        IF seconds_passed > 0 THEN
            new_steel := res_record.steel + FLOOR(seconds_passed * res_record.steel_generation_rate);
            new_oil := res_record.oil + FLOOR(seconds_passed * res_record.oil_generation_rate);

            UPDATE public.player_resources
            SET steel = new_steel,
                oil = new_oil,
                last_collection_time = NOW()
            WHERE player_id = p_id;
        END IF;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Function: request_build_structure
-- Called by the client. Validates costs and starts the build timer.
CREATE OR REPLACE FUNCTION public.request_build_structure(b_type TEXT, x INTEGER, y INTEGER)
RETURNS BOOLEAN AS $$
DECLARE
    cost_steel INTEGER := 50; -- Example cost
    cost_oil INTEGER := 0;
    duration INTERVAL := '10 seconds'::interval;
    res_record RECORD;
BEGIN
    -- 1. Ensure resources are up to date
    PERFORM public.calculate_and_update_resources(auth.uid());

    -- 2. Check resources
    SELECT * INTO res_record FROM public.player_resources WHERE player_id = auth.uid();

    IF res_record.steel >= cost_steel AND res_record.oil >= cost_oil THEN
        -- 3. Deduct resources
        UPDATE public.player_resources
        SET steel = steel - cost_steel,
            oil = oil - cost_oil
        WHERE player_id = auth.uid();

        -- 4. Create building in 'constructing' state
        INSERT INTO public.player_buildings (player_id, building_type, grid_x, grid_y, construction_started_at, construction_duration, is_constructed)
        VALUES (auth.uid(), b_type, x, y, NOW(), duration, FALSE);

        RETURN TRUE;
    ELSE
        RETURN FALSE; -- Not enough resources
    END IF;
EXCEPTION WHEN unique_violation THEN
    -- Spot already taken
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Function: resolve_completed_constructions
-- Intended to be run periodically by pg_cron or triggered.
CREATE OR REPLACE FUNCTION public.resolve_completed_constructions()
RETURNS VOID AS $$
BEGIN
    UPDATE public.player_buildings
    SET is_constructed = TRUE,
        construction_started_at = NULL,
        construction_duration = NULL
    WHERE is_constructed = FALSE
      AND NOW() >= (construction_started_at + construction_duration);

    -- Note: We could add a trigger on player_buildings to update resource generation rates
    -- when a 'steel_mine' or 'oil_pump' finishes construction.
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger Function: Update resource rates upon building completion
CREATE OR REPLACE FUNCTION update_resource_rates_on_build()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_constructed = TRUE AND OLD.is_constructed = FALSE THEN
        IF NEW.building_type = 'steel_mine' THEN
            UPDATE public.player_resources SET steel_generation_rate = steel_generation_rate + 2 WHERE player_id = NEW.player_id;
        ELSIF NEW.building_type = 'oil_pump' THEN
            UPDATE public.player_resources SET oil_generation_rate = oil_generation_rate + 1 WHERE player_id = NEW.player_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_rates
AFTER UPDATE ON public.player_buildings
FOR EACH ROW
WHEN (NEW.is_constructed = TRUE AND OLD.is_constructed = FALSE)
EXECUTE FUNCTION update_resource_rates_on_build();


-- ==========================================
-- 3. OVERWORLD GENERATION (Seed-based Radius 20)
-- ==========================================
-- This script generates a hexagonal grid using axial coordinates (q, r).
-- Radius 20 means max(|q|, |r|, |q+r|) <= 20.
CREATE OR REPLACE FUNCTION public.generate_overworld(radius INTEGER, seed FLOAT)
RETURNS VOID AS $$
DECLARE
    q INTEGER;
    r INTEGER;
    random_val FLOAT;
    is_npc BOOLEAN;
BEGIN
    -- Clear existing map
    DELETE FROM public.hex_overworld;

    FOR q IN -radius..radius LOOP
        FOR r IN MAX(-radius, -q - radius)..MIN(radius, -q + radius) LOOP

            -- Basic seeded pseudo-random logic (for demo purposes)
            -- A proper hash would be better, but we use sin() logic here based on q, r, seed
            random_val := ABS(SIN(q * 12.9898 + r * 78.233 + seed) * 43758.5453);
            random_val := random_val - FLOOR(random_val); -- Get decimal part

            is_npc := FALSE;
            -- 5% chance of being an NPC base
            IF random_val < 0.05 THEN
                is_npc := TRUE;
            END IF;

            INSERT INTO public.hex_overworld (q, r, terrain_type, is_npc_base, conscripts_generation_rate)
            VALUES (
                q, r,
                CASE
                    WHEN random_val > 0.8 THEN 'mountains'
                    WHEN random_val > 0.6 THEN 'water'
                    ELSE 'plains'
                END,
                is_npc,
                CASE WHEN is_npc THEN 1 ELSE 0 END
            );
        END LOOP;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Execute map generation on setup
-- SELECT public.generate_overworld(20, 1.234);

-- ==========================================
-- 4. NEW PLAYER INITIALIZATION TRIGGER
-- ==========================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.players (id, display_name)
  VALUES (new.id, new.email); -- Using email as placeholder display name

  INSERT INTO public.player_resources (player_id, steel, oil, steel_generation_rate, oil_generation_rate)
  VALUES (new.id, 500, 0, 5, 0);

  INSERT INTO public.player_troops (player_id)
  VALUES (new.id);

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ==========================================
-- 5. CRON JOBS SETUP (Example)
-- ==========================================
-- Run the construction resolution every 5 seconds
-- SELECT cron.schedule('resolve_constructions_job', '5 seconds', 'SELECT public.resolve_completed_constructions()');

-- ==========================================
-- 6. RLS (Row Level Security) POLICIES
-- ==========================================
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_buildings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_troops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hex_overworld ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deployments ENABLE ROW LEVEL SECURITY;

-- Players can read all players
CREATE POLICY "Players can view all players" ON public.players FOR SELECT USING (true);
-- Players can only read/update their own resources
CREATE POLICY "Players can view own resources" ON public.player_resources FOR SELECT USING (auth.uid() = player_id);
-- Players can view all buildings (or just their own depending on design, here just own)
CREATE POLICY "Players can view own buildings" ON public.player_buildings FOR SELECT USING (auth.uid() = player_id);
-- Overworld is public
CREATE POLICY "Overworld is visible to all" ON public.hex_overworld FOR SELECT USING (true);
-- Deployments visible to owner
CREATE POLICY "Deployments visible to owner" ON public.deployments FOR SELECT USING (auth.uid() = player_id);
