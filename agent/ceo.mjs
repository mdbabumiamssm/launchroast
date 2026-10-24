#!/usr/bin/env node
// LaunchRoast CEO — the autonomous agent that runs the company.
//
// Each cycle it:
//   1. Pulls current sales from Whop (if WHOP_API_KEY is set)
//   2. Reviews its own decision log
//   3. Asks Claude to make the next business decision + write fresh marketing
//   4. Appends the decision to agent/log.json (the public Boardroom)
//   5. Files any human tasks through Terac
//   6. With --push: commits and pushes, which redeploys the public Boardroom
//
// Run once:        node agent/ceo.mjs
// Run forever:     node agent/ceo.mjs --loop          (every 20 min)
// Also push:       node agent/ceo.mjs --loop --push

import Anthropic from "@anthropic-ai/sdk";
import { readFileSync, writeFileSync } from "fs";
import { execSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const here = path.dirname(fileURLToPath(import.meta.url));
const LOG_PATH = path.join(here, "log.json");
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://launchroast.vercel.app";
const LOOP = process.argv.includes("--loop");
const PUSH = process.argv.includes("--push");
const INTERVAL_MS = 20 * 60 * 1000;

async function getSales() {
  const key = process.env.WHOP_API_KEY;
  if (!key) return { known: false, note: "Whop not connected yet" };
  try {
    const res = await fetch("https://api.whop.com/api/v2/payments?per=50", {
      headers: { Authorization: `Bearer ${key}` },
    });
    if (!res.ok) return { known: false, note: `Whop API ${res.status}` };
    const data = await res.json();
    const payments = data?.data ?? [];
    const revenueUsd = payments.reduce((s, p) => s + (Number(p.final_amount ?? p.total ?? 0) || 0), 0);
    return { known: true, count: payments.length, revenueUsd };
  } catch (e) {
    return { known: false, note: "Whop unreachable" };
  }
}

async function createTeracTask(task) {
  const url = process.env.TERAC_API_URL;
  const key = process.env.TERAC_API_KEY;
  if (!url || !key) {
    console.log(`[terac] (not configured) would file: ${task.title}`);
    return;
  }
  try {
    const res = await fetch(`${url.replace(/\/$/, "")}/tasks`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        title: task.title,
        instructions: task.instructions,
        max_payout_usd: task.maxPayoutUsd ?? 2,
      }),
    });
    console.log(`[terac] filed "${task.title}" -> ${res.status}`);
  } catch (e) {
    console.log("[terac] failed:", e.message);
  }
}

async function cycle() {
  const log = JSON.parse(readFileSync(LOG_PATH, "utf8"));
  const sales = await getSales();
  const client = new Anthropic();

  const prompt = `You are the CEO of LaunchRoast, a fully autonomous company.
Product: $9 brutally-honest AI landing-page teardown, delivered in ~3 minutes at ${APP_URL}.
Customers: founders and hackathon builders launching pages TODAY. Many are physically at the Zero-Human Company Hackathon at Whop HQ (Slack + in-person).
It is ${new Date().toUTCString()}. Deadline to maximize revenue: 8:30 PM EDT today.

Current sales data: ${JSON.stringify(sales)}
Your past decisions (most recent last):
${log.entries.slice(-8).map((e) => `- [${e.kind}] ${e.decision} — ${e.why}`).join("\n")}

Make ONE new concrete business decision for this cycle and produce marketing to execute it.`;

  const response = await client.messages.parse({
    model: "claude-opus-4-8",
    max_tokens: 4000,
    thinking: { type: "adaptive" },
    messages: [{ role: "user", content: prompt }],
    output_config: {
      format: {
        type: "json_schema",
        schema: {
          type: "object",
          properties: {
            kind: {
              type: "string",
              enum: ["pricing", "marketing", "operations", "product", "hiring"],
            },
            decision: { type: "string", description: "One sentence: the decision made this cycle." },
            why: { type: "string", description: "One sentence: the business reasoning." },
            slack_post: {
              type: "string",
              description: "A short, punchy post for the hackathon Slack selling LaunchRoast. Include the URL. No hashtags.",
            },
            tweet: { type: "string", description: "A tweet (<280 chars) marketing LaunchRoast. Include the URL." },
            terac_task: {
              type: "string",
              description: "One task to delegate to a human via Terac this cycle (e.g. 'post the Slack message in the hackathon channel and reply to 3 threads'). Empty string if none.",
            },
          },
          required: ["kind", "decision", "why", "slack_post", "tweet", "terac_task"],
          additionalProperties: false,
        },
      },
    },
  });

  const d = response.parsed_output;
  if (!d) {
    console.log("[ceo] model returned no parseable decision; skipping cycle");
    return;
  }

  log.entries.push({ at: new Date().toISOString(), kind: d.kind, decision: d.decision, why: d.why });
  writeFileSync(LOG_PATH, JSON.stringify(log, null, 2) + "\n");

  console.log("\n=== CEO CYCLE ===");
  console.log(`DECISION [${d.kind}]: ${d.decision}`);
  console.log(`WHY: ${d.why}`);
  console.log(`\n--- Slack post (copy into hackathon Slack) ---\n${d.slack_post}`);
  console.log(`\n--- Tweet ---\n${d.tweet}`);

  if (d.terac_task) {
    await createTeracTask({
      title: `LaunchRoast growth task (${new Date().toISOString().slice(11, 16)} UTC)`,
      instructions: d.terac_task + `\n\nMarketing copy to use:\n${d.slack_post}`,
      maxPayoutUsd: 2,
    });
  }

  if (PUSH) {
    try {
      execSync('git add agent/log.json && git commit -m "ceo: cycle decision" && git push', {
        cwd: path.join(here, ".."),
        stdio: "inherit",
      });
    } catch {
      console.log("[ceo] git push failed (auth?); log saved locally.");
    }
  }
}

async function main() {
  do {
    try {
      await cycle();
    } catch (e) {
      console.error("[ceo] cycle failed:", e.message);
    }
    if (LOOP) {
      console.log(`\n[ceo] sleeping ${INTERVAL_MS / 60000} min…`);
      await new Promise((r) => setTimeout(r, INTERVAL_MS));
    }
  } while (LOOP);
}

main();
