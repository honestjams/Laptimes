import { Suspense } from "react";
import { AuthForm } from "@/components/auth-form";

export const metadata = { title: "Sign up" };

export default function Page() {
  return (
    <div className="pt-6">
      <Suspense>
        <AuthForm mode="signup" />
      </Suspense>
    </div>
  );
}
