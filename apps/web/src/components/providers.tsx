"use client";

import { Toaster } from "@harvverse-monorepo/ui/components/sonner";
import { TooltipProvider } from "@harvverse-monorepo/ui/components/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";

import { queryClient } from "@/utils/trpc";
import { wagmiConfig } from "@/lib/wagmi";

import { ThemeProvider } from "./theme-provider";

export default function Providers({ children }: { children: React.ReactNode }) {
	return (
		<ThemeProvider
			attribute="class"
			defaultTheme="dark"
			forcedTheme="dark"
			enableSystem={false}
			disableTransitionOnChange
		>
			<WagmiProvider config={wagmiConfig}>
				<QueryClientProvider client={queryClient}>
					<TooltipProvider>
						{children}
					</TooltipProvider>
					<Toaster richColors />
				</QueryClientProvider>
			</WagmiProvider>
		</ThemeProvider>
	);
}
