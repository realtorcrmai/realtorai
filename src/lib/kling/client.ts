const KLING_VIDEO_URL =
  process.env.KLING_API_BASE_URL ?? "https://api.klingai.com/v1";
const KLING_IMAGE_URL =
  process.env.KLING_IMAGE_API_BASE_URL ?? "https://api.klingai.com/v1";

interface KlingVideoRequest {
  imageUrl: string;
  prompt: string;
  aspectRatio?: "9:16" | "16:9" | "1:1";
  duration?: number;
}

interface KlingImageRequest {
  prompt: string;
  aspectRatio?: "1:1" | "9:16" | "16:9";
}

export interface KlingTaskStatus {
  taskId: string;
  status: "pending" | "processing" | "completed" | "failed";
  outputUrl?: string;
  errorMessage?: string;
}

export async function startVideoGeneration(
  req: KlingVideoRequest
): Promise<string> {
  const res = await fetch(`${KLING_VIDEO_URL}/images/generations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.KLING_API_KEY ?? ""}`,
    },
    body: JSON.stringify({
      image_url: req.imageUrl,
      prompt: req.prompt,
      aspect_ratio: req.aspectRatio ?? "9:16",
      duration: req.duration ?? 5,
      mode: "professional",
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Kling video API error: ${res.status} - ${errorText}`);
  }

  const data = await res.json();
  return data.task_id ?? data.id ?? "";
}

export async function startImageGeneration(
  req: KlingImageRequest
): Promise<string> {
  const res = await fetch(`${KLING_IMAGE_URL}/images/generations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.KLING_API_KEY ?? ""}`,
    },
    body: JSON.stringify({
      prompt: req.prompt,
      aspect_ratio: req.aspectRatio ?? "1:1",
      resolution: "8k",
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Kling image API error: ${res.status} - ${errorText}`);
  }

  const data = await res.json();
  return data.task_id ?? data.id ?? "";
}

export async function getTaskStatus(taskId: string): Promise<KlingTaskStatus> {
  const res = await fetch(`${KLING_VIDEO_URL}/tasks/${taskId}`, {
    headers: {
      Authorization: `Bearer ${process.env.KLING_API_KEY ?? ""}`,
    },
  });

  if (!res.ok) {
    return {
      taskId,
      status: "failed",
      errorMessage: `Failed to check status: ${res.status}`,
    };
  }

  const data = await res.json();
  const rawStatus = (data.status ?? "").toUpperCase();

  let status: KlingTaskStatus["status"] = "processing";
  if (rawStatus === "SUCCESS" || rawStatus === "COMPLETED") {
    status = "completed";
  } else if (rawStatus === "FAILED" || rawStatus === "ERROR") {
    status = "failed";
  } else if (rawStatus === "PENDING" || rawStatus === "QUEUED") {
    status = "pending";
  }

  const outputUrl =
    data.output?.video_url ??
    data.output?.image_url ??
    data.result?.video_url ??
    data.result?.image_url ??
    undefined;

  return {
    taskId,
    status,
    outputUrl,
    errorMessage: data.error_message ?? data.error ?? undefined,
  };
}
