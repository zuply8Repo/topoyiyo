"use client";

export const dynamic = 'force-dynamic';

import { SignIn } from "@clerk/nextjs";
import { useSearchParams } from "next/navigation";
import React from "react";

export default function SignInPage() {
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

