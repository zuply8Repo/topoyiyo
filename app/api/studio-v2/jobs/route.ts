/**
 * /api/studio-v2/jobs
 *
 * GET  — list all jobs for the authenticated user (newest first)
 * POST — create a new job record when generation starts
 * PATCH — update job status / video_storage_path when it completes
 */

import { auth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

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

const VIDEO_BUCKET = "studio-videos";

function videoPublicUrl(supabase: ReturnType<typeof makeSupabase>, path: string | null): string | null {
  if (!path) return null;
  const { data } = supabase.storage.from(VIDEO_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

// ---------------------------------------------------------------------------
// GET /api/studio-v2/jobs
// ---------------------------------------------------------------------------
export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = makeSupabase();
  const { data, error } = await supabase
    .from("studio_v2_jobs")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    console.error("[studio-v2/jobs GET]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const jobs = (data ?? []).map((row) => ({
    ...row,
    video_url: videoPublicUrl(supabase, row.video_storage_path),
  }));

  return NextResponse.json({ jobs });
}

// ---------------------------------------------------------------------------
// POST /api/studio-v2/jobs
// Body: { provider_job_id, model_id, prompt }
// ---------------------------------------------------------------------------
export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { provider_job_id: string; model_id?: string; prompt: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { provider_job_id, model_id = "", prompt } = body;
  if (!provider_job_id || !prompt?.trim()) {
    return NextResponse.json({ error: "provider_job_id and prompt are required" }, { status: 400 });
  }

  const supabase = makeSupabase();
  const { data, error } = await supabase
    .from("studio_v2_jobs")
    .insert({
      user_id: userId,
      provider_job_id,
      model_id,
      prompt: prompt.trim(),
      status: "generating",
    })
    .select()
    .single();

  if (error) {
    console.error("[studio-v2/jobs POST]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ job: data }, { status: 201 });
}

// ---------------------------------------------------------------------------
// PATCH /api/studio-v2/jobs
// Body: { provider_job_id, status, video_storage_path? }
// ---------------------------------------------------------------------------
export async function PATCH(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { provider_job_id: string; status: string; video_storage_path?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { provider_job_id, status, video_storage_path } = body;
  if (!provider_job_id || !status) {
    return NextResponse.json({ error: "provider_job_id and status are required" }, { status: 400 });
  }

  const updatePayload: Record<string, unknown> = { status };
  if (video_storage_path) updatePayload.video_storage_path = video_storage_path;
  if (status === "completed" || status === "failed") {
    updatePayload.completed_at = new Date().toISOString();
  }

  const supabase = makeSupabase();
  const { data, error } = await supabase
    .from("studio_v2_jobs")
    .update(updatePayload)
    .eq("user_id", userId)
    .eq("provider_job_id", provider_job_id)
    .select()
    .single();

  if (error) {
    console.error("[studio-v2/jobs PATCH]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ job: data });
}
