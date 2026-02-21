"use client";

import { SignUp } from "@clerk/nextjs";
import { useSearchParams } from "next/navigation";
import React from "react";

export default function SignUpPage() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/onboarding";

  return (
    <div style={{ display: "grid", placeItems: "center", minHeight: "100vh" }}>
      <SignUp
        path="/sign-up"
        routing="path"
        signInUrl={`/sign-in?next=${encodeURIComponent(next)}`}
        forceRedirectUrl={next}
      />
    </div>
  );
}

