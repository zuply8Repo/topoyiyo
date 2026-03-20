import { Webhook } from "svix";
import { headers } from "next/headers";
import { WebhookEvent } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing environment variable: ${name}`);
  return v;
}

export async function POST(req: Request) {
  // Get the Svix headers for verification
  const headerPayload = await headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new NextResponse("Error occurred -- no svix headers", {
      status: 400,
    });
  }

  // Get the body
  const payload = await req.json();
  const body = JSON.stringify(payload);

  // Get the Clerk webhook secret
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    throw new Error("Please add CLERK_WEBHOOK_SECRET to your .env.local");
  }

  // Create a new Svix instance with your secret.
  const wh = new Webhook(WEBHOOK_SECRET);

  let evt: WebhookEvent;

  // Verify the payload with the headers
  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error("Error verifying webhook:", err);
    return new NextResponse("Error occurred", {
      status: 400,
    });
  }

  // Handle the webhook
  const eventType = evt.type;

  if (eventType === "user.created" || eventType === "user.updated") {
    const { id, email_addresses, first_name, last_name } = evt.data;

    // Get primary email
    const primaryEmail =
      email_addresses?.find((e) => e.id === evt.data.primary_email_address_id)
        ?.email_address ||
      email_addresses?.[0]?.email_address;

    if (!primaryEmail) {
      console.warn(`No email found for user ${id}`);
      return NextResponse.json({ received: true });
    }

    const supabaseUrl = requireEnv("SUPABASE_URL");
    const supabaseServiceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    try {
      // Upsert user profile (create if doesn't exist, update if exists)
      const { error: profileError } = await supabase
        .from("user_profiles")
        .upsert(
          {
            auth_user_id: id,
            email: primaryEmail,
            full_name: first_name && last_name
              ? `${first_name} ${last_name}`.trim()
              : first_name || last_name || primaryEmail.split("@")[0],
          },
          { onConflict: "auth_user_id" }
        );

      if (profileError) {
        console.error(`Failed to upsert user profile for ${id}:`, profileError);
        // Don't fail the webhook - continue to create wallet
      }

      // Create wallet row with 0 balance if it doesn't exist
      const { error: walletError } = await supabase
        .from("user_credit_wallet")
        .upsert(
          {
            user_id: id,
            balance_eur: 0,
          },
          { onConflict: "user_id" }
        );

      if (walletError) {
        console.error(`Failed to create wallet for user ${id}:`, walletError);
        // Don't fail the webhook - wallet can be created later
      }
    } catch (error) {
      console.error(`Error processing webhook for user ${id}:`, error);
      // Return success anyway to prevent Clerk from retrying
      return NextResponse.json({ received: true, error: String(error) });
    }
  }

  return NextResponse.json({ received: true });
}
