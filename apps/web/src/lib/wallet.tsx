"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  StellarWalletsKit,
  WalletNetwork,
  allowAllModules,
  FREIGHTER_ID,
  type ISupportedWallet,
} from "@creit.tech/stellar-wallets-kit";
import { config } from "./config";
import type { Signer, SignTransaction } from "./stellar";

const STORAGE_KEY = "pitboss:wallet";

interface WalletState {
  address: string | null;
  connecting: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  signer: Signer | null;
}

const WalletContext = createContext<WalletState | null>(null);

function networkEnum() {
  return config.network.toUpperCase() === "PUBLIC"
    ? WalletNetwork.PUBLIC
    : WalletNetwork.TESTNET;
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const kitRef = useRef<StellarWalletsKit | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);

  const getKit = useCallback((walletId?: string) => {
    if (!kitRef.current) {
      kitRef.current = new StellarWalletsKit({
        network: networkEnum(),
        selectedWalletId: walletId ?? FREIGHTER_ID,
        modules: allowAllModules(),
      });
    } else if (walletId) {
      kitRef.current.setWallet(walletId);
    }
    return kitRef.current;
  }, []);

  // Restore a previous session.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    try {
      const { address: a, walletId: w } = JSON.parse(raw);
      if (a && w) {
        getKit(w);
        setAddress(a);
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [getKit]);

  const connect = useCallback(async () => {
    setConnecting(true);
    try {
      const kit = getKit();
      await kit.openModal({
        onWalletSelected: async (option: ISupportedWallet) => {
          kit.setWallet(option.id);
          const { address: a } = await kit.getAddress();
          setAddress(a);
          localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({ address: a, walletId: option.id }),
          );
        },
      });
    } finally {
      setConnecting(false);
    }
  }, [getKit]);

  const disconnect = useCallback(() => {
    setAddress(null);
    if (typeof window !== "undefined") localStorage.removeItem(STORAGE_KEY);
  }, []);

  const signer = useMemo<Signer | null>(() => {
    if (!address) return null;
    const signTransaction: SignTransaction = async (xdr, opts) => {
      const kit = getKit();
      const res = await kit.signTransaction(xdr, {
        address,
        networkPassphrase: opts?.networkPassphrase ?? config.networkPassphrase,
      });
      return {
        signedTxXdr: res.signedTxXdr,
        signerAddress: (res as { signerAddress?: string }).signerAddress ?? address,
      };
    };
    return { address, signTransaction };
  }, [address, getKit]);

  const value = useMemo(
    () => ({ address, connecting, connect, disconnect, signer }),
    [address, connecting, connect, disconnect, signer],
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used within WalletProvider");
  return ctx;
}
