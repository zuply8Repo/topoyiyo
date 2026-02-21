"use client";

import { useAuth, useClerk } from "@clerk/nextjs";
import {
  Alert,
  Box,
  Button,
  Container,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useRouter, useSearchParams } from "next/navigation";
import React from "react";

type OnboardingPayload = {
  full_name: string;
  industry: string;
  business_name: string;
  country: string;
  address: string;
};

export default function OnboardingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/prompt";
  const { userId, isLoaded } = useAuth();
  const clerk = useClerk();

  const [form, setForm] = React.useState<OnboardingPayload>({
    full_name: "",
    industry: "",
    business_name: "",
    country: "",
    address: "",
  });
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const setField =
    (k: keyof OnboardingPayload) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setForm((prev) => ({ ...prev, [k]: e.target.value }));
    };

  const validate = () => {
    const missing = Object.entries(form)
      .filter(([, v]) => !v.trim())
      .map(([k]) => k);
    return missing;
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isLoaded) return;
    if (!userId) {
      setError("Please sign in to continue.");
      return;
    }

    const missing = validate();
    if (missing.length > 0) {
      setError("Please complete all required fields.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "Failed to save onboarding profile.");
      }

      // Middleware gates using `sessionClaims.publicMetadata.onboardingComplete`.
      // After we update metadata server-side, refresh the Clerk session so claims
      // are updated before navigating.
      try {
        await clerk.session?.reload();
      } catch {
        // best-effort
      }

      window.location.assign(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Container maxWidth="sm" sx={{ py: 6 }}>
      <Paper variant="outlined" sx={{ borderRadius: 4, p: { xs: 3, sm: 4 } }}>
        <Stack spacing={2}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 900 }}>
              Welcome!
            </Typography>
            <Typography color="text.secondary">
              Tell us a bit about your business to continue.
            </Typography>
          </Box>

          {error && <Alert severity="error">{error}</Alert>}

          <Box component="form" onSubmit={onSubmit}>
            <Stack spacing={2}>
              <TextField
                label="Full name"
                value={form.full_name}
                onChange={setField("full_name")}
                required
                fullWidth
              />
              <TextField
                label="Industry"
                value={form.industry}
                onChange={setField("industry")}
                required
                fullWidth
              />
              <TextField
                label="Business name"
                value={form.business_name}
                onChange={setField("business_name")}
                required
                fullWidth
              />
              <TextField
                label="Country"
                value={form.country}
                onChange={setField("country")}
                required
                fullWidth
              />
              <TextField
                label="Address"
                value={form.address}
                onChange={setField("address")}
                required
                fullWidth
                multiline
                minRows={3}
              />

              <Button
                type="submit"
                variant="contained"
                disabled={submitting || !isLoaded}
                sx={{ textTransform: "none", borderRadius: 2, fontWeight: 800 }}
              >
                {submitting ? "Saving..." : "Continue"}
              </Button>
            </Stack>
          </Box>
        </Stack>
      </Paper>
    </Container>
  );
}
