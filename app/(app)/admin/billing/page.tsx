"use client";

import {
  AdminBillingOverviewResponse,
  AdminBillingUser,
  AdminCatalogModel,
  AdminCatalogPackage,
  AdminCatalogPackagePrice,
  AdminCatalogPricingRule,
  AdminCatalogPromotion,
  AdminCatalogProvider,
  AdminCatalogVariant,
  ApiError,
  BillingRuntimeSettings,
  BillingInterval,
  BillingPlan,
  KlingEndpointPricingConfig,
  createAdminModel,
  createAdminKlingOmniConfig,
  createAdminPackagePrice,
  createAdminPricingRule,
  createAdminPromotion,
  createAdminProvider,
  createAdminVariant,
  getAdminBillingCatalog,
  getAdminBillingSettings,
  getAdminBillingOverview,
  getAdminKlingOmniConfig,
  grantAdminCredits,
  searchAdminBillingUsers,
  updateAdminModel,
  updateAdminBillingSettings,
  updateAdminKlingOmniConfig,
  updateAdminPackagePrice,
  updateAdminPricingRule,
  updateAdminPromotion,
  updateAdminProvider,
  updateAdminVariant,
} from "@/lib/api";
import { useAuth, useUser } from "@clerk/nextjs";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Divider,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import React from "react";

function intervalLabel(interval: BillingInterval) {
  return interval === "monthly_recurring" ? "Monthly" : "Annual";
}

function toInputDateTime(value?: string | null) {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  const offset = parsed.getTimezoneOffset();
  const local = new Date(parsed.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 16);
}

function fromInputDateTime(value: string) {
  return value ? new Date(value).toISOString() : null;
}

function parseMetadata(text: string) {
  if (!text.trim()) return {};
  return JSON.parse(text) as Record<string, unknown>;
}

const DEFAULT_PACKAGE_PRICE_FORM = {
  id: "",
  package_id: "",
  billing_interval: "monthly_recurring" as BillingInterval,
  price_eur: "0",
  credits_granted: "0",
  stripe_price_id: "",
  effective_from: "",
  effective_to: "",
  active: true,
};

const DEFAULT_PROVIDER_FORM = {
  id: "",
  provider_key: "",
  display_name: "",
  active: true,
};

const DEFAULT_MODEL_FORM = {
  id: "",
  provider_id: "",
  model_key: "",
  display_name: "",
  media_type: "text",
  active: true,
};

const DEFAULT_VARIANT_FORM = {
  id: "",
  model_id: "",
  variant_key: "",
  display_name: "",
  active: true,
};

const DEFAULT_RULE_FORM = {
  id: "",
  action_type: "",
  model_id: "",
  variant_id: "",
  package_id: "",
  billing_dimension: "",
  unit_size: "1",
  provider_cost_eur: "0",
  sell_price_credits: "0",
  effective_from: "",
  effective_to: "",
  active: true,
  metadata: "{}",
};

const DEFAULT_PROMOTION_FORM = {
  id: "",
  name: "",
  target_scope: "global",
  package_id: "",
  model_id: "",
  variant_id: "",
  discount_type: "percentage",
  discount_value: "0",
  starts_at: "",
  ends_at: "",
  active: true,
  metadata: "{}",
};

const DEFAULT_BILLING_SETTINGS_FORM = {
  usd_to_credit_rate: "40",
  kling_markup_percent: "60",
};

const DEFAULT_KLING_CONFIG_FORM = {
  id: "",
  endpoint_key: "kling_v3_omni",
  mode: "std",
  has_image_input: false,
  has_audio: false,
  unit_type: "per_second",
  provider_unit_cost_usd: "0",
  effective_from: "",
  effective_to: "",
  active: true,
  metadata: "{}",
};

export default function AdminBillingPage() {
  const { userId, isLoaded, getToken } = useAuth();
  const { user } = useUser();
  const [loading, setLoading] = React.useState(true);
  const [submitting, setSubmitting] = React.useState<string | null>(null);
  const [plans, setPlans] = React.useState<BillingPlan[]>([]);
  const [recentGrants, setRecentGrants] =
    React.useState<AdminBillingOverviewResponse["recent_manual_grants"]>([]);
  const [packages, setPackages] = React.useState<AdminCatalogPackage[]>([]);
  const [packagePrices, setPackagePrices] = React.useState<AdminCatalogPackagePrice[]>([]);
  const [providers, setProviders] = React.useState<AdminCatalogProvider[]>([]);
  const [models, setModels] = React.useState<AdminCatalogModel[]>([]);
  const [variants, setVariants] = React.useState<AdminCatalogVariant[]>([]);
  const [pricingRules, setPricingRules] = React.useState<AdminCatalogPricingRule[]>([]);
  const [promotions, setPromotions] = React.useState<AdminCatalogPromotion[]>([]);
  const [billingSettings, setBillingSettings] = React.useState<BillingRuntimeSettings | null>(null);
  const [klingConfigs, setKlingConfigs] = React.useState<KlingEndpointPricingConfig[]>([]);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [searching, setSearching] = React.useState(false);
  const [searchResults, setSearchResults] = React.useState<AdminBillingUser[]>([]);
  const [targetUserId, setTargetUserId] = React.useState("");
  const [amountCredits, setAmountCredits] = React.useState("25");
  const [note, setNote] = React.useState("");
  const [billingSettingsForm, setBillingSettingsForm] = React.useState(
    DEFAULT_BILLING_SETTINGS_FORM
  );
  const [klingConfigForm, setKlingConfigForm] = React.useState(DEFAULT_KLING_CONFIG_FORM);
  const [packagePriceForm, setPackagePriceForm] = React.useState(DEFAULT_PACKAGE_PRICE_FORM);
  const [providerForm, setProviderForm] = React.useState(DEFAULT_PROVIDER_FORM);
  const [modelForm, setModelForm] = React.useState(DEFAULT_MODEL_FORM);
  const [variantForm, setVariantForm] = React.useState(DEFAULT_VARIANT_FORM);
  const [ruleForm, setRuleForm] = React.useState(DEFAULT_RULE_FORM);
  const [promotionForm, setPromotionForm] = React.useState(DEFAULT_PROMOTION_FORM);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);

  const roleValue = (user?.publicMetadata as Record<string, unknown> | undefined)?.role;
  const rolesValue = (user?.publicMetadata as Record<string, unknown> | undefined)?.roles;
  const localRoleSet = new Set(
    [
      typeof roleValue === "string" ? roleValue : null,
      ...(Array.isArray(rolesValue) ? rolesValue.map((item) => String(item)) : []),
    ]
      .filter(Boolean)
      .map((value) => String(value).trim().toLowerCase())
  );
  const looksLikeAdmin =
    localRoleSet.has("admin") || localRoleSet.has("developer");

  const loadData = React.useCallback(async () => {
    if (!userId) return;
    try {
      setLoading(true);
      const token = await getToken();
      const [overview, catalog, settings, klingConfig] = await Promise.all([
        getAdminBillingOverview(token ?? undefined),
        getAdminBillingCatalog(token ?? undefined),
        getAdminBillingSettings(token ?? undefined),
        getAdminKlingOmniConfig(token ?? undefined),
      ]);
      setPlans(overview.plans);
      setRecentGrants(overview.recent_manual_grants);
      setPackages(catalog.packages);
      setPackagePrices(catalog.package_prices);
      setProviders(catalog.providers);
      setModels(catalog.models);
      setVariants(catalog.variants);
      setPricingRules(catalog.pricing_rules);
      setPromotions(catalog.promotions);
      setBillingSettings(settings);
      setBillingSettingsForm({
        usd_to_credit_rate: String(settings.usd_to_credit_rate),
        kling_markup_percent: String(settings.kling_markup_percent),
      });
      setKlingConfigs(klingConfig);
      setError(null);
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        setError(
          "Admin access required. Add your Clerk user to ADMIN_USER_IDS or set your Clerk publicMetadata role to admin/developer."
        );
      } else {
        setError("Failed to load admin billing tools.");
      }
    } finally {
      setLoading(false);
    }
  }, [getToken, userId]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  React.useEffect(() => {
    if (!userId) return;
    const trimmed = searchQuery.trim();
    if (trimmed.length < 2) {
      setSearchResults([]);
      return;
    }
    const handle = window.setTimeout(async () => {
      try {
        setSearching(true);
        const token = await getToken();
        const results = await searchAdminBillingUsers(trimmed, token ?? undefined);
        setSearchResults(results);
      } catch (err) {
        if (err instanceof ApiError) {
          setError(err.message);
        } else {
          setError("Failed to search users.");
        }
      } finally {
        setSearching(false);
      }
    }, 250);
    return () => window.clearTimeout(handle);
  }, [getToken, searchQuery, userId]);

  const withSubmit = async (key: string, action: () => Promise<void>) => {
    try {
      setSubmitting(key);
      setError(null);
      setSuccess(null);
      await action();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Something went wrong.");
      }
    } finally {
      setSubmitting(null);
    }
  };

  const handleGrant = async () => {
    if (!targetUserId.trim()) {
      setError("Target Clerk user ID is required.");
      return;
    }
    if (!note.trim()) {
      setError("Please add a note explaining why you granted credits.");
      return;
    }
    const parsedAmount = Number(amountCredits);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError("Credit amount must be greater than zero.");
      return;
    }

    await withSubmit("grant", async () => {
      const token = await getToken();
      const result = await grantAdminCredits(
        {
          user_id: targetUserId.trim(),
          amount_credits: parsedAmount,
          note: note.trim(),
        },
        token ?? undefined
      );
      setSuccess(
        `Granted ${result.amount_credits.toFixed(2)} credits to ${result.user_id}. New balance: ${result.balance_credits.toFixed(2)} credits.`
      );
      setNote("");
      await loadData();
      if (searchQuery.trim().length >= 2) {
        const results = await searchAdminBillingUsers(searchQuery.trim(), token ?? undefined);
        setSearchResults(results);
      }
    });
  };

  const handleBillingSettingsSubmit = async () => {
    const token = await getToken();
    const payload = {
      usd_to_credit_rate: Number(billingSettingsForm.usd_to_credit_rate),
      kling_markup_percent: Number(billingSettingsForm.kling_markup_percent),
    };
    await updateAdminBillingSettings(payload, token ?? undefined);
    setSuccess("Billing settings updated.");
    await loadData();
  };

  const handleKlingConfigSubmit = async () => {
    const token = await getToken();
    const payload = {
      endpoint_key: klingConfigForm.endpoint_key,
      mode: klingConfigForm.mode,
      has_image_input: klingConfigForm.has_image_input,
      has_audio: klingConfigForm.has_audio,
      unit_type: klingConfigForm.unit_type,
      provider_unit_cost_usd: Number(klingConfigForm.provider_unit_cost_usd),
      effective_from: fromInputDateTime(klingConfigForm.effective_from),
      effective_to: fromInputDateTime(klingConfigForm.effective_to),
      active: klingConfigForm.active,
      metadata: parseMetadata(klingConfigForm.metadata),
    };
    if (klingConfigForm.id) {
      await updateAdminKlingOmniConfig(klingConfigForm.id, payload, token ?? undefined);
      setSuccess("Kling Omni pricing config updated.");
    } else {
      await createAdminKlingOmniConfig(payload, token ?? undefined);
      setSuccess("Kling Omni pricing config created.");
    }
    setKlingConfigForm(DEFAULT_KLING_CONFIG_FORM);
    await loadData();
  };

  const handlePackagePriceSubmit = async () => {
    const token = await getToken();
    const payload = {
      package_id: packagePriceForm.package_id,
      billing_interval: packagePriceForm.billing_interval,
      price_eur: Number(packagePriceForm.price_eur),
      credits_granted: Number(packagePriceForm.credits_granted),
      stripe_price_id: packagePriceForm.stripe_price_id || null,
      effective_from: fromInputDateTime(packagePriceForm.effective_from),
      effective_to: fromInputDateTime(packagePriceForm.effective_to),
      active: packagePriceForm.active,
    };
    if (packagePriceForm.id) {
      await updateAdminPackagePrice(
        packagePriceForm.id,
        payload,
        token ?? undefined
      );
      setSuccess("Package price updated.");
    } else {
      await createAdminPackagePrice(payload, token ?? undefined);
      setSuccess("Package price created.");
    }
    setPackagePriceForm(DEFAULT_PACKAGE_PRICE_FORM);
    await loadData();
  };

  const handleProviderSubmit = async () => {
    const token = await getToken();
    const payload = {
      provider_key: providerForm.provider_key,
      display_name: providerForm.display_name,
      active: providerForm.active,
    };
    if (providerForm.id) {
      await updateAdminProvider(providerForm.id, payload, token ?? undefined);
      setSuccess("Provider updated.");
    } else {
      await createAdminProvider(payload, token ?? undefined);
      setSuccess("Provider created.");
    }
    setProviderForm(DEFAULT_PROVIDER_FORM);
    await loadData();
  };

  const handleModelSubmit = async () => {
    const token = await getToken();
    const payload = {
      provider_id: modelForm.provider_id,
      model_key: modelForm.model_key,
      display_name: modelForm.display_name,
      media_type: modelForm.media_type,
      active: modelForm.active,
    };
    if (modelForm.id) {
      await updateAdminModel(modelForm.id, payload, token ?? undefined);
      setSuccess("Model updated.");
    } else {
      await createAdminModel(payload, token ?? undefined);
      setSuccess("Model created.");
    }
    setModelForm(DEFAULT_MODEL_FORM);
    await loadData();
  };

  const handleVariantSubmit = async () => {
    const token = await getToken();
    const payload = {
      model_id: variantForm.model_id,
      variant_key: variantForm.variant_key,
      display_name: variantForm.display_name,
      active: variantForm.active,
    };
    if (variantForm.id) {
      await updateAdminVariant(variantForm.id, payload, token ?? undefined);
      setSuccess("Variant updated.");
    } else {
      await createAdminVariant(payload, token ?? undefined);
      setSuccess("Variant created.");
    }
    setVariantForm(DEFAULT_VARIANT_FORM);
    await loadData();
  };

  const handleRuleSubmit = async () => {
    const token = await getToken();
    const payload = {
      action_type: ruleForm.action_type,
      model_id: ruleForm.model_id,
      variant_id: ruleForm.variant_id || null,
      package_id: ruleForm.package_id || null,
      billing_dimension: ruleForm.billing_dimension,
      unit_size: Number(ruleForm.unit_size),
      provider_cost_eur: Number(ruleForm.provider_cost_eur),
      sell_price_credits: Number(ruleForm.sell_price_credits),
      effective_from: fromInputDateTime(ruleForm.effective_from),
      effective_to: fromInputDateTime(ruleForm.effective_to),
      active: ruleForm.active,
      metadata: parseMetadata(ruleForm.metadata),
    };
    if (ruleForm.id) {
      await updateAdminPricingRule(ruleForm.id, payload, token ?? undefined);
      setSuccess("Pricing rule updated.");
    } else {
      await createAdminPricingRule(payload, token ?? undefined);
      setSuccess("Pricing rule created.");
    }
    setRuleForm(DEFAULT_RULE_FORM);
    await loadData();
  };

  const handlePromotionSubmit = async () => {
    const token = await getToken();
    const payload = {
      name: promotionForm.name,
      target_scope: promotionForm.target_scope,
      package_id: promotionForm.package_id || null,
      model_id: promotionForm.model_id || null,
      variant_id: promotionForm.variant_id || null,
      discount_type: promotionForm.discount_type,
      discount_value: Number(promotionForm.discount_value),
      starts_at: new Date(promotionForm.starts_at).toISOString(),
      ends_at: new Date(promotionForm.ends_at).toISOString(),
      active: promotionForm.active,
      metadata: parseMetadata(promotionForm.metadata),
    };
    if (promotionForm.id) {
      await updateAdminPromotion(promotionForm.id, payload, token ?? undefined);
      setSuccess("Promotion updated.");
    } else {
      await createAdminPromotion(payload, token ?? undefined);
      setSuccess("Promotion created.");
    }
    setPromotionForm(DEFAULT_PROMOTION_FORM);
    await loadData();
  };

  const archivePackagePrice = async (price: AdminCatalogPackagePrice) =>
    withSubmit(`archive-price-${price.id}`, async () => {
      const token = await getToken();
      await updateAdminPackagePrice(price.id, { active: false }, token ?? undefined);
      setSuccess("Package price archived.");
      await loadData();
    });

  const archiveProvider = async (provider: AdminCatalogProvider) =>
    withSubmit(`archive-provider-${provider.id}`, async () => {
      const token = await getToken();
      await updateAdminProvider(provider.id, { active: false }, token ?? undefined);
      setSuccess("Provider archived.");
      await loadData();
    });

  const archiveModel = async (model: AdminCatalogModel) =>
    withSubmit(`archive-model-${model.id}`, async () => {
      const token = await getToken();
      await updateAdminModel(model.id, { active: false }, token ?? undefined);
      setSuccess("Model archived.");
      await loadData();
    });

  const archiveVariant = async (variant: AdminCatalogVariant) =>
    withSubmit(`archive-variant-${variant.id}`, async () => {
      const token = await getToken();
      await updateAdminVariant(variant.id, { active: false }, token ?? undefined);
      setSuccess("Variant archived.");
      await loadData();
    });

  const archiveRule = async (rule: AdminCatalogPricingRule) =>
    withSubmit(`archive-rule-${rule.id}`, async () => {
      const token = await getToken();
      await updateAdminPricingRule(rule.id, { active: false }, token ?? undefined);
      setSuccess("Pricing rule archived.");
      await loadData();
    });

  const archivePromotion = async (promotion: AdminCatalogPromotion) =>
    withSubmit(`archive-promotion-${promotion.id}`, async () => {
      const token = await getToken();
      await updateAdminPromotion(promotion.id, { active: false }, token ?? undefined);
      setSuccess("Promotion archived.");
      await loadData();
    });

  const archiveKlingConfig = async (config: KlingEndpointPricingConfig) =>
    withSubmit(`archive-kling-config-${config.id}`, async () => {
      const token = await getToken();
      await updateAdminKlingOmniConfig(config.id, { active: false }, token ?? undefined);
      setSuccess("Kling Omni pricing config archived.");
      await loadData();
    });

  if (!isLoaded || loading) {
    return (
      <Stack spacing={2} alignItems="center" justifyContent="center" sx={{ minHeight: 320 }}>
        <CircularProgress />
        <Typography color="text.secondary">Loading admin billing...</Typography>
      </Stack>
    );
  }

  if (!userId) {
    return (
      <Stack spacing={2} alignItems="center" justifyContent="center" sx={{ minHeight: 320 }}>
        <Typography color="text.secondary">Please sign in to open the admin billing panel.</Typography>
      </Stack>
    );
  }

  return (
    <Stack spacing={3}>
      <Stack spacing={0.5}>
        <Typography variant="h5" sx={{ fontWeight: 900 }}>
          Admin Billing
        </Typography>
        <Typography color="text.secondary">
          Manage credits, package prices, providers, models, pricing rules, and promotions.
        </Typography>
      </Stack>

      {!looksLikeAdmin ? (
        <Alert severity="info">
          This page is protected by the backend. If your Clerk metadata does not mark you as
          admin/developer, you can still be allowed through `ADMIN_USER_IDS`.
        </Alert>
      ) : null}
      {error ? <Alert severity="error">{error}</Alert> : null}
      {success ? <Alert severity="success">{success}</Alert> : null}

      <Paper variant="outlined" sx={{ borderRadius: 3, p: 2.5 }}>
        <Stack spacing={2}>
          <Typography variant="h6" sx={{ fontWeight: 800 }}>
            Manual credit grant
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Use this for QA accounts, private trials, support recovery, or selected users you want
            to onboard without sending them through checkout first.
          </Typography>
          <TextField
            label="Search users by name, email, or Clerk user ID"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="e.g. Victor or user_..."
            fullWidth
          />
          {searching ? (
            <Stack direction="row" spacing={1} alignItems="center">
              <CircularProgress size={18} />
              <Typography variant="body2" color="text.secondary">
                Searching users...
              </Typography>
            </Stack>
          ) : null}
          {searchResults.length > 0 ? (
            <Stack spacing={1}>
              {searchResults.map((result) => (
                <Button
                  key={result.user_id}
                  variant={targetUserId === result.user_id ? "contained" : "outlined"}
                  color="inherit"
                  onClick={() => setTargetUserId(result.user_id)}
                  sx={{ justifyContent: "space-between", textTransform: "none", py: 1.25 }}
                >
                  <Stack alignItems="flex-start" spacing={0.25}>
                    <Typography sx={{ fontWeight: 700 }}>
                      {result.full_name || result.email || result.user_id}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {result.email || "No email on profile"} • {result.user_id}
                    </Typography>
                  </Stack>
                  <Typography sx={{ fontWeight: 800 }}>
                    {result.balance_credits.toFixed(2)} cr
                  </Typography>
                </Button>
              ))}
            </Stack>
          ) : null}
          <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
            <TextField
              label="Target Clerk user ID"
              value={targetUserId}
              onChange={(event) => setTargetUserId(event.target.value)}
              fullWidth
            />
            <TextField
              label="Credits to grant"
              value={amountCredits}
              onChange={(event) => setAmountCredits(event.target.value)}
              sx={{ minWidth: { md: 180 } }}
            />
          </Stack>
          <TextField
            label="Internal note"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Examples: QA trial, founder demo, support recovery, promo invite"
            multiline
            minRows={2}
            fullWidth
          />
          <Stack direction="row" spacing={1.5}>
            <Button
              variant="contained"
              onClick={handleGrant}
              disabled={submitting !== null}
              sx={{ textTransform: "none", fontWeight: 800 }}
            >
              {submitting === "grant" ? (
                <CircularProgress size={18} color="inherit" />
              ) : (
                "Grant credits"
              )}
            </Button>
          </Stack>
        </Stack>
      </Paper>

      <Paper variant="outlined" sx={{ borderRadius: 3, p: 2.5 }}>
        <Stack spacing={2}>
          <Typography variant="h6" sx={{ fontWeight: 800 }}>
            Recent manual grants
          </Typography>
          {recentGrants.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No manual grants yet.
            </Typography>
          ) : (
            recentGrants.map((entry, index) => (
              <React.Fragment key={entry.id}>
                <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between">
                  <Box>
                    <Typography sx={{ fontWeight: 700 }}>
                      {entry.full_name || entry.email || entry.user_id}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {entry.note || "No note provided"}
                    </Typography>
                  </Box>
                  <Box sx={{ textAlign: { xs: "left", md: "right" } }}>
                    <Typography sx={{ fontWeight: 800 }}>
                      +{entry.amount_credits.toFixed(2)} credits
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Balance after: {entry.balance_after_credits.toFixed(2)} credits
                    </Typography>
                  </Box>
                </Stack>
                {index < recentGrants.length - 1 ? <Divider /> : null}
              </React.Fragment>
            ))
          )}
        </Stack>
      </Paper>

      <Paper variant="outlined" sx={{ borderRadius: 3, p: 2.5 }}>
        <Stack spacing={2}>
          <Typography variant="h6" sx={{ fontWeight: 800 }}>
            Package catalog
          </Typography>
          {plans.map((plan) => (
            <Box key={plan.package_code}>
              <Typography sx={{ fontWeight: 700 }}>{plan.display_name}</Typography>
              <Stack spacing={0.5} sx={{ mt: 0.75 }}>
                {plan.prices.map((price) => (
                  <Typography key={price.id} variant="body2" color="text.secondary">
                    {intervalLabel(price.billing_interval)}: EUR {price.price_eur.toFixed(2)} for{" "}
                    {price.credits_granted.toFixed(2)} credits
                  </Typography>
                ))}
              </Stack>
            </Box>
          ))}
        </Stack>
      </Paper>

      <Paper variant="outlined" sx={{ borderRadius: 3, p: 2.5 }}>
        <Stack spacing={2}>
          <Typography variant="h6" sx={{ fontWeight: 800 }}>
            Billing runtime settings
          </Typography>
          <Typography variant="body2" color="text.secondary">
            These values drive Kling Omni quote previews and final credit deductions.
          </Typography>
          <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
            <TextField
              label="USD to credit rate"
              value={billingSettingsForm.usd_to_credit_rate}
              onChange={(event) =>
                setBillingSettingsForm((current) => ({
                  ...current,
                  usd_to_credit_rate: event.target.value,
                }))
              }
              fullWidth
            />
            <TextField
              label="Kling markup percent"
              value={billingSettingsForm.kling_markup_percent}
              onChange={(event) =>
                setBillingSettingsForm((current) => ({
                  ...current,
                  kling_markup_percent: event.target.value,
                }))
              }
              fullWidth
            />
          </Stack>
          {billingSettings ? (
            <Typography variant="body2" color="text.secondary">
              Active runtime settings: {billingSettings.usd_to_credit_rate.toFixed(2)} credits per
              USD and {billingSettings.kling_markup_percent.toFixed(2)}% Kling markup.
            </Typography>
          ) : null}
          <Stack direction="row" spacing={1.5}>
            <Button
              variant="contained"
              disabled={submitting !== null}
              onClick={() => withSubmit("billing-settings", handleBillingSettingsSubmit)}
              sx={{ textTransform: "none" }}
            >
              Save settings
            </Button>
          </Stack>
        </Stack>
      </Paper>

      <Paper variant="outlined" sx={{ borderRadius: 3, p: 2.5 }}>
        <Stack spacing={2}>
          <Typography variant="h6" sx={{ fontWeight: 800 }}>
            Kling v3 Omni pricing
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Configure the provider USD cost per second for each user-visible Kling combination.
          </Typography>
          <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
            <TextField
              label="Endpoint key"
              value={klingConfigForm.endpoint_key}
              onChange={(event) =>
                setKlingConfigForm((current) => ({ ...current, endpoint_key: event.target.value }))
              }
              fullWidth
            />
            <TextField
              select
              label="Mode"
              value={klingConfigForm.mode}
              onChange={(event) =>
                setKlingConfigForm((current) => ({ ...current, mode: event.target.value }))
              }
              fullWidth
            >
              <option value="std">std</option>
              <option value="pro">pro</option>
            </TextField>
          </Stack>
          <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
            <TextField
              select
              label="Has image input"
              value={klingConfigForm.has_image_input ? "yes" : "no"}
              onChange={(event) =>
                setKlingConfigForm((current) => ({
                  ...current,
                  has_image_input: event.target.value === "yes",
                }))
              }
              fullWidth
            >
              <option value="no">No</option>
              <option value="yes">Yes</option>
            </TextField>
            <TextField
              select
              label="Has audio"
              value={klingConfigForm.has_audio ? "yes" : "no"}
              onChange={(event) =>
                setKlingConfigForm((current) => ({
                  ...current,
                  has_audio: event.target.value === "yes",
                }))
              }
              fullWidth
            >
              <option value="no">No</option>
              <option value="yes">Yes</option>
            </TextField>
            <TextField
              label="Provider cost USD / second"
              value={klingConfigForm.provider_unit_cost_usd}
              onChange={(event) =>
                setKlingConfigForm((current) => ({
                  ...current,
                  provider_unit_cost_usd: event.target.value,
                }))
              }
              fullWidth
            />
          </Stack>
          <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
            <TextField
              type="datetime-local"
              label="Effective from"
              value={klingConfigForm.effective_from}
              onChange={(event) =>
                setKlingConfigForm((current) => ({ ...current, effective_from: event.target.value }))
              }
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
            <TextField
              type="datetime-local"
              label="Effective to"
              value={klingConfigForm.effective_to}
              onChange={(event) =>
                setKlingConfigForm((current) => ({ ...current, effective_to: event.target.value }))
              }
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
          </Stack>
          <TextField
            label="Metadata JSON"
            value={klingConfigForm.metadata}
            onChange={(event) =>
              setKlingConfigForm((current) => ({ ...current, metadata: event.target.value }))
            }
            multiline
            minRows={2}
            fullWidth
          />
          <Stack direction="row" spacing={1.5}>
            <Button
              variant="contained"
              disabled={submitting !== null}
              onClick={() => withSubmit("kling-config", handleKlingConfigSubmit)}
              sx={{ textTransform: "none" }}
            >
              {klingConfigForm.id ? "Update Kling config" : "Create Kling config"}
            </Button>
            <Button
              variant="outlined"
              onClick={() => setKlingConfigForm(DEFAULT_KLING_CONFIG_FORM)}
              sx={{ textTransform: "none" }}
            >
              Reset
            </Button>
          </Stack>
          <Divider />
          {klingConfigs.map((config) => (
            <Stack
              key={config.id}
              direction={{ xs: "column", md: "row" }}
              justifyContent="space-between"
              spacing={1.5}
            >
              <Box>
                <Typography sx={{ fontWeight: 700 }}>
                  {config.endpoint_key} • {config.mode} • {config.has_image_input ? "image" : "no image"} •{" "}
                  {config.has_audio ? "audio" : "no audio"}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  USD {config.provider_unit_cost_usd.toFixed(4)} / second • {config.active ? "Active" : "Archived"}
                </Typography>
              </Box>
              <Stack direction="row" spacing={1}>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() =>
                    setKlingConfigForm({
                      id: config.id,
                      endpoint_key: config.endpoint_key,
                      mode: config.mode,
                      has_image_input: config.has_image_input,
                      has_audio: config.has_audio,
                      unit_type: config.unit_type,
                      provider_unit_cost_usd: String(config.provider_unit_cost_usd),
                      effective_from: toInputDateTime(config.effective_from),
                      effective_to: toInputDateTime(config.effective_to),
                      active: config.active,
                      metadata: JSON.stringify(config.metadata ?? {}, null, 2),
                    })
                  }
                >
                  Edit
                </Button>
                {config.active ? (
                  <Button size="small" color="warning" onClick={() => archiveKlingConfig(config)}>
                    Archive
                  </Button>
                ) : null}
              </Stack>
            </Stack>
          ))}
        </Stack>
      </Paper>

      <Paper variant="outlined" sx={{ borderRadius: 3, p: 2.5 }}>
        <Stack spacing={2}>
          <Typography variant="h6" sx={{ fontWeight: 800 }}>
            Package prices
          </Typography>
          <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
            <TextField
              select
              label="Package"
              value={packagePriceForm.package_id}
              onChange={(event) =>
                setPackagePriceForm((current) => ({ ...current, package_id: event.target.value }))
              }
              fullWidth
            >
              {packages.map((pkg) => (
                <option key={pkg.id} value={pkg.id}>
                  {pkg.display_name}
                </option>
              ))}
            </TextField>
            <TextField
              select
              label="Billing interval"
              value={packagePriceForm.billing_interval}
              onChange={(event) =>
                setPackagePriceForm((current) => ({
                  ...current,
                  billing_interval: event.target.value as BillingInterval,
                }))
              }
              fullWidth
            >
              <option value="monthly_recurring">Monthly recurring</option>
              <option value="annual_recurring">Annual recurring</option>
            </TextField>
          </Stack>
          <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
            <TextField
              label="Price EUR"
              value={packagePriceForm.price_eur}
              onChange={(event) =>
                setPackagePriceForm((current) => ({ ...current, price_eur: event.target.value }))
              }
              fullWidth
            />
            <TextField
              label="Credits granted"
              value={packagePriceForm.credits_granted}
              onChange={(event) =>
                setPackagePriceForm((current) => ({
                  ...current,
                  credits_granted: event.target.value,
                }))
              }
              fullWidth
            />
          </Stack>
          <TextField
            label="Stripe price ID"
            value={packagePriceForm.stripe_price_id}
            onChange={(event) =>
              setPackagePriceForm((current) => ({ ...current, stripe_price_id: event.target.value }))
            }
            fullWidth
          />
          <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
            <TextField
              type="datetime-local"
              label="Effective from"
              value={packagePriceForm.effective_from}
              onChange={(event) =>
                setPackagePriceForm((current) => ({ ...current, effective_from: event.target.value }))
              }
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
            <TextField
              type="datetime-local"
              label="Effective to"
              value={packagePriceForm.effective_to}
              onChange={(event) =>
                setPackagePriceForm((current) => ({ ...current, effective_to: event.target.value }))
              }
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
          </Stack>
          <Stack direction="row" spacing={1.5}>
            <Button
              variant="contained"
              disabled={submitting !== null}
              onClick={() => withSubmit("package-price", handlePackagePriceSubmit)}
              sx={{ textTransform: "none" }}
            >
              {packagePriceForm.id ? "Update price" : "Create price"}
            </Button>
            <Button
              variant="outlined"
              onClick={() => setPackagePriceForm(DEFAULT_PACKAGE_PRICE_FORM)}
              sx={{ textTransform: "none" }}
            >
              Reset
            </Button>
          </Stack>
          <Divider />
          {packagePrices.map((price) => (
            <Stack
              key={price.id}
              direction={{ xs: "column", md: "row" }}
              justifyContent="space-between"
              spacing={1.5}
            >
              <Box>
                <Typography sx={{ fontWeight: 700 }}>
                  {price.package_code} • {intervalLabel(price.billing_interval)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  EUR {price.price_eur.toFixed(2)} for {price.credits_granted.toFixed(2)} credits
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {price.active ? "Active" : "Archived"}
                </Typography>
              </Box>
              <Stack direction="row" spacing={1}>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() =>
                    setPackagePriceForm({
                      id: price.id,
                      package_id: price.package_id,
                      billing_interval: price.billing_interval,
                      price_eur: String(price.price_eur),
                      credits_granted: String(price.credits_granted),
                      stripe_price_id: price.stripe_price_id ?? "",
                      effective_from: toInputDateTime(price.effective_from),
                      effective_to: toInputDateTime(price.effective_to),
                      active: price.active,
                    })
                  }
                >
                  Edit
                </Button>
                {price.active ? (
                  <Button size="small" color="warning" onClick={() => archivePackagePrice(price)}>
                    Archive
                  </Button>
                ) : null}
              </Stack>
            </Stack>
          ))}
        </Stack>
      </Paper>

      <Paper variant="outlined" sx={{ borderRadius: 3, p: 2.5 }}>
        <Stack spacing={2}>
          <Typography variant="h6" sx={{ fontWeight: 800 }}>
            Providers
          </Typography>
          <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
            <TextField
              label="Provider key"
              value={providerForm.provider_key}
              onChange={(event) =>
                setProviderForm((current) => ({ ...current, provider_key: event.target.value }))
              }
              fullWidth
            />
            <TextField
              label="Display name"
              value={providerForm.display_name}
              onChange={(event) =>
                setProviderForm((current) => ({ ...current, display_name: event.target.value }))
              }
              fullWidth
            />
          </Stack>
          <Stack direction="row" spacing={1.5}>
            <Button
              variant="contained"
              disabled={submitting !== null}
              onClick={() => withSubmit("provider", handleProviderSubmit)}
              sx={{ textTransform: "none" }}
            >
              {providerForm.id ? "Update provider" : "Create provider"}
            </Button>
            <Button
              variant="outlined"
              onClick={() => setProviderForm(DEFAULT_PROVIDER_FORM)}
              sx={{ textTransform: "none" }}
            >
              Reset
            </Button>
          </Stack>
          <Divider />
          {providers.map((provider) => (
            <Stack key={provider.id} direction="row" justifyContent="space-between">
              <Box>
                <Typography sx={{ fontWeight: 700 }}>
                  {provider.display_name} ({provider.provider_key})
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {provider.active ? "Active" : "Archived"}
                </Typography>
              </Box>
              <Stack direction="row" spacing={1}>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => setProviderForm({ ...provider })}
                >
                  Edit
                </Button>
                {provider.active ? (
                  <Button size="small" color="warning" onClick={() => archiveProvider(provider)}>
                    Archive
                  </Button>
                ) : null}
              </Stack>
            </Stack>
          ))}
        </Stack>
      </Paper>

      <Paper variant="outlined" sx={{ borderRadius: 3, p: 2.5 }}>
        <Stack spacing={2}>
          <Typography variant="h6" sx={{ fontWeight: 800 }}>
            Models
          </Typography>
          <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
            <TextField
              select
              label="Provider"
              value={modelForm.provider_id}
              onChange={(event) =>
                setModelForm((current) => ({ ...current, provider_id: event.target.value }))
              }
              fullWidth
            >
              {providers.map((provider) => (
                <option key={provider.id} value={provider.id}>
                  {provider.display_name}
                </option>
              ))}
            </TextField>
            <TextField
              label="Model key"
              value={modelForm.model_key}
              onChange={(event) =>
                setModelForm((current) => ({ ...current, model_key: event.target.value }))
              }
              fullWidth
            />
          </Stack>
          <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
            <TextField
              label="Display name"
              value={modelForm.display_name}
              onChange={(event) =>
                setModelForm((current) => ({ ...current, display_name: event.target.value }))
              }
              fullWidth
            />
            <TextField
              label="Media type"
              value={modelForm.media_type}
              onChange={(event) =>
                setModelForm((current) => ({ ...current, media_type: event.target.value }))
              }
              fullWidth
            />
          </Stack>
          <Stack direction="row" spacing={1.5}>
            <Button
              variant="contained"
              disabled={submitting !== null}
              onClick={() => withSubmit("model", handleModelSubmit)}
              sx={{ textTransform: "none" }}
            >
              {modelForm.id ? "Update model" : "Create model"}
            </Button>
            <Button
              variant="outlined"
              onClick={() => setModelForm(DEFAULT_MODEL_FORM)}
              sx={{ textTransform: "none" }}
            >
              Reset
            </Button>
          </Stack>
          <Divider />
          {models.map((model) => (
            <Stack key={model.id} direction="row" justifyContent="space-between">
              <Box>
                <Typography sx={{ fontWeight: 700 }}>
                  {model.display_name} ({model.model_key})
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {model.provider_key} • {model.media_type} • {model.active ? "Active" : "Archived"}
                </Typography>
              </Box>
              <Stack direction="row" spacing={1}>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() =>
                    setModelForm({
                      id: model.id,
                      provider_id: model.provider_id,
                      model_key: model.model_key,
                      display_name: model.display_name,
                      media_type: model.media_type,
                      active: model.active,
                    })
                  }
                >
                  Edit
                </Button>
                {model.active ? (
                  <Button size="small" color="warning" onClick={() => archiveModel(model)}>
                    Archive
                  </Button>
                ) : null}
              </Stack>
            </Stack>
          ))}
        </Stack>
      </Paper>

      <Paper variant="outlined" sx={{ borderRadius: 3, p: 2.5 }}>
        <Stack spacing={2}>
          <Typography variant="h6" sx={{ fontWeight: 800 }}>
            Variants
          </Typography>
          <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
            <TextField
              select
              label="Model"
              value={variantForm.model_id}
              onChange={(event) =>
                setVariantForm((current) => ({ ...current, model_id: event.target.value }))
              }
              fullWidth
            >
              {models.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.display_name}
                </option>
              ))}
            </TextField>
            <TextField
              label="Variant key"
              value={variantForm.variant_key}
              onChange={(event) =>
                setVariantForm((current) => ({ ...current, variant_key: event.target.value }))
              }
              fullWidth
            />
          </Stack>
          <TextField
            label="Display name"
            value={variantForm.display_name}
            onChange={(event) =>
              setVariantForm((current) => ({ ...current, display_name: event.target.value }))
            }
            fullWidth
          />
          <Stack direction="row" spacing={1.5}>
            <Button
              variant="contained"
              disabled={submitting !== null}
              onClick={() => withSubmit("variant", handleVariantSubmit)}
              sx={{ textTransform: "none" }}
            >
              {variantForm.id ? "Update variant" : "Create variant"}
            </Button>
            <Button
              variant="outlined"
              onClick={() => setVariantForm(DEFAULT_VARIANT_FORM)}
              sx={{ textTransform: "none" }}
            >
              Reset
            </Button>
          </Stack>
          <Divider />
          {variants.map((variant) => (
            <Stack key={variant.id} direction="row" justifyContent="space-between">
              <Box>
                <Typography sx={{ fontWeight: 700 }}>
                  {variant.display_name} ({variant.variant_key})
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {variant.model_key} • {variant.active ? "Active" : "Archived"}
                </Typography>
              </Box>
              <Stack direction="row" spacing={1}>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() =>
                    setVariantForm({
                      id: variant.id,
                      model_id: variant.model_id,
                      variant_key: variant.variant_key,
                      display_name: variant.display_name,
                      active: variant.active,
                    })
                  }
                >
                  Edit
                </Button>
                {variant.active ? (
                  <Button size="small" color="warning" onClick={() => archiveVariant(variant)}>
                    Archive
                  </Button>
                ) : null}
              </Stack>
            </Stack>
          ))}
        </Stack>
      </Paper>

      <Paper variant="outlined" sx={{ borderRadius: 3, p: 2.5 }}>
        <Stack spacing={2}>
          <Typography variant="h6" sx={{ fontWeight: 800 }}>
            Pricing rules
          </Typography>
          <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
            <TextField
              label="Action type"
              value={ruleForm.action_type}
              onChange={(event) =>
                setRuleForm((current) => ({ ...current, action_type: event.target.value }))
              }
              fullWidth
            />
            <TextField
              label="Billing dimension"
              value={ruleForm.billing_dimension}
              onChange={(event) =>
                setRuleForm((current) => ({ ...current, billing_dimension: event.target.value }))
              }
              fullWidth
            />
          </Stack>
          <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
            <TextField
              select
              label="Model"
              value={ruleForm.model_id}
              onChange={(event) =>
                setRuleForm((current) => ({ ...current, model_id: event.target.value }))
              }
              fullWidth
            >
              {models.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.display_name}
                </option>
              ))}
            </TextField>
            <TextField
              select
              label="Variant (optional)"
              value={ruleForm.variant_id}
              onChange={(event) =>
                setRuleForm((current) => ({ ...current, variant_id: event.target.value }))
              }
              fullWidth
            >
              <option value="">No variant override</option>
              {variants.map((variant) => (
                <option key={variant.id} value={variant.id}>
                  {variant.display_name}
                </option>
              ))}
            </TextField>
            <TextField
              select
              label="Package (optional)"
              value={ruleForm.package_id}
              onChange={(event) =>
                setRuleForm((current) => ({ ...current, package_id: event.target.value }))
              }
              fullWidth
            >
              <option value="">Global default</option>
              {packages.map((pkg) => (
                <option key={pkg.id} value={pkg.id}>
                  {pkg.display_name}
                </option>
              ))}
            </TextField>
          </Stack>
          <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
            <TextField
              label="Unit size"
              value={ruleForm.unit_size}
              onChange={(event) =>
                setRuleForm((current) => ({ ...current, unit_size: event.target.value }))
              }
              fullWidth
            />
            <TextField
              label="Provider cost EUR"
              value={ruleForm.provider_cost_eur}
              onChange={(event) =>
                setRuleForm((current) => ({ ...current, provider_cost_eur: event.target.value }))
              }
              fullWidth
            />
            <TextField
              label="Sell price credits"
              value={ruleForm.sell_price_credits}
              onChange={(event) =>
                setRuleForm((current) => ({ ...current, sell_price_credits: event.target.value }))
              }
              fullWidth
            />
          </Stack>
          <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
            <TextField
              type="datetime-local"
              label="Effective from"
              value={ruleForm.effective_from}
              onChange={(event) =>
                setRuleForm((current) => ({ ...current, effective_from: event.target.value }))
              }
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
            <TextField
              type="datetime-local"
              label="Effective to"
              value={ruleForm.effective_to}
              onChange={(event) =>
                setRuleForm((current) => ({ ...current, effective_to: event.target.value }))
              }
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
          </Stack>
          <TextField
            label="Metadata JSON"
            value={ruleForm.metadata}
            onChange={(event) =>
              setRuleForm((current) => ({ ...current, metadata: event.target.value }))
            }
            multiline
            minRows={2}
            fullWidth
          />
          <Stack direction="row" spacing={1.5}>
            <Button
              variant="contained"
              disabled={submitting !== null}
              onClick={() => withSubmit("rule", handleRuleSubmit)}
              sx={{ textTransform: "none" }}
            >
              {ruleForm.id ? "Update rule" : "Create rule"}
            </Button>
            <Button
              variant="outlined"
              onClick={() => setRuleForm(DEFAULT_RULE_FORM)}
              sx={{ textTransform: "none" }}
            >
              Reset
            </Button>
          </Stack>
          <Divider />
          {pricingRules.map((rule) => (
            <Stack key={rule.id} direction={{ xs: "column", md: "row" }} justifyContent="space-between">
              <Box>
                <Typography sx={{ fontWeight: 700 }}>
                  {rule.action_type} • {rule.model_key}
                  {rule.variant_key ? ` • ${rule.variant_key}` : ""}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {rule.billing_dimension} • unit {rule.unit_size.toFixed(2)} • provider EUR{" "}
                  {rule.provider_cost_eur.toFixed(4)} • sell {rule.sell_price_credits.toFixed(4)} cr
                </Typography>
              </Box>
              <Stack direction="row" spacing={1}>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() =>
                    setRuleForm({
                      id: rule.id,
                      action_type: rule.action_type,
                      model_id: rule.model_id,
                      variant_id: rule.variant_id ?? "",
                      package_id: rule.package_id ?? "",
                      billing_dimension: rule.billing_dimension,
                      unit_size: String(rule.unit_size),
                      provider_cost_eur: String(rule.provider_cost_eur),
                      sell_price_credits: String(rule.sell_price_credits),
                      effective_from: toInputDateTime(rule.effective_from),
                      effective_to: toInputDateTime(rule.effective_to),
                      active: rule.active,
                      metadata: JSON.stringify(rule.metadata ?? {}, null, 2),
                    })
                  }
                >
                  Edit
                </Button>
                {rule.active ? (
                  <Button size="small" color="warning" onClick={() => archiveRule(rule)}>
                    Archive
                  </Button>
                ) : null}
              </Stack>
            </Stack>
          ))}
        </Stack>
      </Paper>

      <Paper variant="outlined" sx={{ borderRadius: 3, p: 2.5 }}>
        <Stack spacing={2}>
          <Typography variant="h6" sx={{ fontWeight: 800 }}>
            Promotions
          </Typography>
          <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
            <TextField
              label="Promotion name"
              value={promotionForm.name}
              onChange={(event) =>
                setPromotionForm((current) => ({ ...current, name: event.target.value }))
              }
              fullWidth
            />
            <TextField
              label="Target scope"
              value={promotionForm.target_scope}
              onChange={(event) =>
                setPromotionForm((current) => ({ ...current, target_scope: event.target.value }))
              }
              fullWidth
            />
          </Stack>
          <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
            <TextField
              select
              label="Package (optional)"
              value={promotionForm.package_id}
              onChange={(event) =>
                setPromotionForm((current) => ({ ...current, package_id: event.target.value }))
              }
              fullWidth
            >
              <option value="">Any package</option>
              {packages.map((pkg) => (
                <option key={pkg.id} value={pkg.id}>
                  {pkg.display_name}
                </option>
              ))}
            </TextField>
            <TextField
              select
              label="Model (optional)"
              value={promotionForm.model_id}
              onChange={(event) =>
                setPromotionForm((current) => ({ ...current, model_id: event.target.value }))
              }
              fullWidth
            >
              <option value="">Any model</option>
              {models.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.display_name}
                </option>
              ))}
            </TextField>
            <TextField
              select
              label="Variant (optional)"
              value={promotionForm.variant_id}
              onChange={(event) =>
                setPromotionForm((current) => ({ ...current, variant_id: event.target.value }))
              }
              fullWidth
            >
              <option value="">Any variant</option>
              {variants.map((variant) => (
                <option key={variant.id} value={variant.id}>
                  {variant.display_name}
                </option>
              ))}
            </TextField>
          </Stack>
          <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
            <TextField
              label="Discount type"
              value={promotionForm.discount_type}
              onChange={(event) =>
                setPromotionForm((current) => ({ ...current, discount_type: event.target.value }))
              }
              fullWidth
            />
            <TextField
              label="Discount value"
              value={promotionForm.discount_value}
              onChange={(event) =>
                setPromotionForm((current) => ({ ...current, discount_value: event.target.value }))
              }
              fullWidth
            />
          </Stack>
          <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
            <TextField
              type="datetime-local"
              label="Starts at"
              value={promotionForm.starts_at}
              onChange={(event) =>
                setPromotionForm((current) => ({ ...current, starts_at: event.target.value }))
              }
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
            <TextField
              type="datetime-local"
              label="Ends at"
              value={promotionForm.ends_at}
              onChange={(event) =>
                setPromotionForm((current) => ({ ...current, ends_at: event.target.value }))
              }
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
          </Stack>
          <TextField
            label="Metadata JSON"
            value={promotionForm.metadata}
            onChange={(event) =>
              setPromotionForm((current) => ({ ...current, metadata: event.target.value }))
            }
            multiline
            minRows={2}
            fullWidth
          />
          <Stack direction="row" spacing={1.5}>
            <Button
              variant="contained"
              disabled={submitting !== null}
              onClick={() => withSubmit("promotion", handlePromotionSubmit)}
              sx={{ textTransform: "none" }}
            >
              {promotionForm.id ? "Update promotion" : "Create promotion"}
            </Button>
            <Button
              variant="outlined"
              onClick={() => setPromotionForm(DEFAULT_PROMOTION_FORM)}
              sx={{ textTransform: "none" }}
            >
              Reset
            </Button>
          </Stack>
          <Divider />
          {promotions.map((promotion) => (
            <Stack key={promotion.id} direction={{ xs: "column", md: "row" }} justifyContent="space-between">
              <Box>
                <Typography sx={{ fontWeight: 700 }}>{promotion.name}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {promotion.target_scope} • {promotion.discount_type} • {promotion.discount_value}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {promotion.active ? "Active" : "Archived"}
                </Typography>
              </Box>
              <Stack direction="row" spacing={1}>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() =>
                    setPromotionForm({
                      id: promotion.id,
                      name: promotion.name,
                      target_scope: promotion.target_scope,
                      package_id: promotion.package_id ?? "",
                      model_id: promotion.model_id ?? "",
                      variant_id: promotion.variant_id ?? "",
                      discount_type: promotion.discount_type,
                      discount_value: String(promotion.discount_value),
                      starts_at: toInputDateTime(promotion.starts_at),
                      ends_at: toInputDateTime(promotion.ends_at),
                      active: promotion.active,
                      metadata: JSON.stringify(promotion.metadata ?? {}, null, 2),
                    })
                  }
                >
                  Edit
                </Button>
                {promotion.active ? (
                  <Button size="small" color="warning" onClick={() => archivePromotion(promotion)}>
                    Archive
                  </Button>
                ) : null}
              </Stack>
            </Stack>
          ))}
        </Stack>
      </Paper>
    </Stack>
  );
}
