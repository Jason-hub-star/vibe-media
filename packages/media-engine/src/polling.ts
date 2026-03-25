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

export async function submitAndPollKieJob(options: KieJobOptions): Promise<string[]> {
  const { apiBase, apiKey, model, input, pollIntervalMs = DEFAULT_POLL_INTERVAL_MS, maxPolls = DEFAULT_MAX_POLLS } = options;

  const createRes = await fetch(`${apiBase}/createTask`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model, input }),
  });
  if (!createRes.ok) throw new Error(`Kie createTask failed: ${createRes.status}`);

  const createBody = (await createRes.json()) as { data?: { task_id: string } };
  const taskId = createBody.data?.task_id;
  if (!taskId) throw new Error("Kie createTask returned no task_id");

  for (let i = 0; i < maxPolls; i++) {
    await new Promise((r) => setTimeout(r, pollIntervalMs));
    const pollRes = await fetch(`${apiBase}/recordInfo?taskId=${taskId}`, { headers: { Authorization: `Bearer ${apiKey}` } });
    if (!pollRes.ok) continue;
    const pollBody = (await pollRes.json()) as { data?: { state: string; resultJson?: string } };
    const state = pollBody.data?.state;
    if (state === "success") {
      try { return (JSON.parse(pollBody.data?.resultJson ?? "{}") as { resultUrls?: string[] }).resultUrls ?? []; }
      catch { return []; }
    }
    if (state === "failed" || state === "error") throw new Error(`Kie job ${taskId} failed: ${state}`);
  }
  throw new Error(`Kie job ${taskId} timed out after ${maxPolls} polls`);
}
