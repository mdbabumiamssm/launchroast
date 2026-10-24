#!/usr/bin/env node
// Terac study generator — the human-in-the-loop experiment.
//
// Hackathon criterion: "Use real human input you collect during the hackathon
// to make your project measurably better... show a clear before and after."
//
// This script generates TWO versions of the product (the roast) for the same
// landing page:
//   Variant A — "Brutal Roast"   (current production prompt style)
//   Variant B — "Straight-Talk Coach" (candid but constructive, no jokes)
//
// It writes study/brief.md containing both outputs plus the exact study to
// launch on Terac's General Population panel. Panelists answer: which version
// would you pay $9 for? The winning style ships to production, and the
// decision is recorded in the public Boardroom — that's the before/after.
//
// Usage: node agent/study.mjs <landing-page-url>

import Anthropic from "@anthropic-ai/sdk";
import { writeFileSync, mkdirSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const here = path.dirname(fileURLToPath(import.meta.url));
const url = process.argv[2];
if (!url) {
  console.error("Usage: node agent/study.mjs <landing-page-url>");
  process.exit(1);
}

const STYLES = {
  A: {
    name: "Brutal Roast",
    system:
      "You are LaunchRoast — a brutally honest, funny conversion copywriter. Roast the page hard; every joke must land on a real conversion problem. Quote their actual copy. Output: a verdict score /10, a 3-paragraph roast, 10 fixes ranked by impact, and a rewritten hero (headline, subheadline, CTA).",
  },
  B: {
    name: "Straight-Talk Coach",
    system:
      "You are LaunchRoast — a candid, warm, world-class conversion coach. No jokes, no mockery: direct, specific, encouraging. Quote their actual copy. Output: a verdict score /10, a 3-paragraph candid assessment, 10 fixes ranked by impact, and a rewritten hero (headline, subheadline, CTA).",
  },
};

async function fetchPage(target) {
  const res = await fetch(target, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; LaunchRoastBot/1.0)" },
  });
  const html = await res.text();
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .slice(0, 15000);
}

async function generate(client, style, page) {
  const stream = client.messages.stream({
    model: "claude-opus-4-8",
    max_tokens: 6000,
    thinking: { type: "adaptive" },
    system: style.system,
    messages: [{ role: "user", content: `Critique this landing page (${url}):\n\n${page}` }],
  });
  const msg = await stream.finalMessage();
  return msg.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("");
}

const client = new Anthropic();
const page = await fetchPage(url);
console.log(`Fetched ${url} (${page.length} chars). Generating variants…`);

const [a, b] = await Promise.all([
  generate(client, STYLES.A, page),
  generate(client, STYLES.B, page),
]);

const brief = `# LaunchRoast — Terac Study Brief
Generated: ${new Date().toISOString()}
Target page: ${url}

## Study to launch on Terac (General Population)

**Title:** Which paid product output is worth $9?

**Instructions to panelists:**
You're shown two AI-written critiques of the same startup landing page, written in
two different styles. Imagine you built that landing page and paid $9 for a critique.

1. Which version feels more worth the $9? (A / B)
2. Which version would you trust more to improve your sales? (A / B)
3. Which version would you screenshot and share? (A / B)
4. In one sentence: what would make either version worth $19 instead of $9?

**Target responses:** 15-25, General Population.

**How we use results (the before/after):** the winning style becomes the production
prompt in lib/roast.ts; question 4's answers drive the next product decision. Both
the decision and the vote counts get published to the public Boardroom.

---

## VERSION A — ${STYLES.A.name}

${a}

---

## VERSION B — ${STYLES.B.name}

${b}
`;

mkdirSync(path.join(here, "..", "study"), { recursive: true });
const out = path.join(here, "..", "study", "brief.md");
writeFileSync(out, brief);
console.log(`\nStudy brief written to ${out}`);
console.log("Next: launch it via the Terac MCP (or dashboard), targeting General Population.");
