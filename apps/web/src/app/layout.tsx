import type { Metadata } from "next";
import { Inter, Space_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { Header } from "@/components/Header";
import { explorerContract } from "@/lib/config";
import { config } from "@/lib/config";

const sans = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const display = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});
const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "PITBOSS — pari-mutuel prediction markets on Stellar",
  description:
    "Permissionless on-chain prediction markets on Stellar. Anyone can spin up a market — every market answers to the boss.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${sans.variable} ${display.variable} ${mono.variable}`}
    >
      <body>
        <Providers>
          <Header />
          <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
          <footer className="mx-auto max-w-6xl px-4 pb-10 pt-8 text-center text-xs text-zinc-600">
            <span className="tabnum">PITBOSS</span> · Stellar testnet · a permissionless
            pari-mutuel prediction-market protocol ·{" "}
            <a
              href={explorerContract(config.factoryId)}
              target="_blank"
              rel="noreferrer"
              className="text-zinc-400 hover:text-boss"
            >
              factory ↗
            </a>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
