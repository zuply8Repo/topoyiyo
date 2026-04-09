/**
 * /api/studio-v2/elements
 *
 * GET    — list all elements for the authenticated user
 * POST   — create a new element; uploads the image to Supabase Storage
 * PATCH  — update an element (pin/unpin, rename, category, replace image)
 * DELETE — delete an element and its storage image
 *          Query param: ?id=<element-uuid>
 */

import { auth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const BUCKET = "studio-elements";

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

function makeSupabase() {
  return createClient(requireEnv("SUPABASE_URL"), requireEnv("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Ensure the storage bucket exists (idempotent). */
async function ensureBucket(supabase: ReturnType<typeof makeSupabase>) {
  const { error } = await supabase.storage.createBucket(BUCKET, {
    public: true,
    allowedMimeTypes: ["image/*"],
    fileSizeLimit: 10 * 1024 * 1024, // 10 MB
  });
  // Ignore "already exists" error
  if (error && !error.message.toLowerCase().includes("already exists")) {
    console.warn("[studio-elements] bucket ensure warning:", error.message);
  }
}

/** Upload base64-encoded image to Supabase Storage; returns the storage path. */
async function uploadElementImage(
  supabase: ReturnType<typeof makeSupabase>,
  userId: string,
  elementId: string,
  base64: string,
  mimeType = "image/png"
): Promise<string> {
  // Strip data-URL prefix if present
  const raw = base64.includes(",") ? base64.split(",")[1] : base64;
  const buffer = Buffer.from(raw, "base64");
  const ext = mimeType.split("/")[1]?.replace("jpeg", "jpg") ?? "png";
  const path = `${userId}/${elementId}.${ext}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, buffer, { contentType: mimeType, upsert: true });

  if (error) throw new Error(`Storage upload failed: ${error.message}`);
  return path;
}

/** Get the public URL for a storage path. */
function getPublicUrl(supabase: ReturnType<typeof makeSupabase>, path: string): string {
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

/** Guess MIME type from raw base64 payload (first bytes as base64 text). */
function inferImageMimeFromBase64(base64: string): string {
  const raw = base64.includes(",") ? base64.split(",")[1] : base64;
  const head = raw.slice(0, 16);
  if (head.startsWith("/9j")) return "image/jpeg";
  if (head.startsWith("iVBOR")) return "image/png";
  if (head.startsWith("R0lGOD")) return "image/gif";
  if (head.startsWith("UklGR")) return "image/webp";
  return "image/png";
}

// ---------------------------------------------------------------------------
// GET /api/studio-v2/elements
// ---------------------------------------------------------------------------
export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = makeSupabase();
  const { data, error } = await supabase
    .from("studio_v2_elements")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[studio-v2/elements GET]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Attach public URLs for any elements that have stored images
  const elements = (data ?? []).map((el) => ({
    ...el,
    imageUrl: el.image_storage_path ? getPublicUrl(supabase, el.image_storage_path) : null,
  }));

  return NextResponse.json({ elements });
}

// ---------------------------------------------------------------------------
// POST /api/studio-v2/elements
// Body: { name, category, pinned?, imageBase64?, imageMimeType? }
// ---------------------------------------------------------------------------
export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: {
    name: string;
    category?: string;
    pinned?: boolean;
    imageBase64?: string;
    imageMimeType?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { name, category = "character", pinned = false, imageBase64, imageMimeType } = body;
  if (!name?.trim()) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const supabase = makeSupabase();
  await ensureBucket(supabase);

  // Insert element to get UUID first
  const { data: inserted, error: insertError } = await supabase
    .from("studio_v2_elements")
    .insert({ user_id: userId, name: name.trim(), category, pinned })
    .select()
    .single();

  if (insertError) {
    console.error("[studio-v2/elements POST insert]", insertError);
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  let imageUrl: string | null = null;

  // Upload image if provided
  if (imageBase64) {
    try {
      const path = await uploadElementImage(
        supabase,
        userId,
        inserted.id,
        imageBase64,
        imageMimeType ?? inferImageMimeFromBase64(imageBase64)
      );

      // Update the record with the storage path
      const { error: updateError } = await supabase
        .from("studio_v2_elements")
        .update({ image_storage_path: path })
        .eq("id", inserted.id);

      if (updateError) {
        console.warn("[studio-v2/elements POST update path]", updateError);
      } else {
        inserted.image_storage_path = path;
        imageUrl = getPublicUrl(supabase, path);
      }
    } catch (e) {
      console.error("[studio-v2/elements POST upload]", e);
      // Do not fail the whole request — element is saved without image
    }
  }

  return NextResponse.json({ element: { ...inserted, imageUrl } }, { status: 201 });
}

// ---------------------------------------------------------------------------
// PATCH /api/studio-v2/elements
// Body: { id, pinned?, name?, category?, imageBase64?, imageMimeType? }
// ---------------------------------------------------------------------------
export async function PATCH(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: {
    id: string;
    pinned?: boolean;
    name?: string;
    category?: string;
    imageBase64?: string;
    imageMimeType?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { id, ...rest } = body;
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const supabase = makeSupabase();
  await ensureBucket(supabase);

  const allowed: Record<string, unknown> = {};
  if (rest.pinned !== undefined) allowed.pinned = rest.pinned;
  if (rest.name !== undefined) allowed.name = rest.name.trim();
  if (rest.category !== undefined) allowed.category = rest.category;
  allowed.updated_at = new Date().toISOString();

  if (rest.imageBase64) {
    try {
      const mime = rest.imageMimeType ?? inferImageMimeFromBase64(rest.imageBase64);
      const path = await uploadElementImage(supabase, userId, id, rest.imageBase64, mime);
      allowed.image_storage_path = path;
    } catch (e) {
      console.error("[studio-v2/elements PATCH upload]", e);
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "Image upload failed" },
        { status: 500 }
      );
    }
  }

  const { data, error } = await supabase
    .from("studio_v2_elements")
    .update(allowed)
    .eq("id", id)
    .eq("user_id", userId)
    .select()
    .single();

  if (error) {
    console.error("[studio-v2/elements PATCH]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const imageUrl = data.image_storage_path ? getPublicUrl(supabase, data.image_storage_path) : null;
  return NextResponse.json({ element: { ...data, imageUrl } });
}

// ---------------------------------------------------------------------------
// DELETE /api/studio-v2/elements?id=<uuid>
// ---------------------------------------------------------------------------
export async function DELETE(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id query param is required" }, { status: 400 });

  const supabase = makeSupabase();

  // Fetch to get the storage path before deleting
  const { data: existing } = await supabase
    .from("studio_v2_elements")
    .select("image_storage_path")
    .eq("id", id)
    .eq("user_id", userId)
    .single();

  const { error } = await supabase
    .from("studio_v2_elements")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) {
    console.error("[studio-v2/elements DELETE]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Best-effort storage cleanup
  if (existing?.image_storage_path) {
    await supabase.storage.from(BUCKET).remove([existing.image_storage_path]);
  }

  return NextResponse.json({ success: true });
}
