/**
 * Cloudflare Pages Direct Upload API.
 * Deploys static HTML files to Cloudflare Pages.
 */

const CF_API = "https://api.cloudflare.com/client/v4";

function getHeaders(): Record<string, string> {
  return {
    Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
  };
}

function getAccountId(): string {
  return process.env.CLOUDFLARE_ACCOUNT_ID || "";
}

/**
 * Create a Cloudflare Pages project (idempotent — ignores "already exists" errors).
 */
export async function createProject(projectName: string): Promise<void> {
  const res = await fetch(
    `${CF_API}/accounts/${getAccountId()}/pages/projects`,
    {
      method: "POST",
      headers: { ...getHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({
        name: projectName,
        production_branch: "main",
      }),
    }
  );

  const data = await res.json();
  if (!data.success && !data.errors?.some((e: { code: number }) => e.code === 8000007)) {
    // 8000007 = project already exists
    console.error("Failed to create project:", data.errors);
    throw new Error(`Failed to create CF project: ${JSON.stringify(data.errors)}`);
  }
}

/**
 * Deploy files to Cloudflare Pages via Direct Upload.
 * Returns the deployment URL.
 */
export async function deployFiles(
  projectName: string,
  files: Record<string, string>
): Promise<{ deploymentUrl: string; deploymentId: string }> {
  const formData = new FormData();

  // Add each file to the form data
  for (const [path, content] of Object.entries(files)) {
    const blob = new Blob([content], { type: "text/html" });
    formData.append(path, blob, path);
  }

  const res = await fetch(
    `${CF_API}/accounts/${getAccountId()}/pages/projects/${projectName}/deployments`,
    {
      method: "POST",
      headers: getHeaders(),
      body: formData,
    }
  );

  const data = await res.json();
  if (!data.success) {
    console.error("Deploy failed:", data.errors);
    throw new Error(`Deploy failed: ${JSON.stringify(data.errors)}`);
  }

  const deployment = data.result;
  return {
    deploymentUrl: deployment.url,
    deploymentId: deployment.id,
  };
}

/**
 * Promote a deployment to production.
 */
export async function promoteToProduction(
  projectName: string,
  deploymentId: string
): Promise<string> {
  const res = await fetch(
    `${CF_API}/accounts/${getAccountId()}/pages/projects/${projectName}/deployments/${deploymentId}/retry`,
    {
      method: "POST",
      headers: getHeaders(),
    }
  );

  // The production URL is just projectname.pages.dev
  return `https://${projectName}.pages.dev`;
}

/**
 * Generate a safe project name from the agent's name.
 */
export function generateProjectName(agentName: string, styleName: string): string {
  const base = agentName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 30);
  return `${base}-${styleName.replace(/_/g, "-")}`;
}
