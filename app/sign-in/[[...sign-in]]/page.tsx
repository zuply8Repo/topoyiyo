"use client";

import { SignIn } from "@clerk/nextjs";
import { useSearchParams } from "next/navigation";
import React, { Suspense } from "react";

function SignInContent() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/prompt";

  return (
    <div style={{ display: "grid", placeItems: "center", minHeight: "100vh" }}>
      <SignIn
        path="/sign-in"
        routing="path"
        signUpUrl={`/sign-up?next=${encodeURIComponent(next)}`}
        forceRedirectUrl={next}
      />
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense>
      <SignInContent />
    </Suspense>
  );
}
