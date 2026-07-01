"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { WalletButton } from "./WalletButton";
import { Tape } from "./Tape";
import { BossMark } from "./BossMark";

const NAV = [
  { href: "/", label: "Markets" },
  { href: "/create", label: "Create" },
  { href: "/admin", label: "Oracle" },
];

export function Header() {
  const path = usePathname();
  const isActive = (href: string) =>
    href === "/" ? path === "/" : path.startsWith(href);

  return (
    <header className="sticky top-0 z-40 border-b border-white/5 bg-pit-950/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="flex items-center gap-2.5">
          <BossMark />
          <div className="leading-none">
            <div className="font-display text-lg font-bold tracking-tight text-white">
              PIT<span className="text-boss">BOSS</span>
            </div>
            <div className="hidden text-[10px] uppercase tracking-[0.2em] text-zinc-500 sm:block">
              every market answers to the boss
            </div>
          </div>
        </Link>

        <nav className="hidden items-center gap-1 sm:flex">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                isActive(n.href)
                  ? "bg-white/5 text-white"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              {n.label}
            </Link>
          ))}
        </nav>

        <WalletButton />
      </div>

      <Tape />

      {/* mobile nav */}
      <nav className="flex items-center gap-1 border-t border-white/5 px-4 py-2 sm:hidden">
        {NAV.map((n) => (
          <Link
            key={n.href}
            href={n.href}
            className={`flex-1 rounded-lg px-3 py-1.5 text-center text-sm font-medium transition ${
              isActive(n.href)
                ? "bg-white/5 text-white"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            {n.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
