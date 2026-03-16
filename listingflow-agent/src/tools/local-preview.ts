import { createServer, IncomingMessage, ServerResponse } from "http";
import { writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";

const PREVIEW_BASE_PORT = 9100;
const activeServers: Map<string, { port: number; close: () => void }> = new Map();

/**
 * Save HTML to a local directory and serve it on a localhost port.
 * Used instead of Cloudflare when LOCAL_PREVIEW=true.
 */
export async function deployLocal(
  projectName: string,
  files: Record<string, string>
): Promise<{ previewUrl: string }> {
  // Write files to disk
  const outDir = join(process.cwd(), ".previews", projectName);
  if (!existsSync(outDir)) {
    mkdirSync(outDir, { recursive: true });
  }

  for (const [path, content] of Object.entries(files)) {
    const filePath = join(outDir, path);
    const dir = filePath.substring(0, filePath.lastIndexOf("/"));
    if (dir && !existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    writeFileSync(filePath, content, "utf-8");
  }

  // Shut down existing server for this project if any
  const existing = activeServers.get(projectName);
  if (existing) {
    existing.close();
    activeServers.delete(projectName);
  }

  // Assign a port
  const port = PREVIEW_BASE_PORT + activeServers.size;

  // Start a simple static server
  const server = createServer((req: IncomingMessage, res: ServerResponse) => {
    // Serve index.html for all requests
    const html = files["index.html"] || "<h1>Not found</h1>";
    res.writeHead(200, {
      "Content-Type": "text/html",
      "Access-Control-Allow-Origin": "*",
    });
    res.end(html);
  });

  await new Promise<void>((resolve) => {
    server.listen(port, () => {
      console.log(`Local preview: http://localhost:${port} (${projectName})`);
      resolve();
    });
  });

  activeServers.set(projectName, {
    port,
    close: () => server.close(),
  });

  return { previewUrl: `http://localhost:${port}` };
}

/**
 * For local mode, "promoting to production" just returns the local URL.
 */
export function promoteLocal(projectName: string): string {
  const server = activeServers.get(projectName);
  if (server) {
    return `http://localhost:${server.port}`;
  }
  return `http://localhost:${PREVIEW_BASE_PORT}`;
}

/**
 * Shut down all local preview servers.
 */
export function shutdownAllPreviews(): void {
  for (const [name, server] of activeServers) {
    console.log(`Shutting down preview: ${name}`);
    server.close();
  }
  activeServers.clear();
}
