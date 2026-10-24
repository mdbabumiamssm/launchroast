import Anthropic from "@anthropic-ai/sdk";

// The product: fetch the customer's landing page and roast it.

const MAX_PAGE_CHARS = 18000;

export async function fetchPageContent(targetUrl: string): Promise<string> {
  let parsed: URL;
  try {
    parsed = new URL(targetUrl);
  } catch {
    throw new Error("That doesn't look like a valid URL. Include https://");
  }
  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("Only http(s) URLs are supported.");
  }
  // Block obvious SSRF targets — we only roast public pages.
  const host = parsed.hostname.toLowerCase();
  if (
    host === "localhost" ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    /^(10\.|127\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|169\.254\.|0\.)/.test(host) ||
    host === "[::1]" ||
    host === "::1"
  ) {
    throw new Error("Private and local addresses can't be roasted.");
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const res = await fetch(parsed.toString(), {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; LaunchRoastBot/1.0; +https://launchroast.vercel.app)",
        Accept: "text/html,application/xhtml+xml",
      },
    });
    if (!res.ok) throw new Error(`The page returned ${res.status}. Is it public?`);
    const html = (await res.text()).slice(0, 600000);

    // Strip scripts/styles, keep visible text + key tags.
    const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim() ?? "";
    const metaDesc =
      html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i)?.[1] ?? "";
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<svg[\s\S]*?<\/svg>/gi, " ")
      .replace(/<!--[\s\S]*?-->/g, " ")
      .replace(/<(h1|h2|h3|button|a)\b[^>]*>/gi, "\n[$1] ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/[ \t]+/g, " ")
      .replace(/\n\s*\n+/g, "\n")
      .trim();

    if (text.length < 80) {
      throw new Error(
        "The page rendered almost no text (likely heavy client-side JS). Try a URL with server-rendered content.",
      );
    }

    return [
      `URL: ${parsed.toString()}`,
      `TITLE: ${title}`,
      `META DESCRIPTION: ${metaDesc}`,
      "",
      "PAGE CONTENT (tags like [h1] [button] [a] mark headings/CTAs/links):",
      text.slice(0, MAX_PAGE_CHARS),
    ].join("\n");
  } finally {
    clearTimeout(timer);
  }
}

const SYSTEM_PROMPT = `You are LaunchRoast — a brutally honest, world-class conversion copywriter and landing page critic. People PAY you $9 to tear their landing page apart so strangers don't silently bounce instead.

Voice: sharp, funny, zero fluff. Roast hard, but every punch must teach. Never cruel about the humans; ruthless about the page. You are specific — you quote their actual copy back at them.

Output EXACTLY this markdown structure:

# 🔥 The Roast: <page/product name>

## Verdict: <score>/10
One devastating-but-fair summary sentence.

## The Roast
3-5 short paragraphs tearing into the page's real problems. Quote their actual copy. Be funny. Every joke lands on a real conversion problem (unclear value prop, weak CTA, no social proof, wall of text, jargon, no urgency, trust gaps, etc.)

## 10 Fixes, In Order of Impact
A numbered list. Each item: **Bold imperative fix.** One sentence on why it moves conversions. Most impactful first.

## Your New Hero Section
Rewrite their hero: a headline (max 8 words), a subheadline (max 20 words), and a CTA button label (max 4 words). Make it concrete and benefit-led, in their product's voice.

## Shareable Burn
One tweet-length line (<200 chars) they could screenshot and share — spicy but flattering enough that they'll actually post it. Mention it came from LaunchRoast.

Rules: base everything on the provided page content only — never invent features or claims you can't see. If the page content is thin, roast that fact itself. No preamble before the first heading.`;

export function streamRoast(pageContent: string) {
  const client = new Anthropic();
  return client.messages.stream({
    model: "claude-opus-4-8",
    max_tokens: 8000,
    thinking: { type: "adaptive" },
    system: [
      {
        type: "text",
        text: SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [
      {
        role: "user",
        content: `Roast this landing page:\n\n${pageContent}`,
      },
    ],
  });
}
