# 🔥 LaunchRoast — an autonomous company that roasts landing pages for money

Built for the **Zero-Human Company Hackathon** (Terac × Whop, NYC, Oct 24 2026).

**The pitch:** every builder in this room is shipping a landing page today, and every one of those pages has conversion problems. LaunchRoast sells a $9, 3-minute, brutally honest AI teardown — a roast, 10 fixes ranked by conversion impact, and a rewritten hero section. Payment → delivery → QA → marketing all run without a human on payroll.

🌐 **Live:** https://launchroast-nine.vercel.app · 💳 **Payments:** [Whop](https://whop.com/biomedsai/launchroast-landing-page-teardown/) · 🧑‍🔬 **Human-in-the-loop:** Terac · 🎬 **Demo video:** https://youtu.be/MA4VmyQIez0

---

## Tracks targeted

| Track | How we qualify |
|---|---|
| **Best Agent-Run Company** | Real $9 sales through Whop; CEO agent autonomously prices, markets, and operates |
| **Best Use of Terac** | A/B study on Terac's General Population panel decided the product's voice — clear before/after (see below) |
| **Best Use of Exa** | Every roast uses Exa search to pull the customer's real competitive landscape into the critique |
| **Best Overall** | Zero-human loop: sell → fulfill → QA → market → iterate |

## The Terac before/after (human-in-the-loop)

1. **Before:** `npm run study <url>` generates the same landing-page critique in two product styles — Variant A "Brutal Roast" vs Variant B "Straight-Talk Coach" (`study/brief.md`).
2. **The humans:** a Terac study (General Population) asks panelists which version they'd pay $9 for, trust more, and share — plus what would make it worth $19.
3. **After:** the winning style ships as the production prompt, the vote counts and the decision are published in the public [Boardroom](/boardroom), and the $19-upsell answers seed the next product decision. Separately, every delivered roast files a per-task Terac QA review.

## How the company runs itself

```
                      ┌──────────────────────────────────────────┐
                      │            CEO agent (Claude)            │
                      │  agent/ceo.mjs — runs on a 20-min loop   │
                      │  reads sales → decides → markets → hires │
                      └───────┬──────────────────┬───────────────┘
                              │ decisions         │ human tasks
                              ▼                   ▼
   Buyer ──$9──> Whop ──webhook──> /api/webhook   Terac (expert labor MCP)
     │                                            ▲
     │ license key                                │ QA task per roast
     ▼                                            │
   /start ──> /api/roast ── validate license (Whop API)
                      └──── fetch page → Claude Opus 4.8 roast → stream to buyer
```

1. **Sell** — Whop checkout on the landing page. Revenue tracked on the Whop Business ID.
2. **Fulfill** — buyer redeems their Whop license key at `/start`, pastes a URL; the server verifies the purchase against the Whop API, scrapes the page, and streams a Claude-generated roast live.
3. **Human-in-the-loop (Terac)** — every delivered roast automatically files a $1 Terac QA task for a human expert to PASS/FAIL. The CEO agent also delegates growth tasks (e.g., "post this in the hackathon Slack") to Terac humans.
4. **Operate** — the CEO agent (`agent/ceo.mjs`) loops: pulls sales from the Whop API, makes one business decision per cycle (pricing, marketing, ops), writes marketing copy, files Terac tasks, and appends every decision to the public **[Boardroom](/boardroom)** — the company's governance is literally open to inspection.

## Stack

- **Next.js 14** (App Router, streaming responses) on **Vercel**
- **Claude Opus 4.8** (`@anthropic-ai/sdk`) — roast engine + CEO agent, adaptive thinking, prompt caching
- **Whop API** — checkout, license validation, webhooks, revenue tracking
- **Terac** — human panel studies (product A/B) + per-task QA and growth tasks
- **Exa** — competitive-landscape search grounding every roast

## Run it

```bash
cp .env.example .env.local   # fill in keys
npm install
npm run dev                  # app on :3000

npm run agent                # one CEO cycle
npm run agent:loop           # CEO runs the company continuously
```

### Environment

| Var | What |
|---|---|
| `ANTHROPIC_API_KEY` | Roast engine + CEO agent |
| `WHOP_API_KEY` | License validation + sales reads (dev mode if unset) |
| `NEXT_PUBLIC_WHOP_CHECKOUT_URL` | The buy button target |
| `WHOP_WEBHOOK_SECRET` | HMAC verification for `/api/webhook` |
| `TERAC_API_URL` / `TERAC_API_KEY` | Human-in-the-loop tasks (studies run via the Terac MCP) |
| `EXA_API_KEY` | Competitive-landscape search in roasts |
| `DEMO_CODES` | Comma-separated bypass codes for judging |

## Where the humans are (and aren't)

- **Zero humans** build the product, set prices, write marketing, or handle fulfillment.
- **Per-task humans via Terac**: QA review of each roast ($1/task), and physical-world actions the agent can't take (posting in community spaces). Hired, briefed, and paid by the agent.

## Demo script (2 min)

1. Landing page (15s) — the offer.
2. Buy on Whop ($9) → license key (20s).
3. Redeem at `/start`, roast streams live on a real page (45s).
4. Show the Terac QA task filed automatically (15s).
5. The Boardroom: CEO decision log + a live `npm run agent` cycle making a decision and writing new marketing (25s).
