---
title: "Help Center"
slug: "help-center"
owner: rahul
last_reviewed: "2026-03-27"
visibility: internal
related_routes: ["/help"]
changelog:
  - date: "2026-03-27"
    change: "Initial implementation — Phase 1-8"
    type: new_content
---

# Help Center

## Problem Statement

BC realtors using ListingFlow need to understand features, see examples, and get answers without leaving the CRM. Knowledge lives in markdown files that users never see, and onboarding requires 1:1 training. The help center turns existing use cases, test scenarios, and AI agent knowledge into a self-service documentation system.

## User Roles

| Role | Access | Primary Actions |
|------|--------|-----------------|
| **Listing Agent** | Full help center | Browse guides, take tours, search, give feedback |
| **Transaction Coordinator** | Full help center | Browse compliance and forms guides |
| **New User** | Full + onboarding checklist | Complete getting started checklist, take guided tours |
| **Public Visitor** | /docs only (no auth) | Read articles, see scenarios, SEO landing |

## Features

### Help Home (/help)
Feature cards for all 10 use cases, Getting Started section, scenario/feature counts per card.

### Feature Detail (/help/[slug])
4-tab view: Overview (roles, routes, stats), Use Cases (expandable scenarios), Features, FAQ.
Feedback controls (thumbs up/down with tags). Tour launcher buttons.

### Contextual ? Button
Page-aware help popover in AppHeader. Maps CRM routes to help slugs.

### Cmd+K Command Palette
Global search across help articles, CRM data, and quick actions. Question-like queries route to help.

### Guided Tours (driver.js)
Interactive walkthroughs using data-tour attributes. 5 predefined tours with DOM resilience.

### Onboarding Checklist
Persistent widget tracking 7 real CRM actions. Shows for first 30 days. localStorage state.

### Feedback Controls
Thumbs up/down + tagged negative feedback. Stored in help_events table.

### Public SEO Docs (/docs/[slug])
Unauthenticated read-only articles with Schema.org structured data and CTA.

## Scenarios

### Scenario: New Agent Onboarding
**Preconditions:**
- New user account created
- Zero data in CRM

**Steps:**
1. User logs in, sees onboarding checklist (bottom-right)
2. Clicks "Create your first contact" → navigates to /contacts
3. Creates a contact → checklist item checks automatically
4. Returns to dashboard, clicks ? button → sees contextual help
5. Navigates to /help → browses feature cards
6. Clicks "Listing Workflow" → reads guide, clicks "Start Tour"
7. Tour highlights UI elements step by step

**Expected Outcome:**
Agent completes 7/7 checklist items within first week. Understands core features without 1:1 training.

### Scenario: Agent Searches for Compliance Help
**Preconditions:**
- Agent is on /listings page working on a listing

**Steps:**
1. Agent presses Cmd+K
2. Types "how do I handle FINTRAC for a corporation"
3. Sees help result: "FINTRAC Compliance"
4. Clicks result → navigates to /help/fintrac-compliance
5. Reads FAQ section on corporate buyers

**Expected Outcome:**
Agent finds answer in <30 seconds without leaving CRM context.

### Scenario: Public SEO Landing
**Preconditions:**
- Prospective buyer searches Google for "FINTRAC requirements BC realtor CRM"

**Steps:**
1. Google shows ListingFlow /docs/fintrac-compliance with FAQ rich snippet
2. User clicks → sees public article with scenarios and FAQ
3. Reads content → clicks "Get Started" CTA
4. Redirected to /login

**Expected Outcome:**
Organic traffic from BC realtor searches. Conversion path from docs to signup.
