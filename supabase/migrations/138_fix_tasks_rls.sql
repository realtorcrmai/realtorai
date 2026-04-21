-- 138: Fix RLS policies for tasks and task_comments
-- Previous policies were too permissive (any authenticated user could access all data).
-- App-level tenant client enforces realtor_id, but DB should be defense-in-depth.

-- Tasks: replace old permissive policies with realtor_id scoped
DROP POLICY IF EXISTS "Authenticated users full access" ON tasks;
DROP POLICY IF EXISTS "Service role full access" ON tasks;

CREATE POLICY "tasks_tenant_isolation" ON tasks
  FOR ALL USING (
    realtor_id::text = (current_setting('request.jwt.claims', true)::json->>'sub')
    OR current_setting('role', true) = 'service_role'
  );

-- Task comments: replace USING(true) with realtor_id scoped
DROP POLICY IF EXISTS task_comments_all ON task_comments;

CREATE POLICY "task_comments_tenant_isolation" ON task_comments
  FOR ALL USING (
    realtor_id = (current_setting('request.jwt.claims', true)::json->>'sub')
    OR current_setting('role', true) = 'service_role'
  );
