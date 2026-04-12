
import { createAdminClient } from "@/lib/supabase/admin";
import { KnowledgeBaseClient } from "@/components/rag/KnowledgeBaseClient";

export default async function KnowledgeBasePage() {
  const supabase = createAdminClient();

  const { data: articles } = await supabase
    .from("knowledge_articles")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Knowledge Base</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Add FAQs, playbooks, scripts, and guides — the AI assistant uses these to answer questions
        </p>
      </div>
      <KnowledgeBaseClient initialArticles={articles || []} />
    </div>
  );
}
