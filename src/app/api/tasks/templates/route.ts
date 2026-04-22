import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getAuthenticatedTenantClient } from "@/lib/supabase/tenant";
import { taskTemplateSchema } from "@/lib/schemas/task";

// GET /api/tasks/templates — list templates
export async function GET(_req: NextRequest) {
  let tc;
  try { tc = await getAuthenticatedTenantClient(); }
  catch { return NextResponse.json({ error: "Authentication required" }, { status: 401 }); }

  const { data, error } = await tc
    .from("task_templates")
    .select("*, task_template_items(id, title, priority, category, offset_days, position)")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

// POST /api/tasks/templates — create template with items
export async function POST(req: NextRequest) {
  let tc;
  try { tc = await getAuthenticatedTenantClient(); }
  catch { return NextResponse.json({ error: "Authentication required" }, { status: 401 }); }

  const body = await req.json();
  const parsed = taskTemplateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", issues: parsed.error.issues }, { status: 400 });
  }

  const { items, ...templateData } = parsed.data;

  const { data: template, error } = await tc
    .from("task_templates")
    .insert({
      ...templateData,
      trigger_event: templateData.trigger_event || null,
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Insert template items
  if (items && items.length > 0) {
    const itemRows = items.map((item, i) => ({
      template_id: template.id,
      ...item,
      position: item.position ?? i,
    }));
    await tc.from("task_template_items").insert(itemRows);
  }

  revalidatePath("/tasks");
  return NextResponse.json(template, { status: 201 });
}

// POST /api/tasks/templates/apply — apply template to create tasks
export async function PATCH(req: NextRequest) {
  let tc;
  try { tc = await getAuthenticatedTenantClient(); }
  catch { return NextResponse.json({ error: "Authentication required" }, { status: 401 }); }

  const { template_id, contact_id, listing_id, base_date } = await req.json();
  if (!template_id) return NextResponse.json({ error: "template_id required" }, { status: 400 });

  // Fetch template items
  const { data: items } = await tc
    .from("task_template_items")
    .select("*")
    .eq("template_id", template_id)
    .order("position");

  if (!items || items.length === 0) {
    return NextResponse.json({ error: "Template has no items" }, { status: 400 });
  }

  const baseDate = base_date ? new Date(base_date) : new Date();
  const tasks = items.map((item: Record<string, unknown>) => {
    const dueDate = new Date(baseDate);
    dueDate.setDate(dueDate.getDate() + (Number(item.offset_days) || 0));
    return {
      title: item.title,
      description: item.description || null,
      priority: item.priority || "medium",
      category: item.category || "general",
      due_date: dueDate.toISOString().split("T")[0],
      contact_id: contact_id || null,
      listing_id: listing_id || null,
      status: "pending" as const,
      position: item.position,
    };
  });

  const { data: created, error } = await tc
    .from("tasks")
    .insert(tasks)
    .select("*");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  revalidatePath("/tasks");
  revalidatePath("/");
  return NextResponse.json({ success: true, tasks: created });
}
