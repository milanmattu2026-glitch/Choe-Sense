-- =============================================================================
-- FILE: supabase/migrations/20261030_choe_sense_v2.sql
-- DESCRIPTION: Choe Sense 2.0 PostGIS Schema for Urban Backflow, Vision Gauge,
--              and Autonomous Municipal Corporation Fleet Dispatch (Chandigarh)
-- =============================================================================

-- 1. Enable PostGIS and UUID extensions idempotently
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- -----------------------------------------------------------------------------
-- TABLE 1: flood_nodes (Chronic Tricity Grid & Choe Outfall Nodes)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.flood_nodes (
    id VARCHAR(32) PRIMARY KEY,
    name VARCHAR(128) NOT NULL,
    sector VARCHAR(64) NOT NULL,
    geom GEOGRAPHY(POINT, 4326) NOT NULL,
    catchment_area_m2 DOUBLE PRECISION NOT NULL DEFAULT 45000.0,
    imperviousness_coeff DOUBLE PRECISION NOT NULL DEFAULT 0.85,
    pipe_capacity_m3 DOUBLE PRECISION NOT NULL DEFAULT 800.0,
    pipe_length_to_downstream_m DOUBLE PRECISION NOT NULL DEFAULT 1200.0,
    downstream_node_id VARCHAR(32),
    outfall_choe VARCHAR(64) NOT NULL,
    gully_choke_pct DOUBLE PRECISION NOT NULL DEFAULT 25.0,
    current_depth_cm DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    backflow_eta_mins INTEGER,
    hospital_corridor_weight DOUBLE PRECISION NOT NULL DEFAULT 0.20,
    traffic_density_weight DOUBLE PRECISION NOT NULL DEFAULT 0.50,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure columns exist if upgrading from Choe Sense v1
ALTER TABLE public.flood_nodes ADD COLUMN IF NOT EXISTS sector VARCHAR(64) DEFAULT 'Unknown';
ALTER TABLE public.flood_nodes ADD COLUMN IF NOT EXISTS catchment_area_m2 DOUBLE PRECISION DEFAULT 45000.0;
ALTER TABLE public.flood_nodes ADD COLUMN IF NOT EXISTS imperviousness_coeff DOUBLE PRECISION DEFAULT 0.85;
ALTER TABLE public.flood_nodes ADD COLUMN IF NOT EXISTS pipe_capacity_m3 DOUBLE PRECISION DEFAULT 800.0;
ALTER TABLE public.flood_nodes ADD COLUMN IF NOT EXISTS pipe_length_to_downstream_m DOUBLE PRECISION DEFAULT 1200.0;
ALTER TABLE public.flood_nodes ADD COLUMN IF NOT EXISTS downstream_node_id VARCHAR(32);
ALTER TABLE public.flood_nodes ADD COLUMN IF NOT EXISTS outfall_choe VARCHAR(64) DEFAULT 'N-Choe';
ALTER TABLE public.flood_nodes ADD COLUMN IF NOT EXISTS gully_choke_pct DOUBLE PRECISION DEFAULT 25.0;
ALTER TABLE public.flood_nodes ADD COLUMN IF NOT EXISTS current_depth_cm DOUBLE PRECISION DEFAULT 0.0;
ALTER TABLE public.flood_nodes ADD COLUMN IF NOT EXISTS backflow_eta_mins INTEGER;
ALTER TABLE public.flood_nodes ADD COLUMN IF NOT EXISTS hospital_corridor_weight DOUBLE PRECISION DEFAULT 0.20;
ALTER TABLE public.flood_nodes ADD COLUMN IF NOT EXISTS traffic_density_weight DOUBLE PRECISION DEFAULT 0.50;
ALTER TABLE public.flood_nodes ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Add self-referencing foreign key idempotently
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_flood_nodes_downstream'
    ) THEN
        ALTER TABLE public.flood_nodes
        ADD CONSTRAINT fk_flood_nodes_downstream
        FOREIGN KEY (downstream_node_id) REFERENCES public.flood_nodes(id)
        ON DELETE SET NULL;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_flood_nodes_geom ON public.flood_nodes USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_flood_nodes_downstream ON public.flood_nodes (downstream_node_id);

-- -----------------------------------------------------------------------------
-- TABLE 2: mc_fleet (Super-Sucker Pump Trucks & Rapid Gully-Cleaning Squads)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.mc_fleet (
    asset_id VARCHAR(32) PRIMARY KEY,
    asset_name VARCHAR(128) NOT NULL,
    asset_type VARCHAR(32) NOT NULL CHECK (asset_type IN ('SUPER_SUCKER_PUMP', 'GULLY_SQUAD')),
    pump_capacity_m3_hr DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    gully_clearance_rate_pct_hr DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    base_sector VARCHAR(64) NOT NULL,
    geom GEOGRAPHY(POINT, 4326) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'AVAILABLE' CHECK (status IN ('AVAILABLE', 'EN_ROUTE', 'ON_SITE_PUMPING', 'MAINTENANCE')),
    assigned_node_id VARCHAR(32) REFERENCES public.flood_nodes(id) ON DELETE SET NULL,
    eta_mins INTEGER,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.mc_fleet ADD COLUMN IF NOT EXISTS asset_name VARCHAR(128) DEFAULT 'MC Unit';
ALTER TABLE public.mc_fleet ADD COLUMN IF NOT EXISTS asset_type VARCHAR(32) DEFAULT 'SUPER_SUCKER_PUMP';
ALTER TABLE public.mc_fleet ADD COLUMN IF NOT EXISTS pump_capacity_m3_hr DOUBLE PRECISION DEFAULT 0.0;
ALTER TABLE public.mc_fleet ADD COLUMN IF NOT EXISTS gully_clearance_rate_pct_hr DOUBLE PRECISION DEFAULT 0.0;
ALTER TABLE public.mc_fleet ADD COLUMN IF NOT EXISTS base_sector VARCHAR(64) DEFAULT 'Sector 17 MC Depot';
ALTER TABLE public.mc_fleet ADD COLUMN IF NOT EXISTS geom GEOGRAPHY(POINT, 4326);
ALTER TABLE public.mc_fleet ADD COLUMN IF NOT EXISTS status VARCHAR(32) DEFAULT 'AVAILABLE';
ALTER TABLE public.mc_fleet ADD COLUMN IF NOT EXISTS assigned_node_id VARCHAR(32);
ALTER TABLE public.mc_fleet ADD COLUMN IF NOT EXISTS eta_mins INTEGER;
ALTER TABLE public.mc_fleet ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_mc_fleet_geom ON public.mc_fleet USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_mc_fleet_status ON public.mc_fleet (status);

-- -----------------------------------------------------------------------------
-- TABLE 3: active_dispatches (Autonomous Dispatch & SLA Verification Ledger)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.active_dispatches (
    dispatch_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    node_id VARCHAR(32) NOT NULL REFERENCES public.flood_nodes(id) ON DELETE CASCADE,
    asset_id VARCHAR(32) NOT NULL REFERENCES public.mc_fleet(asset_id) ON DELETE CASCADE,
    priority_score DOUBLE PRECISION NOT NULL,
    water_volume_m3 DOUBLE PRECISION NOT NULL,
    time_to_drain_mins INTEGER NOT NULL,
    safe_detour_route TEXT NOT NULL,
    citizen_bypass_advisory TEXT NOT NULL,
    before_depth_cm DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    after_depth_cm DOUBLE PRECISION,
    after_image_url TEXT,
    contractor_distance_m DOUBLE PRECISION,
    proof_verified BOOLEAN NOT NULL DEFAULT FALSE,
    dispatched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    sla_deadline_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '45 minutes'),
    resolved_at TIMESTAMPTZ,
    status VARCHAR(32) NOT NULL DEFAULT 'DISPATCHED' CHECK (status IN ('DISPATCHED', 'PUMPING', 'AWAITING_PROOF', 'VERIFIED_CLOSED', 'SLA_BREACHED'))
);

ALTER TABLE public.active_dispatches ADD COLUMN IF NOT EXISTS node_id VARCHAR(32);
ALTER TABLE public.active_dispatches ADD COLUMN IF NOT EXISTS asset_id VARCHAR(32);
ALTER TABLE public.active_dispatches ADD COLUMN IF NOT EXISTS priority_score DOUBLE PRECISION DEFAULT 0.0;
ALTER TABLE public.active_dispatches ADD COLUMN IF NOT EXISTS water_volume_m3 DOUBLE PRECISION DEFAULT 0.0;
ALTER TABLE public.active_dispatches ADD COLUMN IF NOT EXISTS time_to_drain_mins INTEGER DEFAULT 30;
ALTER TABLE public.active_dispatches ADD COLUMN IF NOT EXISTS safe_detour_route TEXT DEFAULT '';
ALTER TABLE public.active_dispatches ADD COLUMN IF NOT EXISTS citizen_bypass_advisory TEXT DEFAULT '';
ALTER TABLE public.active_dispatches ADD COLUMN IF NOT EXISTS before_depth_cm DOUBLE PRECISION DEFAULT 0.0;
ALTER TABLE public.active_dispatches ADD COLUMN IF NOT EXISTS after_depth_cm DOUBLE PRECISION;
ALTER TABLE public.active_dispatches ADD COLUMN IF NOT EXISTS after_image_url TEXT;
ALTER TABLE public.active_dispatches ADD COLUMN IF NOT EXISTS contractor_distance_m DOUBLE PRECISION;
ALTER TABLE public.active_dispatches ADD COLUMN IF NOT EXISTS proof_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE public.active_dispatches ADD COLUMN IF NOT EXISTS dispatched_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.active_dispatches ADD COLUMN IF NOT EXISTS sla_deadline_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '45 minutes');
ALTER TABLE public.active_dispatches ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;
ALTER TABLE public.active_dispatches ADD COLUMN IF NOT EXISTS status VARCHAR(32) DEFAULT 'DISPATCHED';

CREATE INDEX IF NOT EXISTS idx_active_dispatches_node ON public.active_dispatches (node_id);
CREATE INDEX IF NOT EXISTS idx_active_dispatches_status ON public.active_dispatches (status);

-- -----------------------------------------------------------------------------
-- SEED DATA: 6 Chronic Tricity Nodes (Topologically Ordered for FK Integrity)
-- -----------------------------------------------------------------------------
-- First insert terminal trunk/outfall nodes (downstream_node_id = NULL)
INSERT INTO public.flood_nodes (
    id, name, sector, geom, catchment_area_m2, imperviousness_coeff,
    pipe_capacity_m3, pipe_length_to_downstream_m, downstream_node_id,
    outfall_choe, gully_choke_pct, current_depth_cm, backflow_eta_mins,
    hospital_corridor_weight, traffic_density_weight
) VALUES
(
    'NODE-SEC36-NCHOE',
    'Sector 36 N-Choe Trunk Outfall',
    'Sector 36',
    ST_SetSRID(ST_MakePoint(76.7562, 30.7285), 4326)::geography,
    92000.0, 0.88, 1950.0, 600.0, NULL,
    'N-Choe', 48.0, 28.0, NULL, 0.45, 0.72
),
(
    'NODE-IND-PH1',
    'Industrial Area Ph-1 Railway Underpass',
    'Industrial Area Phase 1',
    ST_SetSRID(ST_MakePoint(76.8045, 30.7062), 4326)::geography,
    88000.0, 0.94, 1500.0, 500.0, NULL,
    'Sukhna Choe', 62.0, 58.0, NULL, 0.40, 0.88
),
(
    'NODE-ZIRAKPUR-RAO',
    'Zirakpur-Patiala Ki Rao Box Culvert',
    'Zirakpur NH-7',
    ST_SetSRID(ST_MakePoint(76.8214, 30.6542), 4326)::geography,
    115000.0, 0.91, 1750.0, 700.0, NULL,
    'Patiala Ki Rao', 68.0, 46.0, NULL, 0.55, 0.95
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    sector = EXCLUDED.sector,
    geom = EXCLUDED.geom,
    catchment_area_m2 = EXCLUDED.catchment_area_m2,
    imperviousness_coeff = EXCLUDED.imperviousness_coeff,
    pipe_capacity_m3 = EXCLUDED.pipe_capacity_m3,
    pipe_length_to_downstream_m = EXCLUDED.pipe_length_to_downstream_m,
    downstream_node_id = EXCLUDED.downstream_node_id,
    outfall_choe = EXCLUDED.outfall_choe,
    gully_choke_pct = EXCLUDED.gully_choke_pct,
    current_depth_cm = EXCLUDED.current_depth_cm,
    hospital_corridor_weight = EXCLUDED.hospital_corridor_weight,
    traffic_density_weight = EXCLUDED.traffic_density_weight,
    updated_at = NOW();

-- Next insert mid-stream and upstream sector nodes linking to downstream trunks
INSERT INTO public.flood_nodes (
    id, name, sector, geom, catchment_area_m2, imperviousness_coeff,
    pipe_capacity_m3, pipe_length_to_downstream_m, downstream_node_id,
    outfall_choe, gully_choke_pct, current_depth_cm, backflow_eta_mins,
    hospital_corridor_weight, traffic_density_weight
) VALUES
(
    'NODE-SEC22-23',
    'Sector 22/23 ISBT-17 Roundabout',
    'Sector 22/23 Dividing V3',
    ST_SetSRID(ST_MakePoint(76.7738, 30.7368), 4326)::geography,
    68000.0, 0.90, 1150.0, 1450.0, 'NODE-SEC36-NCHOE',
    'N-Choe', 54.0, 34.0, 18, 0.78, 0.92
),
(
    'NODE-PGI-SEC12',
    'PGI / Sector 12 Madhya Marg V2 Emergency Gate',
    'Sector 12',
    ST_SetSRID(ST_MakePoint(76.7751, 30.7615), 4326)::geography,
    62000.0, 0.87, 1050.0, 1850.0, 'NODE-SEC22-23',
    'N-Choe', 39.0, 22.0, 26, 1.00, 0.89
),
(
    'NODE-TRIBUNE-CHOWK',
    'Tribune Chowk Dakshin Marg Roundabout',
    'Sector 29/31/32 Chowk',
    ST_SetSRID(ST_MakePoint(76.7912, 30.7098), 4326)::geography,
    78000.0, 0.92, 1250.0, 1300.0, 'NODE-IND-PH1',
    'Sukhna Choe', 57.0, 38.0, 14, 0.65, 0.96
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    sector = EXCLUDED.sector,
    geom = EXCLUDED.geom,
    catchment_area_m2 = EXCLUDED.catchment_area_m2,
    imperviousness_coeff = EXCLUDED.imperviousness_coeff,
    pipe_capacity_m3 = EXCLUDED.pipe_capacity_m3,
    pipe_length_to_downstream_m = EXCLUDED.pipe_length_to_downstream_m,
    downstream_node_id = EXCLUDED.downstream_node_id,
    outfall_choe = EXCLUDED.outfall_choe,
    gully_choke_pct = EXCLUDED.gully_choke_pct,
    current_depth_cm = EXCLUDED.current_depth_cm,
    backflow_eta_mins = EXCLUDED.backflow_eta_mins,
    hospital_corridor_weight = EXCLUDED.hospital_corridor_weight,
    traffic_density_weight = EXCLUDED.traffic_density_weight,
    updated_at = NOW();

-- -----------------------------------------------------------------------------
-- SEED DATA: Municipal Corporation Fleet (3 Super-Suckers + 3 Gully Squads)
-- -----------------------------------------------------------------------------
INSERT INTO public.mc_fleet (
    asset_id, asset_name, asset_type, pump_capacity_m3_hr,
    gully_clearance_rate_pct_hr, base_sector, geom, status, assigned_node_id, eta_mins
) VALUES
(
    'MC-PUMP-01',
    'MC Chandigarh Super-Sucker Alpha (1200 m3/hr)',
    'SUPER_SUCKER_PUMP',
    1200.0, 0.0, 'Sector 17 MC Main Depot',
    ST_SetSRID(ST_MakePoint(76.7821, 30.7410), 4326)::geography,
    'AVAILABLE', NULL, NULL
),
(
    'MC-PUMP-02',
    'MC Chandigarh Super-Sucker Bravo (900 m3/hr)',
    'SUPER_SUCKER_PUMP',
    900.0, 0.0, 'Industrial Area Ph-1 Fire & Flood Station',
    ST_SetSRID(ST_MakePoint(76.8010, 30.7125), 4326)::geography,
    'AVAILABLE', NULL, NULL
),
(
    'MC-PUMP-03',
    'MC Chandigarh High-Head Pump Charlie (600 m3/hr)',
    'SUPER_SUCKER_PUMP',
    600.0, 0.0, 'Sector 14/15 Emergency Yard',
    ST_SetSRID(ST_MakePoint(76.7685, 30.7530), 4326)::geography,
    'AVAILABLE', NULL, NULL
),
(
    'GULLY-SQUAD-A',
    'Rapid Gully Desilting Squad Alpha (North V2/V3)',
    'GULLY_SQUAD',
    0.0, 65.0, 'Sector 15 Sub-Office',
    ST_SetSRID(ST_MakePoint(76.7712, 30.7518), 4326)::geography,
    'AVAILABLE', NULL, NULL
),
(
    'GULLY-SQUAD-B',
    'Rapid Gully Desilting Squad Bravo (Central Roundabouts)',
    'GULLY_SQUAD',
    0.0, 65.0, 'Sector 22 Maintenance Booth',
    ST_SetSRID(ST_MakePoint(76.7755, 30.7335), 4326)::geography,
    'AVAILABLE', NULL, NULL
),
(
    'GULLY-SQUAD-C',
    'Rapid Gully Desilting Squad Charlie (Dakshin Marg & Ind Area)',
    'GULLY_SQUAD',
    0.0, 65.0, 'Sector 31 MC Yard',
    ST_SetSRID(ST_MakePoint(76.7880, 30.7080), 4326)::geography,
    'AVAILABLE', NULL, NULL
)
ON CONFLICT (asset_id) DO UPDATE SET
    asset_name = EXCLUDED.asset_name,
    asset_type = EXCLUDED.asset_type,
    pump_capacity_m3_hr = EXCLUDED.pump_capacity_m3_hr,
    gully_clearance_rate_pct_hr = EXCLUDED.gully_clearance_rate_pct_hr,
    base_sector = EXCLUDED.base_sector,
    geom = EXCLUDED.geom,
    status = EXCLUDED.status,
    updated_at = NOW();
