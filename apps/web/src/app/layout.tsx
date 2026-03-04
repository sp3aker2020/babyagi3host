import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BabyAgi3 Host — Managed BabyAGI Hosting",
  description: "Launch your own AI agent in seconds. Pay with SOL, get a managed BabyAGI 3 instance. Persistent memory, Python-based agents with email and SMS integration.",
  keywords: ["babyagi", "ai agent", "solana", "bot hosting", "agent host", "anthropic"],
  openGraph: {
    title: "BabyAgi3 Host — Managed BabyAGI Hosting",
    description: "Your personal autonomous AI agent, hosted. Pay with SOL.",
    type: "website",
  },
};

import SolanaProvider from "@/components/SolanaProvider";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <SolanaProvider>
          {children}
        </SolanaProvider>
      </body>
    </html>
  );
}
