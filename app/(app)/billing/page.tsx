"use client";

import { getCreditBalance, topUpCredits } from "@/lib/api";
import { useAuth } from "@clerk/nextjs";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Grid,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import React from "react";

const TOP_UP_OPTIONS = [10, 25, 50, 100];

const YIYO_CREDIT_TABLE: { action: string; credits: number }[] = [
  { action: "Light text workflow", credits: 2 },
  { action: "Standard text workflow", credits: 3 },
  { action: "Heavy text workflow", credits: 4 },
  { action: "Video generation", credits: 7 },
];

type PlanFeature = { text: string; included: boolean };
type OutcomePlan = {
  id: string;
  name: string;
  price: string;
  priceLabel: string;
  features: PlanFeature[];
  cta: string;
  creditsNote: string;
  mostPopular?: boolean;
};

const OUTCOME_PLANS: OutcomePlan[] = [
  {
    id: "creator",
    name: "Creator",
    price: "€29",
    priceLabel: "",
    creditsNote: "~40 credits",
    features: [
      { text: "~2 Campaigns workflows", included: true },
      { text: "~7 video", included: true },
      { text: "Unlimited refinements", included: true },
      { text: "Brand-aware AI", included: true },
      { text: "Fast generation", included: true },
    ],
    cta: "Start creating",
  },
  {
    id: "growth",
    name: "Growth",
    price: "€99",
    priceLabel: "",
    creditsNote: "~150 credits",
    features: [
      { text: "~10+ Campaigns workflows", included: true },
      { text: "~20 videos", included: true },
      { text: "Unlimited refinements", included: true },
      { text: "Advanced multi-agent workflows", included: true },
      { text: "Campaign-ready outputs", included: true },
    ],
    cta: "Scale my content",
    mostPopular: true,
  },
  {
    id: "agency",
    name: "Agency",
    price: "€249",
    priceLabel: "",
    creditsNote: "~520 credits",
    features: [
      { text: "~50+ Campaigns workflows", included: true },
      { text: "~50 videos", included: true },
      { text: "Team usage", included: true },
      { text: "Priority workflows", included: true },
      { text: "Client-ready exports", included: true },
    ],
    cta: "Run my studio",
  },
];

export default function BillingPage() {
  const { userId, isLoaded, getToken } = useAuth();
  const [balance, setBalance] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [pendingAmount, setPendingAmount] = React.useState<number | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const refresh = React.useCallback(async () => {
    if (!userId) return;
    try {
      setLoading(true);
      const token = await getToken();
      const credits = await getCreditBalance(token ?? undefined);
      setBalance(credits);
      setError(null);
    } catch {
      setError("Failed to load credits data.");
    } finally {
      setLoading(false);
    }
  }, [userId, getToken]);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  const handleTopUp = async (amount: number) => {
    if (!userId) return;
    try {
      setPendingAmount(amount);
      const token = await getToken();
      const nextBalance = await topUpCredits(amount, token ?? undefined);
      setBalance(nextBalance);
      setError(null);
    } catch {
      setError("Top-up failed. Please try again.");
    } finally {
      setPendingAmount(null);
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
          Pay for results, not subscriptions you don’t use.
        </Typography>
      </Stack>

      <Paper variant="outlined" sx={{ borderRadius: 3, p: 2.5 }}>
        <Stack spacing={1}>
          <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
            Your balance
          </Typography>
          <Typography variant="h4" sx={{ fontWeight: 900 }}>
            €{balance.toFixed(2)}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Available for campaigns workflows and videos.
          </Typography>
        </Stack>
      </Paper>

      <Stack spacing={1} sx={{ width: "100%" }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
          Choose your plan
        </Typography>
        <Grid
          container
          spacing={2}
          justifyContent="center"
          sx={{ width: "100%" }}
        >
          {OUTCOME_PLANS.map((plan) => (
            <Grid size={{ xs: 12, md: 4 }} key={plan.id}>
              <Card
                variant="outlined"
                sx={{
                  height: "100%",
                  borderRadius: 3,
                  position: "relative",
                  borderWidth: plan.mostPopular ? 2 : 1,
                  borderColor: plan.mostPopular ? "primary.main" : "divider",
                  bgcolor: plan.mostPopular
                    ? "action.hover"
                    : "background.paper",
                  boxShadow: plan.mostPopular ? 2 : 0,
                }}
              >
                {plan.mostPopular && (
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
                <CardContent
                  sx={{ pt: plan.mostPopular ? 3 : 2, pb: 2, px: 2.5 }}
                >
                  <Typography variant="h6" sx={{ fontWeight: 800, mb: 0.5 }}>
                    {plan.name}
                  </Typography>
                  <Stack
                    direction="row"
                    alignItems="baseline"
                    spacing={0.5}
                    sx={{ mb: 2 }}
                  >
                    <Typography variant="h4" sx={{ fontWeight: 900 }}>
                      {plan.price}
                    </Typography>
                    <Typography color="text.secondary">
                      {plan.priceLabel}
                    </Typography>
                  </Stack>
                  <Stack spacing={1} sx={{ mb: 2 }}>
                    {plan.features.map((f) => (
                      <Stack
                        key={f.text}
                        direction="row"
                        alignItems="center"
                        spacing={1}
                      >
                        <Typography
                          component="span"
                          sx={{
                            color: f.included ? "success.main" : "error.main",
                            fontWeight: 700,
                            fontSize: "1rem",
                          }}
                        >
                          {f.included ? "✓" : "✗"}
                        </Typography>
                        <Typography variant="body2">{f.text}</Typography>
                      </Stack>
                    ))}
                  </Stack>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    display="block"
                    sx={{ mb: 2 }}
                  >
                    ({plan.creditsNote})
                  </Typography>
                  <Button
                    variant="contained"
                    fullWidth
                    size={plan.mostPopular ? "large" : "medium"}
                    sx={{
                      textTransform: "none",
                      borderRadius: 2,
                      fontWeight: 800,
                      py: plan.mostPopular ? 1.5 : 1.25,
                    }}
                  >
                    {plan.cta}
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          ))}
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
            Text workflows and videos use credits behind the scenes. Refinements
            are free. You only spend credits when you generate new content.
          </Typography>
        </Stack>
      </Paper>

      <Accordion
        disableGutters
        sx={{
          borderRadius: 2,
          "&:before": { display: "none" },
          boxShadow: "none",
          border: 1,
          borderColor: "divider",
        }}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            Usage details
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Action</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>
                  Credits
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {YIYO_CREDIT_TABLE.map((row) => (
                <TableRow key={row.action}>
                  <TableCell>{row.action}</TableCell>
                  <TableCell align="right">{row.credits}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </AccordionDetails>
      </Accordion>

      {error ? <Alert severity="error">{error}</Alert> : null}
    </Stack>
  );
}
