/**
 * /api/studio-v2/images
 *
 * GET    — list all generated images for the authenticated user (newest first)
 * POST   — save a newly generated image; uploads bytes to Supabase Storage
 * DELETE — delete an image record and its storage file
 *          Query param: ?id=<image-uuid>
 */

import { auth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const BUCKET = "studio-images";

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

async function ensureBucket(supabase: ReturnType<typeof makeSupabase>) {
  const { error } = await supabase.storage.createBucket(BUCKET, {
    public: true,
    allowedMimeTypes: ["image/*"],
    fileSizeLimit: 20 * 1024 * 1024, // 20 MB
  });
  if (error && !error.message.toLowerCase().includes("already exists")) {
    console.warn("[studio-images] bucket ensure warning:", error.message);
  }
}

function getPublicUrl(supabase: ReturnType<typeof makeSupabase>, path: string): string {
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

// ---------------------------------------------------------------------------
// GET /api/studio-v2/images
// ---------------------------------------------------------------------------
export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = makeSupabase();
  const { data, error } = await supabase
    .from("studio_v2_generated_images")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    console.error("[studio-v2/images GET]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const images = (data ?? []).map((row) => ({
    id: row.id,
    imageUrl: getPublicUrl(supabase, row.storage_path),
    mimeType: row.mime_type,
    prompt: row.prompt,
    modelVariant: row.model_variant ?? "",
    aspectRatio: row.aspect_ratio ?? "",
    timestamp: row.created_at,
  }));

  return NextResponse.json({ images });
}

// ---------------------------------------------------------------------------
// POST /api/studio-v2/images
// Body: { bytesBase64, mimeType, prompt, modelVariant?, aspectRatio? }
// ---------------------------------------------------------------------------
export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: {
    bytesBase64: string;
    mimeType?: string;
    prompt: string;
    modelVariant?: string;
    aspectRatio?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const {
    bytesBase64,
    mimeType = "image/png",
    prompt,
    modelVariant = "",
    aspectRatio = "",
  } = body;

  if (!bytesBase64 || !prompt?.trim()) {
    return NextResponse.json({ error: "bytesBase64 and prompt are required" }, { status: 400 });
  }

  const supabase = makeSupabase();
  await ensureBucket(supabase);

  // Generate a unique ID for this image
  const imageId = crypto.randomUUID();
  const ext = mimeType.split("/")[1]?.replace("jpeg", "jpg") ?? "png";
  const storagePath = `${userId}/${imageId}.${ext}`;

  // Upload to Supabase Storage
  const raw = bytesBase64.includes(",") ? bytesBase64.split(",")[1] : bytesBase64;
  const buffer = Buffer.from(raw, "base64");

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, buffer, { contentType: mimeType, upsert: false });

  if (uploadError) {
    console.error("[studio-v2/images POST upload]", uploadError);
    return NextResponse.json({ error: `Storage upload failed: ${uploadError.message}` }, { status: 500 });
  }

  // Insert DB record
  const { data: inserted, error: dbError } = await supabase
    .from("studio_v2_generated_images")
    .insert({
      id: imageId,
      user_id: userId,
      storage_path: storagePath,
      mime_type: mimeType,
      prompt: prompt.trim(),
      model_variant: modelVariant || null,
      aspect_ratio: aspectRatio || null,
    })
    .select()
    .single();

  if (dbError) {
    console.error("[studio-v2/images POST db]", dbError);
    // Best-effort: try to clean up the uploaded file
    await supabase.storage.from(BUCKET).remove([storagePath]);
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  return NextResponse.json(
    {
      image: {
        id: inserted.id,
        imageUrl: getPublicUrl(supabase, storagePath),
        mimeType: inserted.mime_type,
        prompt: inserted.prompt,
        modelVariant: inserted.model_variant ?? "",
        aspectRatio: inserted.aspect_ratio ?? "",
        timestamp: inserted.created_at,
      },
    },
    { status: 201 }
  );
}

// ---------------------------------------------------------------------------
// DELETE /api/studio-v2/images?id=<uuid>
// ---------------------------------------------------------------------------
export async function DELETE(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id query param is required" }, { status: 400 });

  const supabase = makeSupabase();

  // Fetch storage path before deleting
  const { data: existing } = await supabase
    .from("studio_v2_generated_images")
    .select("storage_path")
    .eq("id", id)
    .eq("user_id", userId)
    .single();

  const { error } = await supabase
    .from("studio_v2_generated_images")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) {
    console.error("[studio-v2/images DELETE]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (existing?.storage_path) {
    await supabase.storage.from(BUCKET).remove([existing.storage_path]);
  }

  return NextResponse.json({ success: true });
}
