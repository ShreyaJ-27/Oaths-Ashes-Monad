import { BrowserProvider } from "ethers";
import { gameContract } from "../contract";
import { MONAD_CONFIG } from "../types";

export type WalletConnection = {
  provider: BrowserProvider;
  signer: Awaited<ReturnType<BrowserProvider["getSigner"]>>;
  address: string;
  chainId: number;
};

export async function connectWallet(): Promise<WalletConnection> {
  const { ethereum } = window as Window & { ethereum?: any };
  if (!ethereum) throw new Error("Wallet not connected");

  const accounts: string[] = await ethereum.request({ method: "eth_requestAccounts" });
  let chainIdHex: string = await ethereum.request({ method: "eth_chainId" });
  let chainId = parseInt(chainIdHex, 16);

  if (chainId !== MONAD_CONFIG.chainId) {
    try {
      await ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: `0x${MONAD_CONFIG.chainId.toString(16)}` }],
      });
    } catch (switchError: any) {
      if (switchError.code !== 4902) throw switchError;
      await ethereum.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: `0x${MONAD_CONFIG.chainId.toString(16)}`,
            chainName: MONAD_CONFIG.chainName,
            rpcUrls: [MONAD_CONFIG.rpcUrl],
            nativeCurrency: { name: "Monad", symbol: "MON", decimals: 18 },
          },
        ],
      });
    }
    chainIdHex = await ethereum.request({ method: "eth_chainId" });
    chainId = parseInt(chainIdHex, 16);
  }

  if (chainId !== MONAD_CONFIG.chainId) throw new Error("Wrong network");

  const provider = new BrowserProvider(ethereum);
  const signer = await provider.getSigner();
  await gameContract.initialize(provider);
  gameContract.setSigner(signer);

  return { provider, signer, address: accounts[0], chainId };
}
