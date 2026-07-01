"use client";
import { useWallet } from "@/lib/wallet";
import { truncate } from "@/lib/format";

export function WalletButton() {
  const { address, connect, disconnect, connecting } = useWallet();

  if (!address) {
    return (
      <button className="btn-boss" onClick={connect} disabled={connecting}>
        {connecting ? "Connecting…" : "Connect wallet"}
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="chip tabnum">
        <span className="h-2 w-2 rounded-full bg-yes shadow-glow-yes" />
        {truncate(address, 4, 4)}
      </span>
      <button
        className="btn-ghost !px-2.5 !py-2"
        onClick={disconnect}
        title="Disconnect"
        aria-label="Disconnect wallet"
      >
        ⎋
      </button>
    </div>
  );
}
