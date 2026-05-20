import type { Metadata } from "next";
import localFont from "next/font/local";
import { ClerkProvider } from "@clerk/nextjs";
import { ui } from "@clerk/ui";
import { enUS, esES } from "@clerk/localizations";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import "../index.css";
import Providers from "@/components/providers";

const trenda = localFont({
	src: [
		{ path: "../fonts/Trenda-Light.woff2", weight: "300", style: "normal" },
		{ path: "../fonts/Trenda-LightIt.woff2", weight: "300", style: "italic" },
		{ path: "../fonts/Trenda-Regular.woff2", weight: "400", style: "normal" },
		{ path: "../fonts/Trenda-RegularIt.woff2", weight: "400", style: "italic" },
		{ path: "../fonts/Trenda-Semibold.woff2", weight: "600", style: "normal" },
		{ path: "../fonts/Trenda-SemiboldIt.woff2", weight: "600", style: "italic" },
		{ path: "../fonts/Trenda-Bold.woff2", weight: "700", style: "normal" },
		{ path: "../fonts/Trenda-BoldIt.woff2", weight: "700", style: "italic" },
		{ path: "../fonts/Trenda-Heavy.woff2", weight: "800", style: "normal" },
		{ path: "../fonts/Trenda-HeavyIt.woff2", weight: "800", style: "italic" },
		{ path: "../fonts/Trenda-Black.woff2", weight: "900", style: "normal" },
		{ path: "../fonts/Trenda-BlackIt.woff2", weight: "900", style: "italic" },
	],
	variable: "--font-trenda",
});

export const metadata: Metadata = {
	title: "Harvverse — Where Investors Meet Farmers",
	description: "The Phygital Agricultural Ecosystem bridging digital capital and real-world yield.",
};

export default async function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	const locale = await getLocale();
	const messages = await getMessages();

	return (
		<ClerkProvider
			ui={ui}
			localization={locale === "en" ? enUS : esES}
			signInForceRedirectUrl="/dashboard"
			signInFallbackRedirectUrl="/dashboard"
			signUpForceRedirectUrl="/onboarding"
			signUpFallbackRedirectUrl="/onboarding"
		>
			<html lang={locale} className={trenda.variable} suppressHydrationWarning>
				<body
					className="antialiased"
					style={{ background: "#001020", minHeight: "100vh" }}
					suppressHydrationWarning
				>
					<NextIntlClientProvider messages={messages}>
						<Providers>{children}</Providers>
					</NextIntlClientProvider>
				</body>
			</html>
		</ClerkProvider>
	);
}
