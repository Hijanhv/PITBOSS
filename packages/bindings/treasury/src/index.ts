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
  2: {message:"ZeroAmount"}
}



export interface Client {
  /**
   * Construct and simulate a collect transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Pull `amount` of the fee token from `from` into the treasury.
   * 
   * Called cross-contract by Market during `bet`. `from`'s authorization is
   * enforced by the token transfer itself, carried in the bettor's auth tree.
   */
  collect: ({from, amount}: {from: string, amount: i128}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a withdraw transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Withdraw accumulated fees to `to`. Admin only.
   */
  withdraw: ({to, amount}: {to: string, amount: i128}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a get_admin transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_admin: (options?: MethodOptions) => Promise<AssembledTransaction<string>>

  /**
   * Construct and simulate a get_token transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_token: (options?: MethodOptions) => Promise<AssembledTransaction<string>>

  /**
   * Construct and simulate a total_collected transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  total_collected: (options?: MethodOptions) => Promise<AssembledTransaction<i128>>

}
export class Client extends ContractClient {
  static async deploy<T = Client>(
        /** Constructor/Initialization Args for the contract's `__constructor` method */
        {admin, token}: {admin: string, token: string},
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
    return ContractClient.deploy({admin, token}, options)
  }
  constructor(public readonly options: ContractClientOptions) {
    super(
      new ContractSpec([ "AAAABAAAAAAAAAAAAAAABUVycm9yAAAAAAAAAgAAAAAAAAAITm90QWRtaW4AAAABAAAAAAAAAApaZXJvQW1vdW50AAAAAAAC",
        "AAAAAAAAANBQdWxsIGBhbW91bnRgIG9mIHRoZSBmZWUgdG9rZW4gZnJvbSBgZnJvbWAgaW50byB0aGUgdHJlYXN1cnkuCgpDYWxsZWQgY3Jvc3MtY29udHJhY3QgYnkgTWFya2V0IGR1cmluZyBgYmV0YC4gYGZyb21gJ3MgYXV0aG9yaXphdGlvbiBpcwplbmZvcmNlZCBieSB0aGUgdG9rZW4gdHJhbnNmZXIgaXRzZWxmLCBjYXJyaWVkIGluIHRoZSBiZXR0b3IncyBhdXRoIHRyZWUuAAAAB2NvbGxlY3QAAAAAAgAAAAAAAAAEZnJvbQAAABMAAAAAAAAABmFtb3VudAAAAAAACwAAAAEAAAPpAAAAAgAAAAM=",
        "AAAABQAAAAAAAAAAAAAACUNvbGxlY3RlZAAAAAAAAAEAAAAJY29sbGVjdGVkAAAAAAAAAgAAAAAAAAAEZnJvbQAAABMAAAABAAAAAAAAAAZhbW91bnQAAAAAAAsAAAAAAAAAAg==",
        "AAAABQAAAAAAAAAAAAAACVdpdGhkcmF3bgAAAAAAAAEAAAAJd2l0aGRyYXduAAAAAAAAAgAAAAAAAAACdG8AAAAAABMAAAABAAAAAAAAAAZhbW91bnQAAAAAAAsAAAAAAAAAAg==",
        "AAAAAAAAAC5XaXRoZHJhdyBhY2N1bXVsYXRlZCBmZWVzIHRvIGB0b2AuIEFkbWluIG9ubHkuAAAAAAAId2l0aGRyYXcAAAACAAAAAAAAAAJ0bwAAAAAAEwAAAAAAAAAGYW1vdW50AAAAAAALAAAAAQAAA+kAAAACAAAAAw==",
        "AAAAAAAAAAAAAAAJZ2V0X2FkbWluAAAAAAAAAAAAAAEAAAAT",
        "AAAAAAAAAAAAAAAJZ2V0X3Rva2VuAAAAAAAAAAAAAAEAAAAT",
        "AAAAAAAAAENEZXBsb3ktdGltZSBjb25zdHJ1Y3Rvci4gYHRva2VuYCBpcyB0aGUgZmVlIGFzc2V0IChuYXRpdmUgWExNIFNBQykuAAAAAA1fX2NvbnN0cnVjdG9yAAAAAAAAAgAAAAAAAAAFYWRtaW4AAAAAAAATAAAAAAAAAAV0b2tlbgAAAAAAABMAAAAA",
        "AAAAAAAAAAAAAAAPdG90YWxfY29sbGVjdGVkAAAAAAAAAAABAAAACw==" ]),
      options
    )
  }
  public readonly fromJSON = {
    collect: this.txFromJSON<Result<void>>,
        withdraw: this.txFromJSON<Result<void>>,
        get_admin: this.txFromJSON<string>,
        get_token: this.txFromJSON<string>,
        total_collected: this.txFromJSON<i128>
  }
}