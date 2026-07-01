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
  2: {message:"NotReporter"},
  3: {message:"AlreadyReported"},
  4: {message:"NotInitialized"}
}




export interface Client {
  /**
   * Construct and simulate a get_admin transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_admin: (options?: MethodOptions) => Promise<AssembledTransaction<string>>

  /**
   * Construct and simulate a get_outcome transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Cross-contract read used by Market on resolve. `None` until reported.
   */
  get_outcome: ({market_id}: {market_id: Buffer}, options?: MethodOptions) => Promise<AssembledTransaction<Option<boolean>>>

  /**
   * Construct and simulate a is_reporter transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  is_reporter: ({reporter}: {reporter: string}, options?: MethodOptions) => Promise<AssembledTransaction<boolean>>

  /**
   * Construct and simulate a add_reporter transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Authorize `reporter` to publish outcomes. Admin only.
   */
  add_reporter: ({reporter}: {reporter: string}, options?: MethodOptions) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a report_outcome transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Publish the binary outcome for `market_id`. Reporter only, one-shot.
   */
  report_outcome: ({reporter, market_id, outcome}: {reporter: string, market_id: Buffer, outcome: boolean}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a remove_reporter transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Revoke a reporter. Admin only.
   */
  remove_reporter: ({reporter}: {reporter: string}, options?: MethodOptions) => Promise<AssembledTransaction<null>>

}
export class Client extends ContractClient {
  static async deploy<T = Client>(
        /** Constructor/Initialization Args for the contract's `__constructor` method */
        {admin}: {admin: string},
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
    return ContractClient.deploy({admin}, options)
  }
  constructor(public readonly options: ContractClientOptions) {
    super(
      new ContractSpec([ "AAAABAAAAAAAAAAAAAAABUVycm9yAAAAAAAABAAAAAAAAAAITm90QWRtaW4AAAABAAAAAAAAAAtOb3RSZXBvcnRlcgAAAAACAAAAAAAAAA9BbHJlYWR5UmVwb3J0ZWQAAAAAAwAAAAAAAAAOTm90SW5pdGlhbGl6ZWQAAAAAAAQ=",
        "AAAAAAAAAAAAAAAJZ2V0X2FkbWluAAAAAAAAAAAAAAEAAAAT",
        "AAAAAAAAAEVDcm9zcy1jb250cmFjdCByZWFkIHVzZWQgYnkgTWFya2V0IG9uIHJlc29sdmUuIGBOb25lYCB1bnRpbCByZXBvcnRlZC4AAAAAAAALZ2V0X291dGNvbWUAAAAAAQAAAAAAAAAJbWFya2V0X2lkAAAAAAAD7gAAACAAAAABAAAD6AAAAAE=",
        "AAAAAAAAAAAAAAALaXNfcmVwb3J0ZXIAAAAAAQAAAAAAAAAIcmVwb3J0ZXIAAAATAAAAAQAAAAE=",
        "AAAAAAAAADVBdXRob3JpemUgYHJlcG9ydGVyYCB0byBwdWJsaXNoIG91dGNvbWVzLiBBZG1pbiBvbmx5LgAAAAAAAAxhZGRfcmVwb3J0ZXIAAAABAAAAAAAAAAhyZXBvcnRlcgAAABMAAAAA",
        "AAAAAAAAADpEZXBsb3ktdGltZSBjb25zdHJ1Y3Rvci4gYGFkbWluYCBnb3Zlcm5zIHRoZSByZXBvcnRlciBzZXQuAAAAAAANX19jb25zdHJ1Y3RvcgAAAAAAAAEAAAAAAAAABWFkbWluAAAAAAAAEwAAAAA=",
        "AAAAAAAAAERQdWJsaXNoIHRoZSBiaW5hcnkgb3V0Y29tZSBmb3IgYG1hcmtldF9pZGAuIFJlcG9ydGVyIG9ubHksIG9uZS1zaG90LgAAAA5yZXBvcnRfb3V0Y29tZQAAAAAAAwAAAAAAAAAIcmVwb3J0ZXIAAAATAAAAAAAAAAltYXJrZXRfaWQAAAAAAAPuAAAAIAAAAAAAAAAHb3V0Y29tZQAAAAABAAAAAQAAA+kAAAACAAAAAw==",
        "AAAABQAAAAAAAAAAAAAADVJlcG9ydGVyQWRkZWQAAAAAAAABAAAADnJlcG9ydGVyX2FkZGVkAAAAAAABAAAAAAAAAAhyZXBvcnRlcgAAABMAAAABAAAAAg==",
        "AAAAAAAAAB5SZXZva2UgYSByZXBvcnRlci4gQWRtaW4gb25seS4AAAAAAA9yZW1vdmVfcmVwb3J0ZXIAAAAAAQAAAAAAAAAIcmVwb3J0ZXIAAAATAAAAAA==",
        "AAAABQAAAAAAAAAAAAAAD091dGNvbWVSZXBvcnRlZAAAAAABAAAAEG91dGNvbWVfcmVwb3J0ZWQAAAACAAAAAAAAAAltYXJrZXRfaWQAAAAAAAPuAAAAIAAAAAEAAAAAAAAAB291dGNvbWUAAAAAAQAAAAAAAAAC",
        "AAAABQAAAAAAAAAAAAAAD1JlcG9ydGVyUmVtb3ZlZAAAAAABAAAAEHJlcG9ydGVyX3JlbW92ZWQAAAABAAAAAAAAAAhyZXBvcnRlcgAAABMAAAABAAAAAg==" ]),
      options
    )
  }
  public readonly fromJSON = {
    get_admin: this.txFromJSON<string>,
        get_outcome: this.txFromJSON<Option<boolean>>,
        is_reporter: this.txFromJSON<boolean>,
        add_reporter: this.txFromJSON<null>,
        report_outcome: this.txFromJSON<Result<void>>,
        remove_reporter: this.txFromJSON<null>
  }
}