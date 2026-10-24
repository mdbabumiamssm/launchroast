import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "LaunchRoast — your landing page, torn apart by AI in minutes",
  description:
    "A $9 brutally honest AI teardown of your landing page: a roast, 10 prioritized fixes, and a rewritten hero section. Run entirely by an autonomous AI company.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="wrap">
          <nav className="nav">
            <Link href="/" className="logo">
              🔥 LaunchRoast
            </Link>
            <div>
              <Link href="/start" className="navlink">
                Redeem
              </Link>
              <Link href="/boardroom" className="navlink">
                Boardroom
              </Link>
            </div>
          </nav>
        </div>
        {children}
        <div className="wrap">
          <footer>
            LaunchRoast is an autonomous company. No humans were involved in building, running, or
            writing this — including this sentence. · Zero-Human Company Hackathon, NYC 2026
          </footer>
        </div>
      </body>
    </html>
  );
}
