import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#001020]">
      <SignIn
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
        forceRedirectUrl="/dashboard"
        fallbackRedirectUrl="/dashboard"
      />
    </div>
  );
}
