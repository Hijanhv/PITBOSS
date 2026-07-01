import { z } from "zod";

/**
 * Public runtime config, validated with zod at module load. Defaults point at
 * the live testnet deployment (see deployments/testnet.json) so the app works
 * out of the box; every value can be overridden via NEXT_PUBLIC_* env vars.
 */
const schema = z.object({
  NEXT_PUBLIC_STELLAR_NETWORK: z.string().default("TESTNET"),
  NEXT_PUBLIC_RPC_URL: z.string().url().default("https://soroban-testnet.stellar.org"),
  NEXT_PUBLIC_NETWORK_PASSPHRASE: z
    .string()
    .min(1)
    .default("Test SDF Network ; September 2015"),
  NEXT_PUBLIC_FACTORY_ID: z
    .string()
    .length(56)
    .default("CBOOJITGRKEOWRWYEZ2NTB3LWWC4ZI6YQXPW6M6DGYYXDAUNH3RPOGNB"),
  NEXT_PUBLIC_ORACLE_ID: z
    .string()
    .length(56)
    .default("CA57YKYJSNQTAKOXFJSC7ESJTI5MFOASIELGDAKCGTWVVURYTQUZW5OH"),
  NEXT_PUBLIC_TREASURY_ID: z
    .string()
    .length(56)
    .default("CB5KCQR7IWXDMJ7ON4BVBWJNFIYR5TSXFUKGUXBDMR4H2DJKK3BEG37L"),
  NEXT_PUBLIC_TOKEN_ID: z
    .string()
    .length(56)
    .default("CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC"),
});

// Reference each var explicitly so Next.js inlines them at build time.
export const env = schema.parse({
  NEXT_PUBLIC_STELLAR_NETWORK: process.env.NEXT_PUBLIC_STELLAR_NETWORK,
  NEXT_PUBLIC_RPC_URL: process.env.NEXT_PUBLIC_RPC_URL,
  NEXT_PUBLIC_NETWORK_PASSPHRASE: process.env.NEXT_PUBLIC_NETWORK_PASSPHRASE,
  NEXT_PUBLIC_FACTORY_ID: process.env.NEXT_PUBLIC_FACTORY_ID,
  NEXT_PUBLIC_ORACLE_ID: process.env.NEXT_PUBLIC_ORACLE_ID,
  NEXT_PUBLIC_TREASURY_ID: process.env.NEXT_PUBLIC_TREASURY_ID,
  NEXT_PUBLIC_TOKEN_ID: process.env.NEXT_PUBLIC_TOKEN_ID,
});
