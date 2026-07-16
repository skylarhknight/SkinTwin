CREATE TABLE users (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), email TEXT UNIQUE NOT NULL, full_name TEXT, created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now());

CREATE TABLE user_profiles (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID REFERENCES users(id) ON DELETE CASCADE, skin_type TEXT, sensitivity_level TEXT, routine_experience TEXT, budget_level TEXT, primary_goals JSONB DEFAULT '[]', water_goal_ml INTEGER DEFAULT 2000, sleep_goal_hours NUMERIC DEFAULT 7.5, created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now());

CREATE TABLE skin_scans (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID REFERENCES users(id) ON DELETE CASCADE, image_url TEXT NOT NULL, scan_date DATE NOT NULL DEFAULT CURRENT_DATE, overall_score NUMERIC, hydration_score NUMERIC, redness_score NUMERIC, acne_score NUMERIC, pore_score NUMERIC, texture_score NUMERIC, wrinkle_score NUMERIC, dark_circle_score NUMERIC, pigmentation_score NUMERIC, radiance_score NUMERIC, oiliness_score NUMERIC, top_concerns JSONB DEFAULT '[]'::jsonb, facial_tone_data JSONB, raw_skin_analysis_response JSONB, raw_color_tone_response JSONB, is_mock BOOLEAN DEFAULT false, created_at TIMESTAMPTZ DEFAULT now());

CREATE TABLE daily_habits (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID REFERENCES users(id) ON DELETE CASCADE, log_date DATE NOT NULL DEFAULT CURRENT_DATE, water_intake_ml INTEGER, sleep_hours NUMERIC, used_spf BOOLEAN, stress_level INTEGER CHECK (stress_level BETWEEN 1 AND 5), exercise_minutes INTEGER, notes TEXT, created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now(), UNIQUE(user_id, log_date));

CREATE TABLE products (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID REFERENCES users(id) ON DELETE CASCADE, name TEXT NOT NULL, brand TEXT, category TEXT NOT NULL, active_ingredients JSONB DEFAULT '[]', usage_time TEXT, frequency TEXT, date_started DATE, date_stopped DATE, notes TEXT, created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now());

CREATE TABLE routines (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID REFERENCES users(id) ON DELETE CASCADE, routine_type TEXT NOT NULL, version INTEGER DEFAULT 1, generated_from_scan_id UUID REFERENCES skin_scans(id), rationale TEXT, is_active BOOLEAN DEFAULT true, created_at TIMESTAMPTZ DEFAULT now());

CREATE TABLE routine_steps (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), routine_id UUID REFERENCES routines(id) ON DELETE CASCADE, step_order INTEGER NOT NULL, category TEXT NOT NULL, product_id UUID REFERENCES products(id), instruction TEXT NOT NULL, rationale TEXT, frequency TEXT, created_at TIMESTAMPTZ DEFAULT now());

CREATE TABLE insights (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID REFERENCES users(id) ON DELETE CASCADE, insight_type TEXT NOT NULL, title TEXT NOT NULL, description TEXT NOT NULL, evidence JSONB DEFAULT '{}', recommended_action TEXT, confidence TEXT, severity TEXT, related_scan_id UUID REFERENCES skin_scans(id), created_at TIMESTAMPTZ DEFAULT now(), expires_at TIMESTAMPTZ);

CREATE TABLE simulations (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID REFERENCES users(id) ON DELETE CASCADE, source_scan_id UUID REFERENCES skin_scans(id), scenario_type TEXT NOT NULL, source_image_url TEXT NOT NULL, simulated_image_url TEXT NOT NULL, simulation_years INTEGER DEFAULT 20, scenario_description TEXT, raw_api_response JSONB, is_mock BOOLEAN DEFAULT false, created_at TIMESTAMPTZ DEFAULT now());



-- If your database was created from an older schema.sql without top_concerns, run in SQL Editor:

-- ALTER TABLE skin_scans

-- ADD COLUMN IF NOT EXISTS top_concerns JSONB DEFAULT '[]'::jsonb;



-- Demo user seed for FK-safe scan inserts (matches lib/demoUser.ts DEMO_USER_ID):

-- INSERT INTO users (id, email, full_name)

-- VALUES (

--   '00000000-0000-0000-0000-000000000001',

--   'demo@skinforward.local',

--   'Demo User'

-- )

-- ON CONFLICT (id) DO UPDATE SET

--   email = EXCLUDED.email,

--   full_name = EXCLUDED.full_name,

--   updated_at = now();

