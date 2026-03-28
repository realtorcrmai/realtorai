/**
 * Help Content Parser
 *
 * Parses usecases/*.md files into structured JSON for the help center.
 * Uses gray-matter for frontmatter + section-based extraction.
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
  businessValue: string;
  roles: { name: string; access: string; actions: string }[];
  preconditions: string[];
  keyConcepts: { term: string; definition: string }[];
  coreWorkflow: string[];
  scenarios: {
    name: string;
    role?: string;
    goal?: string;
    preconditions: string[];
    navigation?: string;
    steps: string[];
    expectedBehavior: string[];
    expectedOutcome: string;
    edgeCases: string[];
    commonMistakes: string[];
    recovery: string[];
  }[];
  procedures: {
    title: string;
    whenToUse: string;
    startingPoint: string;
    steps: string[];
    validations: string[];
    whatHappensNext: string;
    commonMistakes: string[];
    recovery: string[];
  }[];
  validationsAndRules: string[];
  roleDifferences: { role: string; canView: string; canEdit: string; canApprove: string; notes: string }[];
  edgeCases: string[];
  troubleshooting: { symptom: string; cause: string; verify: string; fix: string; escalate: string }[];
  features: { name: string; description: string }[];
  faq: { question: string; answer: string }[];
  relatedFeatures: { name: string; relationship: string }[];
  escalationGuidance: string;
  relatedRoutes: string[];
  owner: string;
  lastReviewed: string;
  visibility: "public" | "internal" | "both";
  contentStatus: string;
  changelog: { date: string; change: string; type: string }[];
  rawContent: string;
  wordCount: number;
  scenarioCount: number;
  procedureCount: number;
  faqCount: number;
  troubleshootingCount: number;
  edgeCaseCount: number;
}

export interface ContentValidation {
  slug: string;
  errors: string[];
  warnings: string[];
  score: number; // 0-100
}

// ── Constants ────────────────────────────────────────────────

const USECASES_DIR = path ? path.join(process.cwd(), "usecases") : "";

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

// ── Section Extraction ───────────────────────────────────────

function extractSection(content: string, heading: string): string {
  const sections = content.split(/^(?=## )/m);
  for (const section of sections) {
    const firstLine = section.split("\n")[0] || "";
    if (firstLine.startsWith("## ") && firstLine.toLowerCase().includes(heading.toLowerCase())) {
      return section.replace(/^##\s+.*\n/, "").trim();
    }
  }
  return "";
}

function extractBulletList(section: string): string[] {
  return section
    .split("\n")
    .filter((l) => /^\s*[-*]\s+/.test(l))
    .map((l) => l.replace(/^\s*[-*]\s+/, "").trim())
    .filter(Boolean);
}

function extractNumberedList(section: string): string[] {
  return section
    .split("\n")
    .filter((l) => /^\s*\d+\.\s+/.test(l))
    .map((l) => l.replace(/^\s*\d+\.\s+/, "").trim())
    .filter(Boolean);
}

function extractTable(section: string): Record<string, string>[] {
  const rows = section.split("\n").filter((l) => l.includes("|") && !l.includes("---"));
  if (rows.length < 2) return [];
  const headers = rows[0].split("|").map((c) => c.trim().toLowerCase()).filter(Boolean);
  return rows.slice(1).map((row) => {
    const cells = row.split("|").map((c) => c.trim()).filter(Boolean);
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => { obj[h] = cells[i] || ""; });
    return obj;
  });
}

// ── Section Parsers ──────────────────────────────────────────

function parseProblem(content: string): string {
  const section = extractSection(content, "Problem Statement");
  return section.split(/\n\n/)[0] || section.slice(0, 500);
}

function parseBusinessValue(content: string): string {
  const section = extractSection(content, "Business Value");
  return section.split(/\n\n/)[0] || section.slice(0, 500);
}

function parseRoles(content: string): HelpFeature["roles"] {
  const section = extractSection(content, "Who Uses This") || extractSection(content, "User Roles");
  if (!section) return [];
  const rows = section.split("\n").filter((l) => l.includes("|") && !l.includes("---"));
  return rows.slice(1).map((row) => {
    const cells = row.split("|").map((c) => c.trim().replace(/\*\*/g, "")).filter(Boolean);
    return { name: cells[0] || "", access: cells[1] || "", actions: cells[2] || "" };
  }).filter((r) => r.name);
}

function parsePreconditions(content: string): string[] {
  const section = extractSection(content, "Preconditions");
  return extractBulletList(section);
}

function parseKeyConcepts(content: string): HelpFeature["keyConcepts"] {
  const section = extractSection(content, "Key Concepts");
  if (!section) return [];
  const table = extractTable(section);
  if (table.length > 0) {
    return table.map((r) => ({ term: r.term || r.name || Object.values(r)[0] || "", definition: r.definition || r.description || Object.values(r)[1] || "" }));
  }
  // Fallback: parse "**Term**: Definition" pattern
  return section.split("\n")
    .filter((l) => l.includes("**") && l.includes(":"))
    .map((l) => {
      const match = l.match(/\*\*([^*]+)\*\*[:\s]+(.+)/);
      return match ? { term: match[1], definition: match[2] } : null;
    })
    .filter(Boolean) as HelpFeature["keyConcepts"];
}

function parseCoreWorkflow(content: string): string[] {
  const section = extractSection(content, "Core Workflow");
  return extractNumberedList(section).length > 0 ? extractNumberedList(section) : extractBulletList(section);
}

function parseScenarios(content: string): HelpFeature["scenarios"] {
  const section = extractSection(content, "Scenarios");
  if (!section) return [];
  const scenarios: HelpFeature["scenarios"] = [];
  const blocks = section.split(/\n###\s+(?:Scenario:\s*)?/i).filter(Boolean);

  for (const block of blocks) {
    const lines = block.split("\n");
    const name = lines[0]?.replace(/^#+\s*/, "").trim() || "";
    if (!name) continue;

    const preconditions: string[] = [];
    const steps: string[] = [];
    const edgeCases: string[] = [];
    const expectedBehavior: string[] = [];
    const commonMistakes: string[] = [];
    const recovery: string[] = [];
    let expectedOutcome = "";
    let role = "";
    let goal = "";
    let navigation = "";
    let cur = "";

    for (const line of lines.slice(1)) {
      const t = line.trim();
      if (/^\*?\*?role\*?\*?:/i.test(t)) { role = t.replace(/^\*?\*?role\*?\*?:\s*/i, ""); continue; }
      if (/^\*?\*?goal\*?\*?:/i.test(t)) { goal = t.replace(/^\*?\*?goal\*?\*?:\s*/i, ""); continue; }
      if (/^\*?\*?navigation/i.test(t)) { navigation = t.replace(/^\*?\*?navigation[^:]*:\s*/i, ""); continue; }
      if (/precondition/i.test(t)) { cur = "pre"; continue; }
      if (/^steps?:/i.test(t) || /^\*?\*?steps?\*?\*?:/i.test(t)) { cur = "steps"; continue; }
      if (/expected.*behavior/i.test(t)) { cur = "behavior"; continue; }
      if (/expected.*outcome|success.*outcome/i.test(t)) { cur = "outcome"; continue; }
      if (/edge\s*case/i.test(t)) { cur = "edge"; continue; }
      if (/common.*mistake/i.test(t)) { cur = "mistakes"; continue; }
      if (/recovery/i.test(t) || /how.*recover/i.test(t)) { cur = "recovery"; continue; }

      if (t.startsWith("- ") || t.startsWith("* ")) {
        const item = t.replace(/^[-*]\s+/, "");
        if (cur === "pre") preconditions.push(item);
        else if (cur === "steps") steps.push(item);
        else if (cur === "edge") edgeCases.push(item);
        else if (cur === "behavior") expectedBehavior.push(item);
        else if (cur === "mistakes") commonMistakes.push(item);
        else if (cur === "recovery") recovery.push(item);
      } else if (/^\d+\.\s/.test(t)) {
        const item = t.replace(/^\d+\.\s+/, "");
        if (cur === "steps") steps.push(item);
      } else if (t && cur === "outcome") {
        expectedOutcome += (expectedOutcome ? " " : "") + t;
      }
    }

    scenarios.push({ name, role, goal, preconditions, navigation, steps, expectedBehavior, expectedOutcome, edgeCases, commonMistakes, recovery });
  }
  return scenarios;
}

function parseProcedures(content: string): HelpFeature["procedures"] {
  const section = extractSection(content, "Procedures") || extractSection(content, "Step-by-Step");
  if (!section) return [];
  const procedures: HelpFeature["procedures"] = [];
  const blocks = section.split(/\n###\s+(?:Procedure:\s*)?/i).filter(Boolean);

  for (const block of blocks) {
    const lines = block.split("\n");
    const title = lines[0]?.replace(/^#+\s*/, "").trim() || "";
    if (!title) continue;

    let whenToUse = "", startingPoint = "", whatHappensNext = "";
    const steps: string[] = [];
    const validations: string[] = [];
    const commonMistakes: string[] = [];
    const recoverySteps: string[] = [];
    let cur = "";

    for (const line of lines.slice(1)) {
      const t = line.trim();
      if (/when to use/i.test(t)) { cur = "when"; continue; }
      if (/starting point|route:/i.test(t)) { cur = "start"; startingPoint = t.replace(/^\*?\*?starting point\*?\*?:?\s*/i, ""); continue; }
      if (/^steps?$/i.test(t) || /^\*?\*?steps?\*?\*?$/i.test(t)) { cur = "steps"; continue; }
      if (/validation/i.test(t)) { cur = "val"; continue; }
      if (/what happens next/i.test(t)) { cur = "next"; continue; }
      if (/common.*mistake/i.test(t)) { cur = "mistakes"; continue; }
      if (/how to recover|recovery/i.test(t)) { cur = "recovery"; continue; }

      if (t.startsWith("- ") || t.startsWith("* ")) {
        const item = t.replace(/^[-*]\s+/, "");
        if (cur === "val") validations.push(item);
        else if (cur === "mistakes") commonMistakes.push(item);
        else if (cur === "recovery") recoverySteps.push(item);
        else if (cur === "steps") steps.push(item);
      } else if (/^\d+\.\s/.test(t)) {
        if (cur === "steps") steps.push(t.replace(/^\d+\.\s+/, ""));
      } else if (t) {
        if (cur === "when") whenToUse += (whenToUse ? " " : "") + t;
        else if (cur === "start") startingPoint += (startingPoint ? " " : "") + t;
        else if (cur === "next") whatHappensNext += (whatHappensNext ? " " : "") + t;
      }
    }

    procedures.push({ title, whenToUse, startingPoint, steps, validations, whatHappensNext, commonMistakes, recovery: recoverySteps });
  }
  return procedures;
}

function parseValidationsAndRules(content: string): string[] {
  const section = extractSection(content, "Validations") || extractSection(content, "Rules");
  return extractBulletList(section);
}

function parseRoleDifferences(content: string): HelpFeature["roleDifferences"] {
  const section = extractSection(content, "Role Differences");
  if (!section) return [];
  const table = extractTable(section);
  return table.map((r) => ({
    role: r.role || Object.values(r)[0] || "",
    canView: r["can view"] || "",
    canEdit: r["can edit"] || "",
    canApprove: r["can approve"] || r["can approve/publish"] || "",
    notes: r["special notes"] || r.notes || "",
  })).filter((r) => r.role);
}

function parseEdgeCases(content: string): string[] {
  const section = extractSection(content, "Edge Cases");
  const bullets = extractBulletList(section);
  if (bullets.length > 0) return bullets;
  // Try numbered list
  return extractNumberedList(section);
}

function parseTroubleshooting(content: string): HelpFeature["troubleshooting"] {
  const section = extractSection(content, "Troubleshooting");
  if (!section) return [];
  const table = extractTable(section);
  if (table.length > 0) {
    return table.map((r) => ({
      symptom: r.symptom || Object.values(r)[0] || "",
      cause: r["likely cause"] || r.cause || Object.values(r)[1] || "",
      verify: r["how to verify"] || r.verify || Object.values(r)[2] || "",
      fix: r["how to fix"] || r.fix || Object.values(r)[3] || "",
      escalate: r["when to escalate"] || r.escalate || Object.values(r)[4] || "",
    }));
  }
  return [];
}

function parseFeatures(content: string): HelpFeature["features"] {
  const section = extractSection(content, "Features");
  if (!section) return [];
  return section.split(/\n###\s+/).filter(Boolean).map((block) => {
    const lines = block.split("\n");
    return {
      name: lines[0]?.trim() || "",
      description: lines.slice(1).filter((l) => l.trim() && !l.trim().startsWith("**Step ID")).map((l) => l.trim()).join(" ").slice(0, 500),
    };
  }).filter((f) => f.name);
}

function parseFAQ(content: string): HelpFeature["faq"] {
  const section = extractSection(content, "FAQ");
  if (!section) return [];
  return section.split(/\n###\s+/).filter(Boolean).map((block) => {
    const lines = block.split("\n");
    const question = (lines[0]?.replace(/\?$/, "").trim() || "") + "?";
    const answer = lines.slice(1).filter((l) => l.trim()).map((l) => l.trim()).join(" ");
    return { question, answer };
  }).filter((f) => f.question.length > 1 && f.answer);
}

function parseRelatedFeatures(content: string): HelpFeature["relatedFeatures"] {
  const section = extractSection(content, "Related Features");
  if (!section) return [];
  const table = extractTable(section);
  if (table.length > 0) {
    return table.map((r) => ({ name: r.feature || r.name || Object.values(r)[0] || "", relationship: r.relationship || Object.values(r)[1] || "" }));
  }
  return extractBulletList(section).map((item) => ({ name: item, relationship: "" }));
}

function parseEscalation(content: string): string {
  const section = extractSection(content, "Escalation");
  return section.slice(0, 1000);
}

// ── Content Validation ───────────────────────────────────────

export function validateFeature(f: HelpFeature): ContentValidation {
  const errors: string[] = [];
  const warnings: string[] = [];
  let score = 100;

  // Frontmatter
  if (!f.owner || f.owner === "unknown") { warnings.push("Missing owner"); score -= 2; }
  if (!f.lastReviewed) { warnings.push("Missing last_reviewed"); score -= 2; }
  if (f.relatedRoutes.length === 0 && f.slug !== "voice-agent") { warnings.push("No related_routes"); score -= 2; }

  // Content depth
  if (f.problem.split(/\s+/).length < 30) { errors.push("Problem statement too short (min 30 words)"); score -= 10; }
  if (f.roles.length === 0) { warnings.push("No roles documented"); score -= 5; }
  if (f.scenarioCount < 3) { errors.push(`Only ${f.scenarioCount} scenarios (min 3)`); score -= 10; }
  if (f.faqCount < 3) { errors.push(`Only ${f.faqCount} FAQ items (min 3)`); score -= 10; }
  if (f.procedureCount === 0) { warnings.push("No procedures"); score -= 5; }
  if (f.troubleshootingCount === 0) { warnings.push("No troubleshooting items"); score -= 5; }
  if (f.edgeCaseCount === 0) { warnings.push("No edge cases"); score -= 3; }
  if (!f.businessValue) { warnings.push("No business value section"); score -= 3; }
  if (f.preconditions.length === 0) { warnings.push("No preconditions listed"); score -= 2; }
  if (f.coreWorkflow.length === 0) { warnings.push("No core workflow steps"); score -= 3; }

  // Placeholder detection
  // Only flag lines that ARE placeholder text, not descriptions of placeholders
  const placeholderLines = f.rawContent.split("\n").filter((line) => {
    const trimmed = line.trim();
    return /^(tbd|todo|coming soon|lorem ipsum|placeholder text|example text|sample content)[.!]?$/i.test(trimmed) ||
      /^\[?(tbd|todo|coming soon)\]?$/i.test(trimmed);
  });
  if (placeholderLines.length > 0) { errors.push("Contains placeholder text: " + placeholderLines[0].trim()); score -= 20; }

  return { slug: f.slug, errors, warnings, score: Math.max(0, score) };
}

// ── Main API ─────────────────────────────────────────────────

export function getAllFeatures(): HelpFeature[] {
  if (!fs || !fs.existsSync(USECASES_DIR)) return [];
  return fs.readdirSync(USECASES_DIR)
    .filter((f: string) => f.endsWith(".md"))
    .map((file: string) => parseUseCaseFile(fs.readFileSync(path.join(USECASES_DIR, file), "utf-8"), file.replace(".md", "")))
    .filter(Boolean) as HelpFeature[];
}

export function getFeature(slug: string): HelpFeature | null {
  if (!fs || !path) return null;
  const fp = path.join(USECASES_DIR, `${slug}.md`);
  if (!fs.existsSync(fp)) return null;
  return parseUseCaseFile(fs.readFileSync(fp, "utf-8"), slug);
}

export function getFeatureForRoute(route: string): HelpFeature | null {
  const all = getAllFeatures();
  return all.find((f) => f.relatedRoutes.some((r) => r === route)) ||
    all.find((f) => f.relatedRoutes.some((r) => r !== "/" && route.startsWith(r))) || null;
}

function parseUseCaseFile(raw: string, slug: string): HelpFeature | null {
  try {
    const { data: fm, content } = matter(raw);
    const title = ((fm.title as string) || content.match(/^#\s+(.+)/m)?.[1] || slug).replace(/^["']|["']$/g, "");
    const scenarios = parseScenarios(content);
    const procedures = parseProcedures(content);
    const faq = parseFAQ(content);
    const troubleshooting = parseTroubleshooting(content);
    const edgeCases = parseEdgeCases(content);

    return {
      slug, title,
      problem: parseProblem(content),
      businessValue: parseBusinessValue(content),
      roles: parseRoles(content),
      preconditions: parsePreconditions(content),
      keyConcepts: parseKeyConcepts(content),
      coreWorkflow: parseCoreWorkflow(content),
      scenarios, procedures, faq, troubleshooting, edgeCases,
      validationsAndRules: parseValidationsAndRules(content),
      roleDifferences: parseRoleDifferences(content),
      features: parseFeatures(content),
      relatedFeatures: parseRelatedFeatures(content),
      escalationGuidance: parseEscalation(content),
      relatedRoutes: (fm.related_routes as string[]) || [],
      owner: (fm.owner as string) || "unknown",
      lastReviewed: (fm.last_reviewed as string) || "",
      visibility: (fm.visibility as "public" | "internal" | "both") || "public",
      contentStatus: (fm.content_status as string) || "approved",
      changelog: (fm.changelog as HelpFeature["changelog"]) || [],
      rawContent: content,
      wordCount: content.split(/\s+/).length,
      scenarioCount: scenarios.length,
      procedureCount: procedures.length,
      faqCount: faq.length,
      troubleshootingCount: troubleshooting.length,
      edgeCaseCount: edgeCases.length,
    };
  } catch { return null; }
}
