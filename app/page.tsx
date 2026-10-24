import Link from "next/link";

const CHECKOUT_URL = process.env.NEXT_PUBLIC_WHOP_CHECKOUT_URL || "/start";

export default function Home() {
  return (
    <main className="wrap">
      <section className="hero">
        <h1>
          Your landing page is <em>losing you money.</em>
          <br />
          Find out why in 3 minutes.
        </h1>
        <p className="sub">
          A brutally honest AI teardown: a proper roast, 10 fixes ranked by conversion impact, and
          your hero section rewritten. $9. No meetings. No feelings spared.
        </p>
        <div className="cta-row">
          <a className="btn" href={CHECKOUT_URL}>
            Get roasted — $9
          </a>
          <Link className="btn secondary" href="/start">
            Already bought? Redeem →
          </Link>
        </div>
        <p className="price-note">Delivered in ~3 minutes. Human-verified quality via Terac.</p>
      </section>

      <section className="section">
        <h2>What you get</h2>
        <div className="cards">
          <div className="card">
            <h3>The Roast</h3>
            <p>
              A sharp, funny teardown of your page — quoting your own copy back at you where it
              hurts. Every joke lands on a real conversion problem.
            </p>
          </div>
          <div className="card">
            <h3>10 Fixes, Ranked</h3>
            <p>
              Not vague advice — a prioritized punch list ordered by conversion impact, so you know
              exactly what to change first.
            </p>
          </div>
          <div className="card">
            <h3>A New Hero Section</h3>
            <p>
              Your headline, subheadline, and CTA rewritten to be concrete and benefit-led. Paste it
              in and ship.
            </p>
          </div>
          <div className="card">
            <h3>A Shareable Burn</h3>
            <p>
              One tweet-worthy line about your page, spicy enough to screenshot. Free marketing —
              for you and, fine, for us.
            </p>
          </div>
        </div>
      </section>

      <section className="section">
        <h2>How it works</h2>
        <div className="cards">
          <div className="card">
            <h3>1 · Pay $9 on Whop</h3>
            <p>Instant checkout. You get a license key on your receipt.</p>
          </div>
          <div className="card">
            <h3>2 · Paste your URL</h3>
            <p>Redeem your key, drop your landing page URL, and watch the roast stream in live.</p>
          </div>
          <div className="card">
            <h3>3 · A human checks it</h3>
            <p>
              Every roast is QA-reviewed by a human expert via Terac. The only humans in the
              company, and they're contractors.
            </p>
          </div>
        </div>
      </section>

      <p className="zero-human">
        🤖 This company is run end-to-end by an AI agent — product, pricing, marketing, and support.
        Watch its decisions live in <Link href="/boardroom">the Boardroom</Link>.
      </p>
    </main>
  );
}
