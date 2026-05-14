import Link from "next/link";
import { AlertCircle } from "lucide-react";

import { Card, CardContent } from "@harvverse-monorepo/ui/components/card";
import { Button } from "@harvverse-monorepo/ui/components/button";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#0a0e27] p-4">
      <Card className="w-full max-w-md mx-4 bg-[#1a1f3a] border-white/10 shadow-xl">
        <CardContent className="pt-6">
          <div className="flex mb-4 gap-2 items-center justify-center">
            <AlertCircle className="h-8 w-8 text-red-500" />
            <h1 className="text-2xl font-bold text-white">
              404 Page Not Found
            </h1>
          </div>
          <p className="mt-4 text-gray-400 text-center text-sm mb-6">
            The page you are looking for does not exist in the Harvverse.
          </p>
          <Link href="/">
            <Button className="w-full bg-primary hover:bg-primary/90 text-[#0a0e27] font-bold">
              Return Home
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
