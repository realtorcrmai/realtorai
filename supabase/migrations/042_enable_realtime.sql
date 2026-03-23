-- Migration 020: Enable Supabase Realtime on key tables
-- Allows the dashboard to receive live updates via WebSocket

-- Enable realtime for tables the dashboard subscribes to
ALTER PUBLICATION supabase_realtime ADD TABLE contacts;
ALTER PUBLICATION supabase_realtime ADD TABLE appointments;
ALTER PUBLICATION supabase_realtime ADD TABLE tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE listings;
ALTER PUBLICATION supabase_realtime ADD TABLE communications;
