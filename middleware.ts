import {
  clerkClient,
  clerkMiddleware,
  createRouteMatcher,
} from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isProtectedRoute = createRouteMatcher([
  "/prompt(.*)",
  "/loading(.*)",
  "/review(.*)",
  "/approval(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  const { pathname } = req.nextUrl;
  const { userId, sessionClaims } = await auth();

  // Legacy route: keep old links working.
  if (pathname === "/login") {
    const url = new URL("/sign-in", req.url);
    url.searchParams.set("next", "/prompt");
    return NextResponse.redirect(url);
  }

  // Not signed in: protect core app routes (and onboarding itself).
  if (!userId) {
    if (isProtectedRoute(req) || pathname.startsWith("/onboarding")) {
      const next = `${pathname}${req.nextUrl.search}`;
      const url = new URL("/sign-in", req.url);
      url.searchParams.set("next", next);
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  // Signed in: keep users out of auth pages.
  if (pathname.startsWith("/sign-in") || pathname.startsWith("/sign-up")) {
    return NextResponse.redirect(new URL("/prompt", req.url));
  }

  // Onboarding gate.
  // We prefer session claims (fast), but those can be stale right after we update
  // Clerk metadata. Fall back to fetching the user when needed.
  let onboardingComplete = Boolean(
    (sessionClaims?.publicMetadata as Record<string, unknown> | undefined)
      ?.onboardingComplete
  );

  if (!onboardingComplete) {
    try {
      const client = await clerkClient();
      const user = await client.users.getUser(userId);
      onboardingComplete = Boolean(
        (user.publicMetadata as Record<string, unknown> | undefined)
          ?.onboardingComplete
      );
    } catch {
      // best-effort: keep gating based on session claims
    }
  }

  // Already onboarded: never show onboarding again.
  if (pathname.startsWith("/onboarding") && onboardingComplete) {
    const next = req.nextUrl.searchParams.get("next") || "/prompt";
    return NextResponse.redirect(new URL(next, req.url));
  }

  if (
    isProtectedRoute(req) &&
    !onboardingComplete &&
    !pathname.startsWith("/onboarding")
  ) {
    const url = new URL("/onboarding", req.url);
    url.searchParams.set("next", `${pathname}${req.nextUrl.search}`);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
});

export const config = {
  // Ensure Clerk middleware runs for both pages + API routes.
  // This is required for `auth()` to work inside App Router route handlers.
  matcher: [
    // Match all routes except static files and Next.js internals
    "/((?!.*\\..*|_next).*)",
    // Always run for the root route
    "/",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
