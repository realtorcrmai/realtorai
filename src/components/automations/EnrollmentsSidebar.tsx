"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Loader2, Play, Pause, Trash2, Users } from "lucide-react";
import { ENROLLMENT_STATUS_COLORS } from "@/lib/constants";
import type { WorkflowEnrollment } from "@/types";

type EnrollmentWithContact = WorkflowEnrollment & {
  contacts: { id: string; name: string };
};

interface EnrollmentsSidebarProps {
  enrollments: EnrollmentWithContact[];
  contacts: { id: string; name: string; type: string }[];
  stepsCount: number;
  enrollDialogOpen: boolean;
  onEnrollDialogOpenChange: (open: boolean) => void;
  selectedContactId: string;
  onSelectedContactChange: (id: string) => void;
  onEnroll: () => void;
  onToggleEnrollment: (enrollmentId: string, currentStatus: string) => void;
  onExitEnrollment: (enrollmentId: string) => void;
  isPending: boolean;
}

export function EnrollmentsSidebar({
  enrollments,
  contacts,
  stepsCount,
  enrollDialogOpen,
  onEnrollDialogOpenChange,
  selectedContactId,
  onSelectedContactChange,
  onEnroll,
  onToggleEnrollment,
  onExitEnrollment,
  isPending,
}: EnrollmentsSidebarProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Users className="w-5 h-5 text-[var(--lf-indigo)]" />
          Enrollments
          <Badge variant="secondary" className="ml-1">
            {enrollments.length}
          </Badge>
        </h2>
        <Dialog open={enrollDialogOpen} onOpenChange={onEnrollDialogOpenChange}>
          <DialogTrigger
            render={
              <Button size="sm" variant="outline">
                <Plus className="w-4 h-4 mr-1" />
                Enroll
              </Button>
            }
          />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Enroll Contact</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <Label>Select Contact</Label>
                <Select
                  value={selectedContactId || undefined}
                  onValueChange={(val) => onSelectedContactChange(val ?? "")}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {contacts.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}{" "}
                        <span className="text-muted-foreground text-xs ml-1">
                          ({c.type})
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => onEnrollDialogOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={onEnroll}
                  disabled={!selectedContactId || isPending}
                >
                  {isPending ? (
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4 mr-1" />
                  )}
                  Enroll
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {enrollments.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <div className="text-3xl mb-2">👥</div>
            <p className="text-sm text-muted-foreground">
              No contacts enrolled yet.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {enrollments.map((enrollment) => {
            const statusColor =
              ENROLLMENT_STATUS_COLORS[
                enrollment.status as keyof typeof ENROLLMENT_STATUS_COLORS
              ] || "bg-gray-100 text-gray-800";

            return (
              <Card key={enrollment.id} className="overflow-hidden">
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <Link
                        href={`/contacts/${enrollment.contact_id}`}
                        className="text-sm font-medium text-[var(--lf-indigo)] hover:underline block truncate"
                      >
                        {enrollment.contacts?.name || "Unknown Contact"}
                      </Link>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge
                          className={`${statusColor} text-xs px-1.5 py-0`}
                        >
                          {enrollment.status}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          Step {enrollment.current_step} of {stepsCount}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Started{" "}
                        {new Date(enrollment.started_at).toLocaleDateString(
                          "en-CA",
                          {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          }
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {(enrollment.status === "active" ||
                        enrollment.status === "paused") && (
                        <>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0"
                            onClick={() =>
                              onToggleEnrollment(
                                enrollment.id,
                                enrollment.status
                              )
                            }
                            disabled={isPending}
                            title={
                              enrollment.status === "active"
                                ? "Pause"
                                : "Resume"
                            }
                          >
                            {enrollment.status === "active" ? (
                              <Pause className="w-3.5 h-3.5" />
                            ) : (
                              <Play className="w-3.5 h-3.5" />
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 text-red-500 hover:text-red-600"
                            onClick={() =>
                              onExitEnrollment(enrollment.id)
                            }
                            disabled={isPending}
                            title="Exit workflow"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
