<!-- docs-audit-reviewed: 2026-04-21 -->
<!-- docs-audit: src/app/api/tasks/** -->
# Test Case Book: Task / Activity Functionality

**Date:** 2026-04-20
**Tester:** Claude (Playwright MCP)
**Application:** Realtors360 CRM — Tasks Page (`/tasks`)
**Scope:** Full functional testing of Task CRUD, Comments, Pipeline, Bulk Operations

---

## Test Environment

| Item | Value |
|------|-------|
| URL | `http://localhost:3000/tasks` |
| Auth | Demo login (auto-session) |
| Browser | Playwright (Chromium) |
| DB | Supabase (live dev) |

---

## TC-01: Page Load & Pipeline Display

| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| 1.1 | Tasks page loads | Navigate to `/tasks` | Page renders with PageHeader "Tasks", subtitle shows task count | |
| 1.2 | Pipeline renders | Check pipeline section | 3 phases visible: To Do, In Progress, Completed with counts | |
| 1.3 | Progress bar shows | Check progress bar | Green bar reflects completion percentage | |
| 1.4 | "All Tasks" card shows | Check task list card | Card header "All Tasks" with count, tasks listed | |
| 1.5 | Loading state | Navigate fresh | Loading spinner appears briefly, then tasks load | |
| 1.6 | Create Task button visible | Check PageHeader actions | "Create Task" button with + icon visible in header | |
| 1.7 | Empty state (if no tasks) | Delete all tasks | "No tasks yet" message with "Create a task to start" subtext | |

---

## TC-02: Task Creation — All Permutations

### TC-02A: Minimum Fields (Title Only)

| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| 2A.1 | Open create dialog | Click "Create Task" button | Dialog opens with title "Create New Task" | |
| 2A.2 | Create with title only | Enter title, click "Create Task" | Task created, toast "Task created", dialog closes, task appears in list | |
| 2A.3 | Default priority | Check created task | Priority defaults to "medium" | |
| 2A.4 | Default category | Check created task | Category defaults to "general" | |
| 2A.5 | Default status | Check created task | Status is "pending" (circle icon) | |
| 2A.6 | Empty title rejected | Clear title, submit | Validation error "Title is required" | |
| 2A.7 | Whitespace-only title | Enter spaces only, submit | Validation error (title.trim() is empty) | |

### TC-02B: All Fields Populated

| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| 2B.1 | Full task creation | Fill: title, description, priority=High, category=Follow Up, due date, contact, listing | All fields saved correctly, task shows in list with all details | |
| 2B.2 | Description displays | Check task card | Description text shown under title (line-clamp-2) | |
| 2B.3 | Priority flag color | Check task card | High priority shows orange/red flag icon | |
| 2B.4 | Category badge | Check task card | "Follow Up" badge visible in task metadata | |
| 2B.5 | Due date displays | Check task card | Due date shown with calendar icon | |
| 2B.6 | Contact link displays | Check task card | Contact name with user icon, clickable link | |
| 2B.7 | Listing link displays | Check task card | Listing address (truncated at 25 chars) with building icon | |

### TC-02C: Priority Permutations (4 values)

| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| 2C.1 | Low priority | Create task, priority=Low | Green/grey flag, sorts after higher priorities | |
| 2C.2 | Medium priority | Create task, priority=Medium | Default, yellow/amber flag | |
| 2C.3 | High priority | Create task, priority=High | Orange/red flag | |
| 2C.4 | Urgent priority | Create task, priority=Urgent | Red flag, sorts first | |

### TC-02D: Category Permutations (8 values)

| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| 2D.1 | General | Create task, category=General | Badge shows "General" | |
| 2D.2 | Follow Up | Create task, category=Follow Up | Badge shows "Follow Up" | |
| 2D.3 | Showing | Create task, category=Showing | Badge shows "Showing" | |
| 2D.4 | Document | Create task, category=Document | Badge shows "Document" | |
| 2D.5 | Listing | Create task, category=Listing | Badge shows "Listing" | |
| 2D.6 | Marketing | Create task, category=Marketing | Badge shows "Marketing" | |
| 2D.7 | Inspection | Create task, category=Inspection | Badge shows "Inspection" | |
| 2D.8 | Closing | Create task, category=Closing | Badge shows "Closing" | |

### TC-02E: Optional Field Permutations

| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| 2E.1 | No description | Leave description blank | Task created without description, no description line shows | |
| 2E.2 | No due date | Leave due date blank | Task created without date, no calendar icon shows | |
| 2E.3 | No contact | Leave contact as "None" | Task created without contact link | |
| 2E.4 | No listing | Leave listing as "None" | Task created without listing link | |
| 2E.5 | Contact only (no listing) | Select contact, no listing | Contact link shows, no listing link | |
| 2E.6 | Listing only (no contact) | Select listing, no contact | Listing link shows, no contact link | |
| 2E.7 | Both contact and listing | Select both | Both links visible on task card | |
| 2E.8 | Cancel create dialog | Click Cancel button | Dialog closes, no task created | |
| 2E.9 | Close dialog via X | Click X button on dialog | Dialog closes, no task created | |

---

## TC-03: Task Editing — All Permutations

| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| 3.1 | Open edit dialog | Hover task, click pencil icon | Edit dialog opens with "Edit Task" title, pre-filled fields | |
| 3.2 | Edit title | Change title, save | Title updated, toast "Task updated", dialog closes | |
| 3.3 | Edit description | Change description, save | Description updated on card | |
| 3.4 | Change priority | Switch from medium→urgent, save | Priority flag color changes | |
| 3.5 | Change category | Switch from general→showing, save | Category badge updates | |
| 3.6 | Set due date | Add due date, save | Due date appears on card | |
| 3.7 | Remove due date | Clear due date field, save | Date disappears from card | |
| 3.8 | Link contact | Select contact from dropdown, save | Contact name appears on card | |
| 3.9 | Unlink contact | Change contact to "None", save | Contact link removed from card | |
| 3.10 | Link listing | Select listing from dropdown, save | Listing address appears on card | |
| 3.11 | Unlink listing | Change listing to "None", save | Listing link removed from card | |
| 3.12 | Cancel edit | Click Cancel | No changes saved, dialog closes | |
| 3.13 | Pre-filled values check | Open edit on task with all fields | All fields match current task values | |
| 3.14 | Edit empty title rejected | Clear title, submit | Validation error prevents save | |

---

## TC-04: Status Transitions & Pipeline Updates

| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| 4.1 | Pending → In Progress | Click circle icon on pending task | Status changes to in_progress, clock icon appears, toast "Task updated" | |
| 4.2 | In Progress → Completed | Click clock icon on in_progress task | Status changes to completed, check icon, strike-through title, toast "Task completed!" | |
| 4.3 | Completed → Pending (reopen) | Click check icon on completed task | Status reverts to pending, circle icon | |
| 4.4 | Quick complete (arrow) | Click arrow (→) button on task | Task marked completed immediately | |
| 4.5 | Pipeline count: pending | After status change | To Do count updates correctly | |
| 4.6 | Pipeline count: in_progress | After status change | In Progress count updates correctly | |
| 4.7 | Pipeline count: completed | After status change | Completed count updates, progress bar advances | |
| 4.8 | Completed tasks sort last | Check list order | Completed tasks appear at bottom of list | |
| 4.9 | Completed task opacity | Check visual style | Completed tasks have reduced opacity (opacity-60) | |
| 4.10 | Completed task strikethrough | Check title | Title has line-through text style | |
| 4.11 | No quick-complete on completed | Check completed task | Arrow (→) button hidden on completed tasks | |

---

## TC-05: Task Deletion

| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| 5.1 | Delete button visible on hover | Hover over task card | Trash icon appears (on desktop) | |
| 5.2 | Confirmation dialog | Click trash icon | Browser confirm: 'Delete "Task Title"? This cannot be undone.' | |
| 5.3 | Confirm delete | Click OK on confirm | Task removed from list, toast "Task deleted", pipeline counts update | |
| 5.4 | Cancel delete | Click Cancel on confirm | Task remains, no changes | |
| 5.5 | List refreshes after delete | Confirm delete | Task list reloads without deleted task | |

---

## TC-06: Bulk Selection & Completion

| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| 6.1 | Select All button visible | Page with tasks loaded | "Select all" text appears in card header | |
| 6.2 | Select individual task | Click circle on pending task | Checkbox fills with brand color (CheckCircle2), floating bar appears | |
| 6.3 | Floating action bar | Select 1+ tasks | Bottom bar shows: "X selected", Clear button, "Mark Complete" button | |
| 6.4 | Select All | Click "Select all" | All non-completed tasks selected, button changes to "Deselect all" | |
| 6.5 | Deselect All | Click "Deselect all" | All tasks deselected, floating bar disappears | |
| 6.6 | Clear button | Click "Clear" on floating bar | Selection cleared, bar disappears | |
| 6.7 | Bulk Mark Complete | Select 2+ tasks, click "Mark Complete" | All selected tasks marked completed, toast "X tasks marked complete" | |
| 6.8 | Completed not selectable | Check completed task | No selection toggle on completed tasks | |
| 6.9 | Selection count accurate | Select/deselect various tasks | Floating bar count matches actual selection | |
| 6.10 | Selection clears on refresh | Complete an action | Selection resets after task list reloads | |

---

## TC-07: Task Comments

| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| 7.1 | Comment toggle button | Check task card | Message icon visible with comment count (if > 0) | |
| 7.2 | Open comments | Click message icon | Comments section expands below task | |
| 7.3 | Empty comments state | Open comments on task with none | "No comments yet" message | |
| 7.4 | Add comment | Type text, click Send button | Comment appears with author initial, name, time "just now" | |
| 7.5 | Add comment via Enter | Type text, press Enter | Comment posted (same as clicking Send) | |
| 7.6 | Empty comment blocked | Leave input empty, click Send | Button disabled, nothing happens | |
| 7.7 | Delete comment | Hover comment, click trash icon | Comment removed from list | |
| 7.8 | Multiple comments | Add 3 comments | All 3 visible in chronological order | |
| 7.9 | Close comments | Click message icon again | Comments section collapses | |
| 7.10 | Comment count updates | Add a comment | Count badge on message icon increments | |
| 7.11 | Comment time format | Check timestamps | Shows relative time (just now, Xm ago, Xh ago) | |

---

## TC-08: Sorting & Overdue Highlighting

| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| 8.1 | Overdue tasks first | Have tasks with past due dates | Overdue tasks appear at top of list | |
| 8.2 | Overdue visual style | Check overdue task | Red border, red-tinted background, warning triangle icon | |
| 8.3 | Overdue badge in pipeline | Check To Do / In Progress phase | "X overdue" destructive badge shows if overdue tasks exist | |
| 8.4 | Priority sort | Have tasks at different priorities | Urgent > High > Medium > Low ordering | |
| 8.5 | Due date sort (within priority) | Same priority, different dates | Earlier dates sort first | |
| 8.6 | No due date sorts last | Task without date vs with date | Tasks with dates sort before dateless tasks | |
| 8.7 | Completed always last | Mix of statuses | Completed tasks always at bottom regardless of priority/date | |

---

## TC-09: Contact/Listing Links & Navigation

| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| 9.1 | Contact link renders | Task with linked contact | Contact name shown with User icon | |
| 9.2 | Contact link navigates | Click contact name | Navigates to `/contacts/{id}` detail page | |
| 9.3 | Listing link renders | Task with linked listing | Listing address shown with Building icon (truncated >25 chars) | |
| 9.4 | Listing link navigates | Click listing address | Navigates to `/listings/{id}` detail page | |
| 9.5 | Long address truncation | Task linked to long-address listing | Address truncated with "..." after 25 chars | |

---

## Summary

| Test Group | Count | Description |
|------------|-------|-------------|
| TC-01: Page Load & Pipeline | 7 | Basic page rendering |
| TC-02A: Create (Minimum) | 7 | Title-only creation |
| TC-02B: Create (All Fields) | 7 | Full field creation |
| TC-02C: Create (Priority) | 4 | Priority permutations |
| TC-02D: Create (Category) | 8 | Category permutations |
| TC-02E: Create (Optional) | 9 | Optional field combos |
| TC-03: Editing | 14 | Edit all fields |
| TC-04: Status Transitions | 11 | Status flow & pipeline |
| TC-05: Deletion | 5 | Delete with confirmation |
| TC-06: Bulk Operations | 10 | Multi-select & bulk complete |
| TC-07: Comments | 11 | Comment CRUD |
| TC-08: Sorting & Overdue | 7 | Sort order & visual alerts |
| TC-09: Links & Navigation | 5 | Entity link navigation |
| **TOTAL** | **105** | |

---

## Execution Log

_(Filled in during test execution)_

<!-- Last reviewed: 2026-04-21 — Wave 1a demo gate -->
