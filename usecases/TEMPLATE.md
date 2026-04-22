# Use Cases: <feature-name>

<!-- Required for CODING:feature at medium or large tier. -->
<!-- Block: playbook-gate.sh prevents Edit/Write on src/** until this exists with 3+ scenarios. -->

## Problem statement

One paragraph. What is the user trying to accomplish that they currently can't?

## Primary user role

Who is this for? (realtor, client, admin, new_agent persona)

## Existing context

What exists in the codebase that relates to this? Why isn't that sufficient?

## Scenarios

### Scenario 1: <happy path>

**Preconditions:**
- <required state>

**Steps:**
1. <user action>
2. <user action>
3. <user action>

**Expected outcome:**
- <what the user sees>
- <what persists in the DB>
- <any side effects — notifications sent, tasks scheduled, etc.>

**Edge cases to handle:**
- <case 1 and expected behavior>
- <case 2 and expected behavior>

### Scenario 2: <alternate path or secondary user>

Same structure as above.

### Scenario 3: <failure / recovery>

Same structure as above. MUST cover at least one failure mode (network error, permission denied, invalid data, etc.) and the expected user-facing behavior.

## Success metrics

How will we know this feature is successful? Not vague ("users like it") but specific ("reduces time to export from 5 minutes to under 30 seconds").

## Non-goals

What this feature deliberately does NOT do. Prevents scope creep mid-implementation.
