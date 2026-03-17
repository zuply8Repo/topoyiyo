import { auth, clerkClient } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import {
  OnboardingAnswersEnvelope,
  validateAndNormalizeOnboardingAnswers,
} from "@/lib/onboarding";

type OnboardingPayload = {
  answers: unknown;
};

type HubSpotSearchResponse = {
  results?: Array<{ id: string }>;
};

type HubSpotCreateResponse = {
  id?: string;
};

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing environment variable: ${name}`);
  return v;
}

async function bestEffortHubspotUpsertContact(params: {
  token: string;
  email: string;
  fullName: string;
  industry: string;
  businessName: string;
  country: string;
  address: string;
}): Promise<{ contactId?: string } | null> {
  const { token, email, fullName, industry, businessName, country, address } =
    params;

  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  // 1) Search contact by email
  const searchRes = await fetch(
    "https://api.hubapi.com/crm/v3/objects/contacts/search",
    {
      method: "POST",
      headers,
      body: JSON.stringify({
        filterGroups: [
          {
            filters: [{ propertyName: "email", operator: "EQ", value: email }],
          },
        ],
        properties: ["email"],
        limit: 1,
      }),
    }
  );

  if (!searchRes.ok) return null;
  const searchJson = (await searchRes.json()) as HubSpotSearchResponse;
  const existingId: string | undefined = searchJson.results?.[0]?.id;

  const properties = {
    email,
    firstname: fullName.split(" ")[0] || fullName,
    lastname: fullName.split(" ").slice(1).join(" ") || "",
    company: businessName,
    industry,
    country,
    address,
  };

  // 2) Update if exists, otherwise create
  if (existingId) {
    const patchRes = await fetch(
      `https://api.hubapi.com/crm/v3/objects/contacts/${existingId}`,
      { method: "PATCH", headers, body: JSON.stringify({ properties }) }
    );
    if (!patchRes.ok) return { contactId: existingId };
    return { contactId: existingId };
  }

  const createRes = await fetch(
    "https://api.hubapi.com/crm/v3/objects/contacts",
    { method: "POST", headers, body: JSON.stringify({ properties }) }
  );
  if (!createRes.ok) return null;
  const createJson = (await createRes.json()) as HubSpotCreateResponse;
  const contactId: string | undefined = createJson.id;
  return contactId ? { contactId } : null;
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: OnboardingPayload;
  try {
    body = (await req.json()) as OnboardingPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const normalizedAnswers = validateAndNormalizeOnboardingAnswers(body.answers);
  if (!normalizedAnswers.ok) {
    return NextResponse.json({ error: normalizedAnswers.error }, { status: 400 });
  }

  // Pull email from Clerk (don’t trust client input).
  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  const email = (
    user.primaryEmailAddress?.emailAddress ||
    user.emailAddresses?.[0]?.emailAddress
  )?.trim();

  if (!email) {
    return NextResponse.json(
      { error: "No email address found for user" },
      { status: 400 }
    );
  }

  const supabaseUrl = requireEnv("SUPABASE_URL");
  const supabaseServiceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const fullNameFromClerk = `${user.firstName || ""} ${user.lastName || ""}`
    .trim()
    .replace(/\s+/g, " ");
  const fallbackFullName = fullNameFromClerk || email.split("@")[0] || "User";

  const { data: existingProfile } = await supabase
    .from("user_profiles")
    .select("full_name,industry,business_name,country,address")
    .eq("auth_user_id", userId)
    .maybeSingle();

  const profileIndustry = existingProfile?.industry ?? "";
  const profileBusinessName = existingProfile?.business_name ?? "";
  const profileCountry = existingProfile?.country ?? "";
  const profileAddress = existingProfile?.address ?? "";
  const profileFullName = existingProfile?.full_name || fallbackFullName;

  const answersEnvelope: OnboardingAnswersEnvelope = {
    version: 1,
    submittedAt: new Date().toISOString(),
    answers: normalizedAnswers.value,
  };

  const upsertPayload = {
    auth_user_id: userId,
    email,
    full_name: profileFullName,
    industry: profileIndustry,
    business_name: profileBusinessName,
    country: profileCountry,
    address: profileAddress,
    audience_onboarding_answers: answersEnvelope,
    audience_onboarding_completed_at: answersEnvelope.submittedAt,
  };

  const { error: upsertError } = await supabase
    .from("user_profiles")
    .upsert(upsertPayload, { onConflict: "auth_user_id" });

  if (upsertError) {
    return NextResponse.json(
      { error: `Failed to save profile: ${upsertError.message}` },
      { status: 500 }
    );
  }

  // Create wallet row with 0 balance if it doesn't exist
  const { error: walletError } = await supabase
    .from("user_credit_wallet")
    .upsert(
      {
        user_id: userId,
        balance_eur: 0,
      },
      { onConflict: "user_id" }
    );

  if (walletError) {
    // Log but don't fail onboarding - wallet can be created later
    console.error(`Failed to create wallet for user ${userId}:`, walletError);
  }

  // Best-effort HubSpot sync (does not block onboarding completion)
  let hubspotContactId: string | undefined;
  const hubspotToken = process.env.HUBSPOT_PRIVATE_APP_TOKEN;
  if (hubspotToken) {
    try {
      const result = await bestEffortHubspotUpsertContact({
        token: hubspotToken,
        email,
        fullName: profileFullName,
        industry: profileIndustry,
        businessName: profileBusinessName,
        country: profileCountry,
        address: profileAddress,
      });
      hubspotContactId = result?.contactId;
    } catch {
      // Ignore HubSpot failures (MVP best-effort)
    }
  }

  if (hubspotContactId) {
    await supabase
      .from("user_profiles")
      .update({ hubspot_contact_id: hubspotContactId })
      .eq("auth_user_id", userId);
  }

  // Mark onboarding complete in Clerk so middleware can gate quickly.
  await client.users.updateUserMetadata(userId, {
    publicMetadata: { onboardingComplete: true },
  });

  return NextResponse.json({ success: true, hubspotContactId });
}
