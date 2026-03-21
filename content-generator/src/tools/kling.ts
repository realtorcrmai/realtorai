import jwt from "jsonwebtoken";

const KLING_BASE_URL =
  process.env.KLING_API_BASE_URL ?? "https://api.klingai.com";

export interface KlingVideoRequest {
  imageUrl: string;
  prompt: string;
  aspectRatio?: "9:16" | "16:9" | "1:1";
  duration?: number;
}

export interface KlingImageRequest {
  prompt: string;
  aspectRatio?: "1:1" | "9:16" | "16:9";
}

export interface KlingTaskStatus {
  taskId: string;
  status: "pending" | "processing" | "completed" | "failed";
  outputUrl?: string;
  errorMessage?: string;
}

/** Generate a JWT token from access key + secret key (valid 30 min) */
function getAuthToken(): string {
  const accessKey = process.env.KLING_ACCESS_KEY ?? "";
  const secretKey = process.env.KLING_SECRET_KEY ?? "";

  if (!accessKey || !secretKey) {
    throw new Error("KLING_ACCESS_KEY and KLING_SECRET_KEY are required");
  }

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: accessKey,
    exp: now + 1800, // 30 minutes
    nbf: now - 5,
    iat: now,
  };

  return jwt.sign(payload, secretKey, {
    algorithm: "HS256",
    header: { alg: "HS256", typ: "JWT" },
  });
}

export async function startVideoGeneration(
  req: KlingVideoRequest
): Promise<string> {
  const token = getAuthToken();
  const res = await fetch(`${KLING_BASE_URL}/v1/videos/image2video`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      image: req.imageUrl,
      prompt: req.prompt,
      cfg_scale: 0.5,
      mode: "std",
      duration: String(req.duration ?? 5),
      aspect_ratio: req.aspectRatio ?? "9:16",
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Kling video API error: ${res.status} - ${errorText}`);
  }

  const data = await res.json();
  const taskId = data.data?.task_id ?? data.task_id ?? data.id ?? "";
  if (!taskId) {
    throw new Error(`Kling video API returned no task_id: ${JSON.stringify(data)}`);
  }
  return taskId;
}

export async function startImageGeneration(
  req: KlingImageRequest
): Promise<string> {
  const token = getAuthToken();
  const res = await fetch(`${KLING_BASE_URL}/v1/images/generations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      prompt: req.prompt,
      aspect_ratio: req.aspectRatio ?? "1:1",
      n: 1,
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Kling image API error: ${res.status} - ${errorText}`);
  }

  const data = await res.json();
  const taskId = data.data?.task_id ?? data.task_id ?? data.id ?? "";
  if (!taskId) {
    throw new Error(`Kling image API returned no task_id: ${JSON.stringify(data)}`);
  }
  return taskId;
}

export async function getTaskStatus(taskId: string): Promise<KlingTaskStatus> {
  const token = getAuthToken();

  // Try images endpoint first, then videos
  let res = await fetch(`${KLING_BASE_URL}/v1/images/generations/${taskId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    // Try video endpoint
    res = await fetch(`${KLING_BASE_URL}/v1/videos/image2video/${taskId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  if (!res.ok) {
    return {
      taskId,
      status: "failed",
      errorMessage: `Failed to check status: ${res.status}`,
    };
  }

  const body = await res.json();
  const data = body.data ?? body;
  const rawStatus = (data.task_status ?? data.status ?? "").toLowerCase();

  let status: KlingTaskStatus["status"] = "processing";
  if (rawStatus === "succeed" || rawStatus === "success" || rawStatus === "completed") {
    status = "completed";
  } else if (rawStatus === "failed" || rawStatus === "error") {
    status = "failed";
  } else if (rawStatus === "submitted" || rawStatus === "pending" || rawStatus === "queued") {
    status = "pending";
  }

  // Extract output URL from task result
  const works = data.task_result?.images ?? data.task_result?.videos ?? [];
  const outputUrl = works[0]?.url ?? works[0]?.video_url ?? undefined;

  return {
    taskId,
    status,
    outputUrl,
    errorMessage: data.task_status_msg ?? data.error_message ?? data.error ?? undefined,
  };
}
