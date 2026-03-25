/** Kie.ai Nano Banana 2 image generation client. */

const KIE_API_BASE = "https://api.kie.ai/api/v1/jobs";
const MODEL = "nano-banana-2";
const POLL_INTERVAL = 3000;
const MAX_POLLS = 100;

export interface KieGenerateOptions {
  apiKey?: string;
  aspectRatio?: string;
  resolution?: "1K" | "2K" | "4K";
  imageInput?: string[];
}

export interface KieGeneratedResult {
  imageUrls: string[];
}

export async function generateImageWithKie(
  prompt: string,
  options?: KieGenerateOptions,
): Promise<KieGeneratedResult> {
  const apiKey = options?.apiKey ?? process.env.KIE_API_KEY;
  if (!apiKey) {
    throw new Error("KIE_API_KEY not configured");
  }

  const headers = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };

  const createRes = await fetch(`${KIE_API_BASE}/createTask`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: MODEL,
      input: {
        prompt,
        aspect_ratio: options?.aspectRatio ?? "1:1",
        resolution: options?.resolution ?? "1K",
        output_format: "jpg",
        google_search: false,
        image_input: options?.imageInput ?? [],
      },
    }),
  });

  if (!createRes.ok) {
    throw new Error(`Kie.ai createTask failed: ${createRes.status}`);
  }

  const createData = (await createRes.json()) as {
    code: number;
    msg: string;
    data?: { taskId: string };
  };

  if (createData.code !== 200 || !createData.data?.taskId) {
    throw new Error(`Kie.ai createTask error: ${createData.msg}`);
  }

  const { taskId } = createData.data;

  for (let i = 0; i < MAX_POLLS; i++) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL));

    const pollRes = await fetch(
      `${KIE_API_BASE}/recordInfo?taskId=${taskId}`,
      { headers },
    );

    if (!pollRes.ok) continue;

    const pollData = (await pollRes.json()) as {
      code: number;
      data?: {
        state: string;
        resultJson?: string;
        failMsg?: string | null;
      };
    };

    const state = pollData.data?.state;

    if (state === "success") {
      const resultJson = pollData.data?.resultJson;
      if (!resultJson) throw new Error("Kie.ai: empty resultJson");

      const parsed = JSON.parse(resultJson) as { resultUrls?: string[] };
      if (!parsed.resultUrls?.length) {
        throw new Error("Kie.ai: no result URLs");
      }

      return { imageUrls: parsed.resultUrls };
    }

    if (state === "fail") {
      throw new Error(
        `Kie.ai generation failed: ${pollData.data?.failMsg ?? "unknown"}`,
      );
    }
  }

  throw new Error("Kie.ai generation timed out");
}
