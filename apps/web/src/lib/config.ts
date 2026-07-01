import { env } from "./env";

export const config = {
  network: env.NEXT_PUBLIC_STELLAR_NETWORK,
  rpcUrl: env.NEXT_PUBLIC_RPC_URL,
  networkPassphrase: env.NEXT_PUBLIC_NETWORK_PASSPHRASE,
  factoryId: env.NEXT_PUBLIC_FACTORY_ID,
  oracleId: env.NEXT_PUBLIC_ORACLE_ID,
  treasuryId: env.NEXT_PUBLIC_TREASURY_ID,
  tokenId: env.NEXT_PUBLIC_TOKEN_ID,
  explorer: "https://stellar.expert/explorer/testnet",
  horizon: "https://horizon-testnet.stellar.org",
} as const;

export const contractIds = [
  config.factoryId,
  config.oracleId,
  config.treasuryId,
] as const;

export const explorerTx = (hash: string) => `${config.explorer}/tx/${hash}`;
export const explorerContract = (id: string) => `${config.explorer}/contract/${id}`;
export const explorerAccount = (id: string) => `${config.explorer}/account/${id}`;
