-- Race Day Checklist Tables
-- Shared community checklist where athletes can add items and track their own packing

-- checklist_items: shared items that any athlete can add
CREATE TABLE IF NOT EXISTS checklist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL,
  item_text text NOT NULL,
  added_by uuid REFERENCES athletes(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- checklist_checks: per-athlete check-off tracking
CREATE TABLE IF NOT EXISTS checklist_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES checklist_items(id) ON DELETE CASCADE,
  athlete_id uuid NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
  checked boolean DEFAULT false,
  checked_at timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE(item_id, athlete_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_checklist_items_category ON checklist_items(category);
CREATE INDEX IF NOT EXISTS idx_checklist_checks_athlete ON checklist_checks(athlete_id);
CREATE INDEX IF NOT EXISTS idx_checklist_checks_item ON checklist_checks(item_id);

-- Enable RLS (Row Level Security) but allow all operations via service role
ALTER TABLE checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_checks ENABLE ROW LEVEL SECURITY;

-- Allow all operations for authenticated and anon users (small friend group app)
CREATE POLICY "Allow all access to checklist_items" ON checklist_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to checklist_checks" ON checklist_checks FOR ALL USING (true) WITH CHECK (true);

-- Seed with common race day items organized by category
INSERT INTO checklist_items (category, item_text) VALUES
  -- Swim
  ('Swim', 'Wetsuit'),
  ('Swim', 'Goggles (primary pair)'),
  ('Swim', 'Goggles (backup pair)'),
  ('Swim', 'Swim cap (provided at race)'),
  ('Swim', 'Body Glide / anti-chafe'),
  ('Swim', 'Ear plugs (optional)'),
  -- T1
  ('T1', 'Transition towel'),
  ('T1', 'Sunscreen (pre-applied or in transition)'),
  ('T1', 'Race belt with bib number'),
  -- Bike
  ('Bike', 'Bike (duh)'),
  ('Bike', 'Helmet'),
  ('Bike', 'Cycling shoes'),
  ('Bike', 'Sunglasses'),
  ('Bike', 'Water bottles (filled)'),
  ('Bike', 'Bike nutrition (gels, bars, etc.)'),
  ('Bike', 'Flat kit (tube, CO2, tire levers)'),
  ('Bike', 'Bike computer / GPS'),
  ('Bike', 'Cycling jersey or tri suit'),
  -- T2
  ('T2', 'Running shoes'),
  ('T2', 'Running socks'),
  ('T2', 'Hat or visor'),
  -- Run
  ('Run', 'Run nutrition (gels, salt tabs)'),
  ('Run', 'Body Glide for run'),
  -- General / Travel
  ('General', 'Race confirmation / registration email'),
  ('General', 'Photo ID'),
  ('General', 'USAT membership card (if applicable)'),
  ('General', 'Timing chip (provided at race)'),
  ('General', 'Heart rate monitor / watch'),
  ('General', 'Post-race recovery clothes'),
  ('General', 'Flip flops / sandals'),
  ('General', 'Cooler with post-race drinks'),
  ('General', 'Cash (for parking, vendors)'),
  ('General', 'Phone charger'),
  ('General', 'Towel for post-race'),
  ('General', 'Bourbon (for celebrating)');
