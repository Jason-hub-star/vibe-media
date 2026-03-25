/** Kie.ai createTask → poll 공통 패턴. */

const DEFAULT_POLL_INTERVAL_MS = 3000;
const DEFAULT_MAX_POLLS = 100;

export interface KieJobOptions {
  apiBase: string;
  apiKey: string;
  model: string;
  input: Record<string, unknown>;
  pollIntervalMs?: number;
  maxPolls?: number;
}

interface KieTaskResponse {
  code: number;
  data?: { task_id: string };
}

interface KieRecordResponse {
  code: number;
  data?: {
    state: string;
    resultJson?: string;
  };
}

export async function submitAndPollKieJob(options: KieJobOptions): Promise<string[]> {
  const {
    apiBase,
    apiKey,
    model,
    input,
    pollIntervalMs = DEFAULT_POLL_INTERVAL_MS,
    maxPolls = DEFAULT_MAX_POLLS,
  } = options;

  // 1. Create task
  const createRes = await fetch(`${apiBase}/createTask`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model, input }),
  });

  if (!createRes.ok) {
    throw new Error(`Kie createTask failed: ${createRes.status} ${createRes.statusText}`);
  }

  const createBody = (await createRes.json()) as KieTaskResponse;
  const taskId = createBody.data?.task_id;
  if (!taskId) {
    throw new Error("Kie createTask returned no task_id");
  }

  // 2. Poll until completion
  for (let i = 0; i < maxPolls; i++) {
    await delay(pollIntervalMs);

    const pollRes = await fetch(`${apiBase}/recordInfo?taskId=${taskId}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!pollRes.ok) continue;

    const pollBody = (await pollRes.json()) as KieRecordResponse;
    const state = pollBody.data?.state;

    if (state === "success") {
      const resultJson = pollBody.data?.resultJson;
      if (!resultJson) return [];

      try {
        const parsed = JSON.parse(resultJson) as { resultUrls?: string[] };
        return parsed.resultUrls ?? [];
      } catch {
        return [];
      }
    }

    if (state === "failed" || state === "error") {
      throw new Error(`Kie job ${taskId} failed with state: ${state}`);
    }
    // state is "waiting" | "queuing" | "generating" — continue polling
  }

  throw new Error(`Kie job ${taskId} timed out after ${maxPolls} polls`);
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
