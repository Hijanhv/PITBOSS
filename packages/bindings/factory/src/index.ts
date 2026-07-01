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
  1: {message:"NotAdmin"},
  2: {message:"CloseInPast"}
}


export interface Config {
  admin: string;
  default_fee_bps: u32;
  market_wasm_hash: Buffer;
  oracle: string;
  token: string;
  treasury: string;
}


export interface MarketRef {
  address: string;
  market_id: Buffer;
}


export interface Client {
  /**
   * Construct and simulate a get_config transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_config: (options?: MethodOptions) => Promise<AssembledTransaction<Config>>

  /**
   * Construct and simulate a list_markets transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Full registry: every `(market_id, address)` this factory has created.
   */
  list_markets: (options?: MethodOptions) => Promise<AssembledTransaction<Array<MarketRef>>>

  /**
   * Construct and simulate a market_count transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  market_count: (options?: MethodOptions) => Promise<AssembledTransaction<u32>>

  /**
   * Construct and simulate a create_market transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Permissionlessly spin up a new market. Deploys + initializes a Market
   * child, registers it, and returns its address.
   */
  create_market: ({creator, question, close_ledger}: {creator: string, question: string, close_ledger: u32}, options?: MethodOptions) => Promise<AssembledTransaction<Result<string>>>

  /**
   * Construct and simulate a get_market_addr transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_market_addr: ({market_id}: {market_id: Buffer}, options?: MethodOptions) => Promise<AssembledTransaction<Option<string>>>

  /**
   * Construct and simulate a set_market_wasm_hash transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Upgrade the Market Wasm template new markets are cloned from. Admin only.
   */
  set_market_wasm_hash: ({caller, new_hash}: {caller: string, new_hash: Buffer}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

}
export class Client extends ContractClient {
  static async deploy<T = Client>(
        /** Constructor/Initialization Args for the contract's `__constructor` method */
        {admin, oracle, treasury, token, market_wasm_hash, default_fee_bps}: {admin: string, oracle: string, treasury: string, token: string, market_wasm_hash: Buffer, default_fee_bps: u32},
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
    return ContractClient.deploy({admin, oracle, treasury, token, market_wasm_hash, default_fee_bps}, options)
  }
  constructor(public readonly options: ContractClientOptions) {
    super(
      new ContractSpec([ "AAAABAAAAAAAAAAAAAAABUVycm9yAAAAAAAAAgAAAAAAAAAITm90QWRtaW4AAAABAAAAAAAAAAtDbG9zZUluUGFzdAAAAAAC",
        "AAAAAQAAAAAAAAAAAAAABkNvbmZpZwAAAAAABgAAAAAAAAAFYWRtaW4AAAAAAAATAAAAAAAAAA9kZWZhdWx0X2ZlZV9icHMAAAAABAAAAAAAAAAQbWFya2V0X3dhc21faGFzaAAAA+4AAAAgAAAAAAAAAAZvcmFjbGUAAAAAABMAAAAAAAAABXRva2VuAAAAAAAAEwAAAAAAAAAIdHJlYXN1cnkAAAAT",
        "AAAAAQAAAAAAAAAAAAAACU1hcmtldFJlZgAAAAAAAAIAAAAAAAAAB2FkZHJlc3MAAAAAEwAAAAAAAAAJbWFya2V0X2lkAAAAAAAD7gAAACA=",
        "AAAAAAAAAAAAAAAKZ2V0X2NvbmZpZwAAAAAAAAAAAAEAAAfQAAAABkNvbmZpZwAA",
        "AAAAAAAAAEVGdWxsIHJlZ2lzdHJ5OiBldmVyeSBgKG1hcmtldF9pZCwgYWRkcmVzcylgIHRoaXMgZmFjdG9yeSBoYXMgY3JlYXRlZC4AAAAAAAAMbGlzdF9tYXJrZXRzAAAAAAAAAAEAAAPqAAAH0AAAAAlNYXJrZXRSZWYAAAA=",
        "AAAAAAAAAAAAAAAMbWFya2V0X2NvdW50AAAAAAAAAAEAAAAE",
        "AAAAAAAAAHhEZXBsb3ktdGltZSBjb25zdHJ1Y3RvciB3aXJpbmcgdGhlIHNoYXJlZCBwcm90b2NvbCBjb250cmFjdHMgYW5kIHRoZQpNYXJrZXQgV2FzbSB0ZW1wbGF0ZSB0aGF0IGNoaWxkcmVuIGFyZSBjbG9uZWQgZnJvbS4AAAANX19jb25zdHJ1Y3RvcgAAAAAAAAYAAAAAAAAABWFkbWluAAAAAAAAEwAAAAAAAAAGb3JhY2xlAAAAAAATAAAAAAAAAAh0cmVhc3VyeQAAABMAAAAAAAAABXRva2VuAAAAAAAAEwAAAAAAAAAQbWFya2V0X3dhc21faGFzaAAAA+4AAAAgAAAAAAAAAA9kZWZhdWx0X2ZlZV9icHMAAAAABAAAAAA=",
        "AAAAAAAAAHNQZXJtaXNzaW9ubGVzc2x5IHNwaW4gdXAgYSBuZXcgbWFya2V0LiBEZXBsb3lzICsgaW5pdGlhbGl6ZXMgYSBNYXJrZXQKY2hpbGQsIHJlZ2lzdGVycyBpdCwgYW5kIHJldHVybnMgaXRzIGFkZHJlc3MuAAAAAA1jcmVhdGVfbWFya2V0AAAAAAAAAwAAAAAAAAAHY3JlYXRvcgAAAAATAAAAAAAAAAhxdWVzdGlvbgAAABAAAAAAAAAADGNsb3NlX2xlZGdlcgAAAAQAAAABAAAD6QAAABMAAAAD",
        "AAAABQAAAAAAAAAAAAAADU1hcmtldENyZWF0ZWQAAAAAAAABAAAADm1hcmtldF9jcmVhdGVkAAAAAAAEAAAAAAAAAAltYXJrZXRfaWQAAAAAAAPuAAAAIAAAAAEAAAAAAAAAB2NyZWF0b3IAAAAAEwAAAAEAAAAAAAAABm1hcmtldAAAAAAAEwAAAAAAAAAAAAAACHF1ZXN0aW9uAAAAEAAAAAAAAAAC",
        "AAAAAAAAAAAAAAAPZ2V0X21hcmtldF9hZGRyAAAAAAEAAAAAAAAACW1hcmtldF9pZAAAAAAAA+4AAAAgAAAAAQAAA+gAAAAT",
        "AAAAAAAAAElVcGdyYWRlIHRoZSBNYXJrZXQgV2FzbSB0ZW1wbGF0ZSBuZXcgbWFya2V0cyBhcmUgY2xvbmVkIGZyb20uIEFkbWluIG9ubHkuAAAAAAAAFHNldF9tYXJrZXRfd2FzbV9oYXNoAAAAAgAAAAAAAAAGY2FsbGVyAAAAAAATAAAAAAAAAAhuZXdfaGFzaAAAA+4AAAAgAAAAAQAAA+kAAAACAAAAAw==" ]),
      options
    )
  }
  public readonly fromJSON = {
    get_config: this.txFromJSON<Config>,
        list_markets: this.txFromJSON<Array<MarketRef>>,
        market_count: this.txFromJSON<u32>,
        create_market: this.txFromJSON<Result<string>>,
        get_market_addr: this.txFromJSON<Option<string>>,
        set_market_wasm_hash: this.txFromJSON<Result<void>>
  }
}