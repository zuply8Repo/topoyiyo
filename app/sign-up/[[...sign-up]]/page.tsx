"use client";

import { SignUp } from "@clerk/nextjs";
import { useSearchParams } from "next/navigation";
import React, { Suspense } from "react";

function SignUpContent() {
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

export default function SignUpPage() {
  return (
    <Suspense>
      <SignUpContent />
    </Suspense>
  );
}
