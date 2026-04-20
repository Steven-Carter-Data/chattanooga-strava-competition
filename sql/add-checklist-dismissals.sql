-- Checklist Dismissals: per-athlete item dismissal tracking
-- When an athlete dismisses a master checklist item, it's hidden from their personal list
-- They can restore it at any time

CREATE TABLE IF NOT EXISTS checklist_dismissals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES checklist_items(id) ON DELETE CASCADE,
  athlete_id uuid NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
  dismissed_at timestamptz DEFAULT now(),
  UNIQUE(item_id, athlete_id)
);

CREATE INDEX IF NOT EXISTS idx_checklist_dismissals_athlete ON checklist_dismissals(athlete_id);
CREATE INDEX IF NOT EXISTS idx_checklist_dismissals_item ON checklist_dismissals(item_id);

ALTER TABLE checklist_dismissals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to checklist_dismissals" ON checklist_dismissals FOR ALL USING (true) WITH CHECK (true);
