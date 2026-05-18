import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import "../index.css";
import Providers from "@/components/providers";

const inter = Inter({
	variable: "--font-inter",
	subsets: ["latin"],
	weight: ["300", "400", "500", "600", "700", "800"],
});

const spaceGrotesk = Space_Grotesk({
	variable: "--font-space-grotesk",
	subsets: ["latin"],
	weight: ["400", "500", "600", "700"],
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
		<ClerkProvider>
			<html lang={locale} suppressHydrationWarning>
				<body
					className={`${inter.variable} ${spaceGrotesk.variable} antialiased`}
					style={{ background: "#080E04", minHeight: "100vh" }}
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
