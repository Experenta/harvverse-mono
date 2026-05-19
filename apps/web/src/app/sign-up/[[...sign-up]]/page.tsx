import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#001020]">
      <SignUp
        appearance={{
          variables: {
            colorPrimary: "#93D832",
            colorBackground: "#001020",
            colorForeground: "#ffffff",
            colorMutedForeground: "#9ca3af",
            colorInput: "#0a1a2e",
            colorInputForeground: "#ffffff",
          },
        }}
        fallbackRedirectUrl="/onboarding"
      />
    </div>
  );
}
