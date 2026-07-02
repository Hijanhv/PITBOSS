import { rpc } from "@stellar/stellar-sdk";
import { Client as FactoryClient } from "@pitboss/factory";
import type { MarketRef } from "@pitboss/factory";
import { Client as MarketClient } from "@pitboss/market";
import type { MarketData } from "@pitboss/market";
import { Client as OracleClient } from "@pitboss/oracle";
import { Client as TreasuryClient } from "@pitboss/treasury";
import { config } from "./config";

export type { MarketRef, MarketData };

/**
 * Wallet signing callback shape (compatible with @creit.tech/stellar-wallets-kit
 * and @stellar/stellar-sdk/contract).
 */
export type SignTransaction = (
  xdr: string,
  opts?: { networkPassphrase?: string; address?: string },
) => Promise<{ signedTxXdr: string; signerAddress?: string }>;

export interface Signer {
  address: string;
  signTransaction: SignTransaction;
}

// Source account used only to build read-only simulations. The RPC fetches this
// account's sequence to assemble the envelope, so it must EXIST on-chain — a
// random key 404s. We reuse the protocol deployer: no signing, no funds move.
const READ_SOURCE = "GBMB2FZK5JTPO7AKAAHQI7VNYICAGPWCVZ5LQ64AEHF3KGLKAFGT2P2R";

const allowHttp = config.rpcUrl.startsWith("http://");

function base(contractId: string) {
  return {
    contractId,
    networkPassphrase: config.networkPassphrase,
    rpcUrl: config.rpcUrl,
    allowHttp,
  };
}

// ── Read clients (simulation only) ───────────────────────────────────────────
export const factoryRead = () =>
  new FactoryClient({ ...base(config.factoryId), publicKey: READ_SOURCE });
export const oracleRead = () =>
  new OracleClient({ ...base(config.oracleId), publicKey: READ_SOURCE });
export const treasuryRead = () =>
  new TreasuryClient({ ...base(config.treasuryId), publicKey: READ_SOURCE });
export const marketRead = (id: string) =>
  new MarketClient({ ...base(id), publicKey: READ_SOURCE });

// ── Write clients (sign + send via connected wallet) ─────────────────────────
export const factoryWrite = (s: Signer) =>
  new FactoryClient({ ...base(config.factoryId), publicKey: s.address, signTransaction: s.signTransaction });
export const oracleWrite = (s: Signer) =>
  new OracleClient({ ...base(config.oracleId), publicKey: s.address, signTransaction: s.signTransaction });
export const marketWrite = (id: string, s: Signer) =>
  new MarketClient({ ...base(id), publicKey: s.address, signTransaction: s.signTransaction });
export const treasuryWrite = (s: Signer) =>
  new TreasuryClient({ ...base(config.treasuryId), publicKey: s.address, signTransaction: s.signTransaction });

export const rpcServer = () => new rpc.Server(config.rpcUrl, { allowHttp });
