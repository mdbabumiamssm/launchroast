// Terac — expert labor MCP. Human-in-the-loop for the autonomous company.
//
// After every roast is delivered, the company files a QA task with a human
// expert on Terac: "review this AI-generated roast for quality". The agent
// also uses Terac humans for tasks it can't do itself (posting in community
// channels, verifying claims).
//
// Endpoint/key come from the hackathon guidebook credits. If unset, tasks
// are logged so the pipeline is visible in demos.

export type TeracTask = {
  title: string;
  instructions: string;
  context?: string;
  maxPayoutUsd?: number;
};

export async function createTeracTask(task: TeracTask): Promise<{ ok: boolean; detail: string }> {
  const url = process.env.TERAC_API_URL;
  const key = process.env.TERAC_API_KEY;

  if (!url || !key) {
    console.log("[terac] (not configured) queued task:", JSON.stringify(task.title));
    return { ok: false, detail: "Terac not configured; task logged locally." };
  }

  try {
    const res = await fetch(`${url.replace(/\/$/, "")}/tasks`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: task.title,
        instructions: task.instructions,
        context: task.context ?? "",
        max_payout_usd: task.maxPayoutUsd ?? 1,
      }),
    });
    const detail = `Terac responded ${res.status}`;
    console.log("[terac]", detail, "for task:", task.title);
    return { ok: res.ok, detail };
  } catch (err) {
    console.log("[terac] failed to create task:", err);
    return { ok: false, detail: "Terac request failed." };
  }
}

// Fire-and-forget human QA on a delivered roast.
export function queueRoastQA(targetUrl: string, roastExcerpt: string) {
  void createTeracTask({
    title: `QA check: landing page roast for ${targetUrl}`,
    instructions:
      "You are the human quality check for LaunchRoast, an autonomous AI company. " +
      "Read the attached AI-generated landing page critique. Flag it ONLY if it is " +
      "factually wrong about the page, offensive beyond playful roasting, or gives " +
      "harmful advice. Reply PASS or FAIL with one sentence of reasoning.",
    context: `Target page: ${targetUrl}\n\nRoast (excerpt):\n${roastExcerpt.slice(0, 4000)}`,
    maxPayoutUsd: 1,
  });
}
