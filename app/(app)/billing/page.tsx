"use client";

import {
  BillingInterval,
  BillingPlan,
  createCheckoutSession,
  getBillingOverview,
  PackageCode,
} from "@/lib/api";
import { useAuth } from "@clerk/nextjs";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Grid,
  Paper,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { useSearchParams } from "next/navigation";
import React, { Suspense } from "react";

const PACKAGE_DESCRIPTIONS: Record<PackageCode, string> = {
  curiosity: "Best for exploring the workflow and testing new models.",
  content_creator: "A balanced plan for recurring content production.",
  pro: "Higher-volume usage for creators and in-house teams.",
  agency: "The largest package for client work and multi-campaign output.",
};

function BillingPageInner() {
  const { userId, isLoaded, getToken } = useAuth();
  const searchParams = useSearchParams();
  const [balance, setBalance] = React.useState(0);
  const [plans, setPlans] = React.useState<BillingPlan[]>([]);
  const [activePackage, setActivePackage] = React.useState<{
    package_code: PackageCode;
    display_name: string;
    billing_interval: BillingInterval;
    status: string;
    current_period_end?: string | null;
    cancel_at_period_end: boolean;
  } | null>(null);
  const [usageExamples, setUsageExamples] = React.useState<
    Array<{ label: string; credits: number }>
  >([]);
  const [loading, setLoading] = React.useState(true);
  const [pendingPackage, setPendingPackage] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [interval, setInterval] =
    React.useState<BillingInterval>("monthly_recurring");

  const paymentSuccess = !!searchParams.get("session_id");
  const paymentCanceled = searchParams.get("canceled") === "true";

  const refresh = React.useCallback(async () => {
    if (!userId) return;
    try {
      setLoading(true);
      const token = await getToken();
      const overview = await getBillingOverview(token ?? undefined);
      setBalance(overview.balance_credits);
      setPlans(overview.plans);
      setActivePackage(overview.active_package ?? null);
      if (overview.active_package?.billing_interval) {
        setInterval(overview.active_package.billing_interval);
      }
      setUsageExamples(
        overview.usage_examples.map((item) => ({
          label: item.label,
          credits: item.credits,
        }))
      );
      setError(null);
    } catch {
      setError("Failed to load billing data.");
    } finally {
      setLoading(false);
    }
  }, [userId, getToken]);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  const handleSelectPlan = async (packageCode: PackageCode) => {
    if (!userId) return;
    try {
      setPendingPackage(`${packageCode}:${interval}`);
      const token = await getToken();
      const sessionUrl = await createCheckoutSession(
        packageCode,
        interval,
        token ?? undefined
      );
      window.location.href = sessionUrl;
    } catch {
      setError("Could not start checkout. Please try again.");
      setPendingPackage(null);
    }
  };

  if (!isLoaded || loading) {
    return (
      <Stack
        spacing={2.5}
        alignItems="center"
        justifyContent="center"
        sx={{ minHeight: 320 }}
      >
        <CircularProgress />
        <Typography color="text.secondary">Loading billing...</Typography>
      </Stack>
    );
  }

  if (!userId) {
    return (
      <Stack
        spacing={2.5}
        alignItems="center"
        justifyContent="center"
        sx={{ minHeight: 320 }}
      >
        <Typography color="text.secondary">
          Please sign in to manage your plan.
        </Typography>
      </Stack>
    );
  }

  return (
    <Stack spacing={3} sx={{ width: "100%", maxWidth: "100%" }}>
      <Stack spacing={0.25}>
        <Typography variant="h5" sx={{ fontWeight: 900 }}>
          Billing
        </Typography>
        <Typography color="text.secondary">
          Manage your package, credits, and renewal interval.
        </Typography>
      </Stack>

      {paymentSuccess && (
        <Alert
          severity="success"
          icon={<CheckCircleOutlineIcon fontSize="inherit" />}
          sx={{ borderRadius: 2 }}
        >
          Payment successful. Your subscription is being processed.
        </Alert>
      )}
      {paymentCanceled && (
        <Alert severity="info" sx={{ borderRadius: 2 }}>
          Payment canceled. No charge was made.
        </Alert>
      )}

      <Paper variant="outlined" sx={{ borderRadius: 3, p: 2.5 }}>
        <Stack spacing={1.5}>
          <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
            Your balance
          </Typography>
          <Typography variant="h4" sx={{ fontWeight: 900 }}>
            {balance.toFixed(2)} credits
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Credits are used for marketing workflows, video generations, and image generations.
          </Typography>
          {activePackage ? (
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                Current package
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: 700 }}>
                {activePackage.display_name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {activePackage.billing_interval === "monthly_recurring"
                  ? "Monthly recurring"
                  : "Annual recurring"}
                {activePackage.current_period_end
                  ? ` • renews ${new Date(
                      activePackage.current_period_end
                    ).toLocaleDateString()}`
                  : ""}
              </Typography>
            </Box>
          ) : (
            <Typography variant="body2" color="text.secondary">
              No active package yet.
            </Typography>
          )}
        </Stack>
      </Paper>

      <Stack spacing={1} sx={{ width: "100%" }}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1.5}
          justifyContent="space-between"
          alignItems={{ xs: "flex-start", sm: "center" }}
        >
          <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
            Choose your package
          </Typography>
          <ToggleButtonGroup
            value={interval}
            exclusive
            onChange={(_, value: BillingInterval | null) => {
              if (value) setInterval(value);
            }}
            size="small"
          >
            <ToggleButton value="monthly_recurring">Monthly</ToggleButton>
            <ToggleButton value="annual_recurring">Annual</ToggleButton>
          </ToggleButtonGroup>
        </Stack>
        <Grid
          container
          spacing={2}
          justifyContent="center"
          sx={{ width: "100%" }}
        >
          {plans.map((plan) => {
            const selectedPrice = plan.prices.find(
              (price) => price.billing_interval === interval
            );
            const isPopular = plan.package_code === "pro";
            const isCurrent = activePackage?.package_code === plan.package_code;
            return (
              <Grid size={{ xs: 12, md: 6, xl: 3 }} key={plan.package_code}>
                <Card
                  variant="outlined"
                  sx={{
                    height: "100%",
                    borderRadius: 3,
                    position: "relative",
                    borderWidth: isPopular ? 2 : 1,
                    borderColor: isCurrent
                      ? "success.main"
                      : isPopular
                      ? "primary.main"
                      : "divider",
                    bgcolor: isPopular
                      ? "action.hover"
                      : "background.paper",
                    boxShadow: isPopular ? 2 : 0,
                  }}
                >
                  {isPopular && (
                    <Box
                      sx={{
                        position: "absolute",
                        top: 0,
                        right: 0,
                        bgcolor: "primary.main",
                        color: "primary.contrastText",
                        px: 1.5,
                        py: 0.5,
                        borderBottomLeftRadius: 12,
                        fontSize: "0.75rem",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: 0.5,
                      }}
                    >
                      Most popular
                    </Box>
                  )}
                  {isCurrent && (
                    <Box
                      sx={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        bgcolor: "success.main",
                        color: "success.contrastText",
                        px: 1.5,
                        py: 0.5,
                        borderBottomRightRadius: 12,
                        fontSize: "0.75rem",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: 0.5,
                      }}
                    >
                      Current
                    </Box>
                  )}
                  <CardContent sx={{ pt: isPopular ? 3 : 2, pb: 2, px: 2.5 }}>
                    <Typography variant="h6" sx={{ fontWeight: 800, mb: 0.5 }}>
                      {plan.display_name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {PACKAGE_DESCRIPTIONS[plan.package_code]}
                    </Typography>
                    <Stack
                      direction="row"
                      alignItems="baseline"
                      spacing={0.5}
                      sx={{ mb: 2 }}
                    >
                      <Typography variant="h4" sx={{ fontWeight: 900 }}>
                        €{selectedPrice?.price_eur.toFixed(0) ?? "—"}
                      </Typography>
                      <Typography color="text.secondary">
                        /{interval === "monthly_recurring" ? "month" : "year"}
                      </Typography>
                    </Stack>
                    <Stack spacing={1} sx={{ mb: 2 }}>
                      <Typography variant="body2">
                        {selectedPrice?.credits_granted.toFixed(0) ?? "0"} credits per cycle
                      </Typography>
                      <Typography variant="body2">
                        Flexible provider pricing managed from the backend catalog
                      </Typography>
                      <Typography variant="body2">
                        Promotions and future model launches can reuse the same billing engine
                      </Typography>
                    </Stack>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      display="block"
                      sx={{ mb: 2 }}
                    >
                      {interval === "annual_recurring"
                        ? "Annual recurring subscription"
                        : "Monthly recurring subscription"}
                    </Typography>
                    <Button
                      variant="contained"
                      fullWidth
                      size={isPopular ? "large" : "medium"}
                      disabled={!selectedPrice || !!pendingPackage}
                      onClick={() => handleSelectPlan(plan.package_code)}
                      sx={{
                        textTransform: "none",
                        borderRadius: 2,
                        fontWeight: 800,
                        py: isPopular ? 1.5 : 1.25,
                      }}
                    >
                      {pendingPackage === `${plan.package_code}:${interval}` ? (
                        <CircularProgress size={20} color="inherit" />
                      ) : (
                        isCurrent ? "Manage current package" : "Choose package"
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      </Stack>

      <Paper
        variant="outlined"
        sx={{ borderRadius: 3, p: 2.5, bgcolor: "action.hover" }}
      >
        <Stack spacing={1}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            How usage works
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Quotes and charges are resolved by the backend pricing engine. That keeps Prompt,
            Studio V2, Review, and Approval on the same billing logic.
          </Typography>
        </Stack>
      </Paper>

      <Paper variant="outlined" sx={{ borderRadius: 3, p: 2.5 }}>
        <Stack spacing={1.5}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            Estimated usage examples
          </Typography>
          {usageExamples.map((item) => (
            <Stack
              key={item.label}
              direction="row"
              justifyContent="space-between"
              spacing={2}
            >
              <Typography variant="body2">{item.label}</Typography>
              <Typography variant="body2" sx={{ fontWeight: 800 }}>
                {item.credits.toFixed(2)} credits
              </Typography>
            </Stack>
          ))}
        </Stack>
      </Paper>

      {error ? <Alert severity="error">{error}</Alert> : null}
    </Stack>
  );
}

export default function BillingPage() {
  return (
    <Suspense fallback={<CircularProgress />}>
      <BillingPageInner />
    </Suspense>
  );
}
