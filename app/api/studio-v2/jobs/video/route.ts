/**
 * POST /api/studio-v2/jobs/video
 *
 * Multipart form: file (video blob), provider_job_id (string).
 * Uploads to Supabase Storage and sets studio_v2_jobs.video_storage_path + completed.
 */

import { auth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const BUCKET = "studio-videos";

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

function safeStorageSegment(id: string): string {
  return id.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 200);
}

async function ensureBucket(supabase: ReturnType<typeof makeSupabase>) {
  // Omit fileSizeLimit here: a very high limit (e.g. 500MB) can make createBucket fail on
  // some Supabase plans, which leaves no bucket and uploads return "Bucket not found".
  // Raise limits in Dashboard → Storage → studio-videos → Configuration if needed.
  const { error } = await supabase.storage.createBucket(BUCKET, {
    public: true,
    allowedMimeTypes: ["video/mp4", "video/webm", "video/quicktime"],
  });
  if (error && !error.message.toLowerCase().includes("already exists")) {
    console.warn("[studio-videos] bucket ensure warning:", error.message);
  }
}

function getPublicUrl(supabase: ReturnType<typeof makeSupabase>, path: string): string {
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("file");
  const providerJobId = String(formData.get("provider_job_id") ?? "").trim();
  if (!providerJobId) {
    return NextResponse.json({ error: "provider_job_id is required" }, { status: 400 });
  }
  if (!file || !(file instanceof Blob) || file.size === 0) {
    return NextResponse.json({ error: "file is required" }, { status: 400 });
  }

  const supabase = makeSupabase();
  await ensureBucket(supabase);

  const safeId = safeStorageSegment(providerJobId);
  const type = file.type || "video/mp4";
  const ext = type.includes("webm") ? "webm" : "mp4";
  const path = `${userId}/${safeId}.${ext}`;

  const buffer = Buffer.from(await file.arrayBuffer());
  const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, buffer, {
    contentType: type,
    upsert: true,
  });

  if (upErr) {
    console.error("[studio-v2/jobs/video upload]", upErr);
    return NextResponse.json({ error: upErr.message }, { status: 500 });
  }

  const completedAt = new Date().toISOString();
  const { data: row, error: dbErr } = await supabase
    .from("studio_v2_jobs")
    .update({
      video_storage_path: path,
      status: "completed",
      completed_at: completedAt,
    })
    .eq("user_id", userId)
    .eq("provider_job_id", providerJobId)
    .select()
    .single();

  if (dbErr) {
    console.error("[studio-v2/jobs/video db]", dbErr);
    return NextResponse.json({ error: dbErr.message }, { status: 500 });
  }

  const videoUrl = getPublicUrl(supabase, path);
  return NextResponse.json({
    videoUrl,
    video_storage_path: path,
    job: row,
  });
}
