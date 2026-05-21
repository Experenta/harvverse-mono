import { createConfig, http, injected } from "wagmi";
import { celoSepolia, hardhat } from "viem/chains";

export const wagmiConfig = createConfig({
  chains: [celoSepolia, hardhat],
  connectors: [
    // MiniPay: Opera's mobile wallet used by non-tech farmers on Celo.
    // Listed first so wagmi prefers it when isMiniPay is detected in the webview.
    injected({
      target: {
        id: "miniPay",
        name: "MiniPay",
        provider(w) {
          const eth = (w as unknown as { ethereum?: { isMiniPay?: boolean } })
            ?.ethereum;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          return eth?.isMiniPay ? (eth as any) : undefined;
        },
      },
    }),
    // Generic injected: MetaMask, Rabby, Brave Wallet, etc.
    injected(),
  ],
  transports: {
    [celoSepolia.id]: http(),
    [hardhat.id]: http("http://127.0.0.1:8545"),
  },
});
