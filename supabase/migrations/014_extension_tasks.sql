-- Extension Tasks — task queue for CRM ↔ Chrome Extension communication
-- CRM creates a pending task, extension picks it up and acts on it

CREATE TABLE IF NOT EXISTS extension_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  task_type TEXT NOT NULL CHECK (task_type IN ('explore', 'fill')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'picked_up', 'completed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Allow extension (anon key) to read/update tasks
GRANT ALL ON extension_tasks TO anon;
