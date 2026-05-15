import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#080E04]">
      <SignIn
        appearance={{
          variables: {
            colorPrimary: "#a37241",
            colorBackground: "#0f1a0a",
            colorText: "#ffffff",
            colorTextSecondary: "#9ca3af",
            colorInputBackground: "#1a2e12",
            colorInputText: "#ffffff",
          },
        }}
        fallbackRedirectUrl="/onboarding"
      />
    </div>
  );
}
