"use client";

import { useState, useEffect, useRef } from "react";
import { Send, Trash2, MessageSquare, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type Comment = {
  id: string;
  body: string;
  author_name: string;
  realtor_id: string;
  created_at: string;
};

interface TaskCommentsProps {
  taskId: string;
  isOpen: boolean;
}

export function TaskComments({ taskId, isOpen }: TaskCommentsProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [posting, setPosting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      fetchComments();
    }
  }, [isOpen, taskId]);

  async function fetchComments() {
    setLoading(true);
    try {
      const res = await fetch(`/api/tasks/${taskId}/comments`);
      if (res.ok) {
        const data = await res.json();
        setComments(data);
      } else {
        toast.error("Failed to load comments");
      }
    } catch {
      toast.error("Failed to load comments");
    } finally {
      setLoading(false);
    }
  }

  async function postComment() {
    if (!newComment.trim() || posting) return;
    setPosting(true);
    try {
      const res = await fetch(`/api/tasks/${taskId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: newComment.trim() }),
      });
      if (res.ok) {
        const comment = await res.json();
        setComments((prev) => [...prev, comment]);
        setNewComment("");
        inputRef.current?.focus();
      } else {
        toast.error("Failed to add comment");
      }
    } catch {
      toast.error("Failed to add comment");
    } finally {
      setPosting(false);
    }
  }

  async function deleteComment(commentId: string) {
    try {
      const res = await fetch(`/api/tasks/${taskId}/comments?commentId=${commentId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setComments((prev) => prev.filter((c) => c.id !== commentId));
      } else {
        toast.error("Failed to delete comment");
      }
    } catch {
      toast.error("Failed to delete comment");
    }
  }

  function formatTime(dateStr: string) {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHr = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHr / 24);

    if (diffMin < 1) return "just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHr < 24) return `${diffHr}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString("en-CA", { month: "short", day: "numeric" });
  }

  if (!isOpen) return null;

  return (
    <div className="mt-2 border-t border-border pt-2 space-y-2">
      {/* Comments list */}
      {loading ? (
        <div className="flex items-center gap-2 py-2">
          <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Loading comments...</span>
        </div>
      ) : comments.length === 0 ? (
        <p className="text-xs text-muted-foreground py-1">No comments yet</p>
      ) : (
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {comments.map((c) => (
            <div key={c.id} className="flex items-start gap-2 group">
              <div className="h-5 w-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[9px] font-bold shrink-0 mt-0.5">
                {c.author_name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="text-xs font-medium">{c.author_name}</span>
                  <span className="text-[10px] text-muted-foreground">{formatTime(c.created_at)}</span>
                </div>
                <p className="text-xs text-foreground/80 mt-0.5 whitespace-pre-wrap break-words">{c.body}</p>
              </div>
              <button
                onClick={() => deleteComment(c.id)}
                className="p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-red-100 transition-opacity shrink-0"
                title="Delete comment"
              >
                <Trash2 className="h-3 w-3 text-red-400" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* New comment input */}
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          type="text"
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); postComment(); } }}
          placeholder="Add a comment..."
          className="flex-1 h-8 px-3 text-xs rounded-lg border border-border bg-background focus:outline-none focus:border-brand"
          disabled={posting}
        />
        <Button
          size="sm"
          variant="ghost"
          onClick={postComment}
          disabled={!newComment.trim() || posting}
          className="h-8 w-8 p-0"
        >
          {posting ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Send className="h-3.5 w-3.5" />
          )}
        </Button>
      </div>
    </div>
  );
}

/** Small toggle button to show/hide comments on a task card */
export function CommentToggle({
  commentCount,
  isOpen,
  onToggle,
}: {
  commentCount?: number;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onToggle(); }}
      className="p-1 rounded hover:bg-muted transition-colors flex items-center gap-1"
      title={isOpen ? "Hide comments" : "Show comments"}
    >
      <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
      {commentCount !== undefined && commentCount > 0 && (
        <span className="text-[10px] text-muted-foreground font-medium">{commentCount}</span>
      )}
    </button>
  );
}
