import { Buffer } from "buffer";
import { Address } from "@stellar/stellar-sdk";
import {
  AssembledTransaction,
  Client as ContractClient,
  ClientOptions as ContractClientOptions,
  MethodOptions,
  Result,
  Spec as ContractSpec,
} from "@stellar/stellar-sdk/contract";
import type {
  u32,
  i32,
  u64,
  i64,
  u128,
  i128,
  u256,
  i256,
  Option,
  Timepoint,
  Duration,
} from "@stellar/stellar-sdk/contract";
export * from "@stellar/stellar-sdk";
export * as contract from "@stellar/stellar-sdk/contract";
export * as rpc from "@stellar/stellar-sdk/rpc";

if (typeof window !== "undefined") {
  //@ts-ignore Buffer exists
  window.Buffer = window.Buffer || Buffer;
}




export const Errors = {
  1: {message:"AlreadyInitialized"},
  2: {message:"NotInitialized"},
  3: {message:"MarketClosed"},
  4: {message:"NotClosedYet"},
  5: {message:"AlreadyResolved"},
  6: {message:"NotResolved"},
  7: {message:"OutcomeNotReady"},
  8: {message:"ZeroAmount"},
  9: {message:"AlreadyClaimed"},
  10: {message:"NothingToClaim"}
}




export interface MarketData {
  close_ledger: u32;
  factory: string;
  fee_bps: u32;
  market_id: Buffer;
  oracle: string;
  outcome: boolean;
  pool_no: i128;
  pool_yes: i128;
  question: string;
  resolved: boolean;
  token: string;
  treasury: string;
}



export interface Client {
  /**
   * Construct and simulate a bet transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Stake `amount` on `side` (true = YES, false = NO). A `fee_bps` cut is
   * routed to the Treasury; the net joins the chosen pool.
   */
  bet: ({bettor, side, amount}: {bettor: string, side: boolean, amount: i128}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a claim transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Claim winnings. `payout = winning_stake * total_pool / winning_pool`.
   */
  claim: ({bettor}: {bettor: string}, options?: MethodOptions) => Promise<AssembledTransaction<Result<i128>>>

  /**
   * Construct and simulate a resolve transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Resolve the market after close by reading the Oracle (cross-contract).
   */
  resolve: (options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a get_stake transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_stake: ({user, side}: {user: string, side: boolean}, options?: MethodOptions) => Promise<AssembledTransaction<i128>>

  /**
   * Construct and simulate a get_market transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_market: (options?: MethodOptions) => Promise<AssembledTransaction<Result<MarketData>>>

  /**
   * Construct and simulate a initialize transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * One-shot initialization, called cross-contract by the Factory right after
   * it deploys this child from the market Wasm hash.
   */
  initialize: ({factory, oracle, treasury, token, market_id, question, close_ledger, fee_bps}: {factory: string, oracle: string, treasury: string, token: string, market_id: Buffer, question: string, close_ledger: u32, fee_bps: u32}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a has_claimed transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  has_claimed: ({user}: {user: string}, options?: MethodOptions) => Promise<AssembledTransaction<boolean>>

}
export class Client extends ContractClient {
  static async deploy<T = Client>(
    /** Options for initializing a Client as well as for calling a method, with extras specific to deploying. */
    options: MethodOptions &
      Omit<ContractClientOptions, "contractId"> & {
        /** The hash of the Wasm blob, which must already be installed on-chain. */
        wasmHash: Buffer | string;
        /** Salt used to generate the contract's ID. Passed through to {@link Operation.createCustomContract}. Default: random. */
        salt?: Buffer | Uint8Array;
        /** The format used to decode `wasmHash`, if it's provided as a string. */
        format?: "hex" | "base64";
      }
  ): Promise<AssembledTransaction<T>> {
    return ContractClient.deploy(null, options)
  }
  constructor(public readonly options: ContractClientOptions) {
    super(
      new ContractSpec([ "AAAAAAAAAHxTdGFrZSBgYW1vdW50YCBvbiBgc2lkZWAgKHRydWUgPSBZRVMsIGZhbHNlID0gTk8pLiBBIGBmZWVfYnBzYCBjdXQgaXMKcm91dGVkIHRvIHRoZSBUcmVhc3VyeTsgdGhlIG5ldCBqb2lucyB0aGUgY2hvc2VuIHBvb2wuAAAAA2JldAAAAAADAAAAAAAAAAZiZXR0b3IAAAAAABMAAAAAAAAABHNpZGUAAAABAAAAAAAAAAZhbW91bnQAAAAAAAsAAAABAAAD6QAAAAIAAAAD",
        "AAAAAAAAAEVDbGFpbSB3aW5uaW5ncy4gYHBheW91dCA9IHdpbm5pbmdfc3Rha2UgKiB0b3RhbF9wb29sIC8gd2lubmluZ19wb29sYC4AAAAAAAAFY2xhaW0AAAAAAAABAAAAAAAAAAZiZXR0b3IAAAAAABMAAAABAAAD6QAAAAsAAAAD",
        "AAAABAAAAAAAAAAAAAAABUVycm9yAAAAAAAACgAAAAAAAAASQWxyZWFkeUluaXRpYWxpemVkAAAAAAABAAAAAAAAAA5Ob3RJbml0aWFsaXplZAAAAAAAAgAAAAAAAAAMTWFya2V0Q2xvc2VkAAAAAwAAAAAAAAAMTm90Q2xvc2VkWWV0AAAABAAAAAAAAAAPQWxyZWFkeVJlc29sdmVkAAAAAAUAAAAAAAAAC05vdFJlc29sdmVkAAAAAAYAAAAAAAAAD091dGNvbWVOb3RSZWFkeQAAAAAHAAAAAAAAAApaZXJvQW1vdW50AAAAAAAIAAAAAAAAAA5BbHJlYWR5Q2xhaW1lZAAAAAAACQAAAAAAAAAOTm90aGluZ1RvQ2xhaW0AAAAAAAo=",
        "AAAAAAAAAEZSZXNvbHZlIHRoZSBtYXJrZXQgYWZ0ZXIgY2xvc2UgYnkgcmVhZGluZyB0aGUgT3JhY2xlIChjcm9zcy1jb250cmFjdCkuAAAAAAAHcmVzb2x2ZQAAAAAAAAAAAQAAA+kAAAACAAAAAw==",
        "AAAABQAAAAAAAAAAAAAAB0NsYWltZWQAAAAAAQAAAAdjbGFpbWVkAAAAAAIAAAAAAAAABmJldHRvcgAAAAAAEwAAAAEAAAAAAAAABnBheW91dAAAAAAACwAAAAAAAAAC",
        "AAAAAAAAAAAAAAAJZ2V0X3N0YWtlAAAAAAAAAgAAAAAAAAAEdXNlcgAAABMAAAAAAAAABHNpZGUAAAABAAAAAQAAAAs=",
        "AAAAAAAAAAAAAAAKZ2V0X21hcmtldAAAAAAAAAAAAAEAAAPpAAAH0AAAAApNYXJrZXREYXRhAAAAAAAD",
        "AAAAAAAAAHpPbmUtc2hvdCBpbml0aWFsaXphdGlvbiwgY2FsbGVkIGNyb3NzLWNvbnRyYWN0IGJ5IHRoZSBGYWN0b3J5IHJpZ2h0IGFmdGVyCml0IGRlcGxveXMgdGhpcyBjaGlsZCBmcm9tIHRoZSBtYXJrZXQgV2FzbSBoYXNoLgAAAAAACmluaXRpYWxpemUAAAAAAAgAAAAAAAAAB2ZhY3RvcnkAAAAAEwAAAAAAAAAGb3JhY2xlAAAAAAATAAAAAAAAAAh0cmVhc3VyeQAAABMAAAAAAAAABXRva2VuAAAAAAAAEwAAAAAAAAAJbWFya2V0X2lkAAAAAAAD7gAAACAAAAAAAAAACHF1ZXN0aW9uAAAAEAAAAAAAAAAMY2xvc2VfbGVkZ2VyAAAABAAAAAAAAAAHZmVlX2JwcwAAAAAEAAAAAQAAA+kAAAACAAAAAw==",
        "AAAABQAAAAAAAAAAAAAACUJldFBsYWNlZAAAAAAAAAEAAAAKYmV0X3BsYWNlZAAAAAAABQAAAAAAAAAGYmV0dG9yAAAAAAATAAAAAQAAAAAAAAAEc2lkZQAAAAEAAAAAAAAAAAAAAANuZXQAAAAACwAAAAAAAAAAAAAACHBvb2xfeWVzAAAACwAAAAAAAAAAAAAAB3Bvb2xfbm8AAAAACwAAAAAAAAAC",
        "AAAAAQAAAAAAAAAAAAAACk1hcmtldERhdGEAAAAAAAwAAAAAAAAADGNsb3NlX2xlZGdlcgAAAAQAAAAAAAAAB2ZhY3RvcnkAAAAAEwAAAAAAAAAHZmVlX2JwcwAAAAAEAAAAAAAAAAltYXJrZXRfaWQAAAAAAAPuAAAAIAAAAAAAAAAGb3JhY2xlAAAAAAATAAAAAAAAAAdvdXRjb21lAAAAAAEAAAAAAAAAB3Bvb2xfbm8AAAAACwAAAAAAAAAIcG9vbF95ZXMAAAALAAAAAAAAAAhxdWVzdGlvbgAAABAAAAAAAAAACHJlc29sdmVkAAAAAQAAAAAAAAAFdG9rZW4AAAAAAAATAAAAAAAAAAh0cmVhc3VyeQAAABM=",
        "AAAAAAAAAAAAAAALaGFzX2NsYWltZWQAAAAAAQAAAAAAAAAEdXNlcgAAABMAAAABAAAAAQ==",
        "AAAABQAAAAAAAAAAAAAADk1hcmtldFJlc29sdmVkAAAAAAABAAAAD21hcmtldF9yZXNvbHZlZAAAAAABAAAAAAAAAAdvdXRjb21lAAAAAAEAAAAAAAAAAg==",
        "AAAABQAAAAAAAAAAAAAAEU1hcmtldEluaXRpYWxpemVkAAAAAAAAAQAAABJtYXJrZXRfaW5pdGlhbGl6ZWQAAAAAAAMAAAAAAAAACW1hcmtldF9pZAAAAAAAA+4AAAAgAAAAAQAAAAAAAAAMY2xvc2VfbGVkZ2VyAAAABAAAAAAAAAAAAAAAB2ZlZV9icHMAAAAABAAAAAAAAAAC" ]),
      options
    )
  }
  public readonly fromJSON = {
    bet: this.txFromJSON<Result<void>>,
        claim: this.txFromJSON<Result<i128>>,
        resolve: this.txFromJSON<Result<void>>,
        get_stake: this.txFromJSON<i128>,
        get_market: this.txFromJSON<Result<MarketData>>,
        initialize: this.txFromJSON<Result<void>>,
        has_claimed: this.txFromJSON<boolean>
  }
}