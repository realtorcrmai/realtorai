/**
 * Help Content Parser
 *
 * Parses usecases/*.md files into structured JSON for the help center.
 * Uses gray-matter for frontmatter + regex-based section extraction.
 * Server-side only — functions return empty results when called from client.
 */

// Dynamic imports to avoid bundling Node.js modules in client components
// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = typeof window === "undefined" ? require("fs") : null;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = typeof window === "undefined" ? require("path") : null;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const matter = typeof window === "undefined" ? require("gray-matter") : null;

// ── Types ────────────────────────────────────────────────────

export interface HelpFeature {
  slug: string;
  title: string;
  problem: string;
  roles: { name: string; access: string; actions: string }[];
  scenarios: {
    name: string;
    preconditions: string[];
    steps: string[];
    expectedOutcome: string;
    edgeCases: string[];
  }[];
  features: { name: string; description: string }[];
  faq: { question: string; answer: string }[];
  relatedRoutes: string[];
  owner: string;
  lastReviewed: string;
  visibility: "public" | "internal" | "both";
  changelog: { date: string; change: string; type: string }[];
  rawContent: string;
  wordCount: number;
  scenarioCount: number;
}

// ── Constants ────────────────────────────────────────────────

const USECASES_DIR = path ? path.join(process.cwd(), "usecases") : "";

// emoji icons per feature (for cards)
const FEATURE_ICONS: Record<string, string> = {
  "listing-workflow": "🏠",
  "contact-management": "👥",
  "showing-management": "🔑",
  "deal-pipeline": "💰",
  "email-marketing-engine": "📧",
  "ai-content-engine": "✨",
  "bc-forms-generation": "📋",
  "fintrac-compliance": "🛡️",
  "voice-agent": "🎙️",
  "workflow-automations": "⚡",
};

export function getFeatureIcon(slug: string): string {
  return FEATURE_ICONS[slug] || "📖";
}

// ── Parsers ──────────────────────────────────────────────────

function extractSection(content: string, heading: string): string {
  // Find a section whose heading CONTAINS the keyword (case-insensitive)
  // Split by ## headings and find the matching one
  const sections = content.split(/^(?=## )/m);
  for (const section of sections) {
    const firstLine = section.split("\n")[0] || "";
    if (firstLine.startsWith("## ") && firstLine.toLowerCase().includes(heading.toLowerCase())) {
      // Return everything after the heading line
      return section.replace(/^##\s+.*\n/, "").trim();
    }
  }
  return "";
}

function parseProblemStatement(content: string): string {
  const section = extractSection(content, "Problem Statement");
  // Take first paragraph (up to double newline)
  const para = section.split(/\n\n/)[0];
  return para || section.slice(0, 300);
}

function parseRoles(content: string): HelpFeature["roles"] {
  const section = extractSection(content, "User Roles");
  if (!section) return [];

  const roles: HelpFeature["roles"] = [];
  // Parse markdown table rows
  const rows = section.split("\n").filter((line) => line.includes("|") && !line.includes("---"));
  for (const row of rows.slice(1)) {
    // skip header
    const cells = row
      .split("|")
      .map((c) => c.trim())
      .filter(Boolean);
    if (cells.length >= 3) {
      roles.push({
        name: cells[0].replace(/\*\*/g, ""),
        access: cells[1],
        actions: cells[2],
      });
    }
  }
  return roles;
}

function parseScenarios(content: string): HelpFeature["scenarios"] {
  const section = extractSection(content, "Scenarios");
  if (!section) return [];

  const scenarios: HelpFeature["scenarios"] = [];
  // Split by ### Scenario: headings
  const blocks = section.split(/\n###\s+(?:Scenario:\s*)?/i).filter(Boolean);

  for (const block of blocks) {
    const lines = block.split("\n");
    const name = lines[0]?.replace(/^#+\s*/, "").trim() || "Unnamed";

    // Extract sub-sections
    const preconditions: string[] = [];
    const steps: string[] = [];
    const edgeCases: string[] = [];
    let expectedOutcome = "";
    let currentSection = "";

    for (const line of lines.slice(1)) {
      const trimmed = line.trim();
      if (/precondition/i.test(trimmed)) {
        currentSection = "pre";
        continue;
      }
      if (/^steps?:/i.test(trimmed) || /^step\s+\d/i.test(trimmed)) {
        currentSection = "steps";
        continue;
      }
      if (/expected\s+outcome/i.test(trimmed)) {
        currentSection = "outcome";
        continue;
      }
      if (/edge\s+case/i.test(trimmed)) {
        currentSection = "edge";
        continue;
      }

      if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
        const item = trimmed.replace(/^[-*]\s+/, "");
        if (currentSection === "pre") preconditions.push(item);
        else if (currentSection === "edge") edgeCases.push(item);
        else if (currentSection === "steps") steps.push(item);
      } else if (/^\d+\.\s/.test(trimmed)) {
        const item = trimmed.replace(/^\d+\.\s+/, "");
        if (currentSection === "steps") steps.push(item);
      } else if (trimmed && currentSection === "outcome") {
        expectedOutcome += (expectedOutcome ? " " : "") + trimmed;
      }
    }

    if (name && name !== "Unnamed") {
      scenarios.push({ name, preconditions, steps, expectedOutcome, edgeCases });
    }
  }
  return scenarios;
}

function parseFeatures(content: string): HelpFeature["features"] {
  const section = extractSection(content, "Features");
  if (!section) return [];

  const features: HelpFeature["features"] = [];
  const blocks = section.split(/\n###\s+/).filter(Boolean);

  for (const block of blocks) {
    const lines = block.split("\n");
    const name = lines[0]?.trim() || "";
    const description = lines
      .slice(1)
      .filter((l) => l.trim() && !l.trim().startsWith("**Step ID"))
      .map((l) => l.trim())
      .join(" ")
      .slice(0, 300);
    if (name) features.push({ name, description });
  }
  return features;
}

function parseFAQ(content: string): HelpFeature["faq"] {
  const section = extractSection(content, "FAQ");
  if (!section) return [];

  const faq: HelpFeature["faq"] = [];
  const blocks = section.split(/\n###\s+/).filter(Boolean);

  for (const block of blocks) {
    const lines = block.split("\n");
    const question = lines[0]?.replace(/\?$/, "").trim() + "?";
    const answer = lines
      .slice(1)
      .filter((l) => l.trim())
      .map((l) => l.trim())
      .join(" ");
    if (question && answer) faq.push({ question, answer });
  }
  return faq;
}

// ── Main API ─────────────────────────────────────────────────

export function getAllFeatures(): HelpFeature[] {
  if (!fs || !fs.existsSync(USECASES_DIR)) return [];

  const files = fs.readdirSync(USECASES_DIR).filter((f) => f.endsWith(".md"));
  return files
    .map((file) => {
      const raw = fs.readFileSync(path.join(USECASES_DIR, file), "utf-8");
      return parseUseCaseFile(raw, file.replace(".md", ""));
    })
    .filter(Boolean) as HelpFeature[];
}

export function getFeature(slug: string): HelpFeature | null {
  if (!fs || !path) return null;
  const filePath = path.join(USECASES_DIR, `${slug}.md`);
  if (!fs.existsSync(filePath)) return null;
  const raw = fs.readFileSync(filePath, "utf-8");
  return parseUseCaseFile(raw, slug);
}

export function getFeatureForRoute(route: string): HelpFeature | null {
  const features = getAllFeatures();
  // Exact match first
  const exact = features.find((f) =>
    f.relatedRoutes.some((r) => r === route)
  );
  if (exact) return exact;
  // Prefix match (e.g., /listings/123 matches /listings)
  const prefix = features.find((f) =>
    f.relatedRoutes.some((r) => r !== "/" && route.startsWith(r))
  );
  return prefix || null;
}

function parseUseCaseFile(raw: string, slug: string): HelpFeature | null {
  try {
    const { data: fm, content } = matter(raw);

    const title =
      (fm.title as string) ||
      content.match(/^#\s+(.+)/m)?.[1] ||
      slug;

    const problem = parseProblemStatement(content);
    const roles = parseRoles(content);
    const scenarios = parseScenarios(content);
    const features = parseFeatures(content);
    const faq = parseFAQ(content);
    const wordCount = content.split(/\s+/).length;

    return {
      slug,
      title: title.replace(/^["']|["']$/g, ""),
      problem,
      roles,
      scenarios,
      features,
      faq,
      relatedRoutes: (fm.related_routes as string[]) || [],
      owner: (fm.owner as string) || "unknown",
      lastReviewed: (fm.last_reviewed as string) || "",
      visibility: (fm.visibility as "public" | "internal" | "both") || "public",
      changelog: (fm.changelog as HelpFeature["changelog"]) || [],
      rawContent: content,
      wordCount,
      scenarioCount: scenarios.length,
    };
  } catch {
    return null;
  }
}
