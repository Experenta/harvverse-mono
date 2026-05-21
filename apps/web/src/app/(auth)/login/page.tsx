import { redirect } from "next/navigation";
import type { Route } from "next";

export default function LoginPage() {
  redirect("/sign-in" as Route);
}
