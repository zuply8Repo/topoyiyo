"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  LinearProgress,
  Stack,
  Typography,
} from "@mui/material";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import { useAuth } from "@clerk/nextjs";
import ModelSelector from "@/components/studio-v2/ModelSelector";
import SchemaFieldRenderer from "@/components/studio-v2/SchemaFieldRenderer";
import MediaInputPanel from "@/components/studio-v2/MediaInputPanel";
import GenerationSettingsPanel from "@/components/studio-v2/GenerationSettingsPanel";
import OutputsPanel from "@/components/studio-v2/OutputsPanel";
import {
  ApiError,
  getStudioV2Models,
  getStudioV2ModelSchema,
  generateStudioV2Veo,
  getStudioV2JobStatus,
  downloadStudioV2JobVideo,
} from "@/lib/api";
import type {
  StudioV2ModelSchema,
  StudioV2ModelSummary,
  StudioV2VeoGenerateRequest,
} from "@/lib/api";

const POLL_INTERVAL_MS = 5000;
const EXAMPLE_VIDEO_URL =
  "https://drdhjfxoqaxcjolegdya.supabase.co/storage/v1/object/public/generated-videos/videos/6940b42f-6521-40af-b031-5539e3c4b6e6/story_video_3_pgzgndh9m768.mp4";
const LS_KEY_PREFIX = "studio-v2-jobs";

export interface SavedJob {
  job_id: string;
  prompt: string;
  timestamp: string;
  status: "completed" | "failed";
  blobUrl?: string;
}

function buildDefaultFormState(schema: StudioV2ModelSchema): Record<string, unknown> {
  const state: Record<string, unknown> = {};
  for (const field of schema.fields) {
    state[field.id] = field.default ?? (field.type === "boolean" ? false : "");
  }
  return state;
}

function formStateToVeoRequest(
  formState: Record<string, unknown>
): StudioV2VeoGenerateRequest {
  return {
    prompt: String(formState.prompt ?? ""),
    negative_prompt: formState.negative_prompt
      ? String(formState.negative_prompt)
      : undefined,
    model_variant: formState.model_variant
      ? String(formState.model_variant)
      : "veo-3.1-generate-001",
    first_frame_image_base64: formState.first_frame_image
      ? String(formState.first_frame_image)
      : undefined,
    last_frame_image_base64: formState.last_frame_image
      ? String(formState.last_frame_image)
      : undefined,
    reference_images_base64: Array.isArray(formState.reference_images)
      ? (formState.reference_images as string[]).filter(Boolean)
      : undefined,
    aspect_ratio: (formState.aspect_ratio as "16:9" | "9:16") ?? "9:16",
    duration_seconds: (Number(formState.duration_seconds) || 8) as 4 | 6 | 8,
    resolution: (formState.resolution as "720p" | "1080p" | "4k") ?? "720p",
    sample_count: Number(formState.sample_count) || 1,
    seed:
      formState.seed != null && formState.seed !== ""
        ? Number(formState.seed)
        : undefined,
    person_generation:
      (formState.person_generation as "allow_adult" | "allow_all" | "disallow") ??
      "allow_all",
    generate_audio: Boolean(formState.generate_audio ?? true),
  };
}

export default function StudioV2Page() {
  const { userId, isLoaded, getToken } = useAuth();
  const [models, setModels] = useState<StudioV2ModelSummary[]>([]);
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
  const [schema, setSchema] = useState<StudioV2ModelSchema | null>(null);
  const [formState, setFormState] = useState<Record<string, unknown>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<string | null>(null);
  const [jobProgress, setJobProgress] = useState(0);
  const [jobError, setJobError] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [resolvedVideoUrl, setResolvedVideoUrl] = useState<string | null>(null);
  const [isDownloadingVideo, setIsDownloadingVideo] = useState(false);
  const [savedJobs, setSavedJobs] = useState<SavedJob[]>([]);

  // Load past jobs from localStorage on mount
  useEffect(() => {
    if (!userId) return;
    try {
      const raw = localStorage.getItem(`${LS_KEY_PREFIX}-${userId}`);
      if (raw) setSavedJobs(JSON.parse(raw));
    } catch {
      // ignore parse errors
    }
  }, [userId]);

  // Fetch available models
  useEffect(() => {
    if (!isLoaded || !userId) return;
    let cancelled = false;
    (async () => {
      try {
        const token = await getToken();
        const list = await getStudioV2Models(token ?? undefined);
        if (!cancelled) {
          setModels(list);
          if (list.length > 0 && !selectedModelId) {
            setSelectedModelId(list[0].model_id);
          }
        }
      } catch (e) {
        if (!cancelled) {
          setLoadError(e instanceof Error ? e.message : "Failed to load models");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isLoaded, userId, getToken]);

  // Fetch schema when model changes
  useEffect(() => {
    if (!selectedModelId || !isLoaded || !userId) return;
    let cancelled = false;
    setSchema(null);
    (async () => {
      try {
        const token = await getToken();
        const s = await getStudioV2ModelSchema(selectedModelId, token ?? undefined);
        if (!cancelled) {
          setSchema(s);
          setFormState(buildDefaultFormState(s));
        }
      } catch (e) {
        if (!cancelled) {
          setLoadError(e instanceof Error ? e.message : "Failed to load schema");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedModelId, isLoaded, userId, getToken]);

  const handleFieldChange = useCallback((fieldId: string, value: unknown) => {
    setFormState((prev) => {
      const next = { ...prev, [fieldId]: value };

      // Auto-enforce Veo resolution constraints:
      // 1080p and 4k only support 16:9 aspect ratio and 8s duration
      if (fieldId === "resolution" && (value === "1080p" || value === "4k")) {
        next.aspect_ratio = "16:9";
        next.duration_seconds = 8;
      }
      if (fieldId === "aspect_ratio" && value === "9:16") {
        if (next.resolution === "1080p" || next.resolution === "4k") {
          next.resolution = "720p";
        }
      }
      if (fieldId === "duration_seconds" && Number(value) !== 8) {
        if (next.resolution === "1080p" || next.resolution === "4k") {
          next.resolution = "720p";
        }
      }

      return next;
    });
    setErrors((prev) => {
      const next = { ...prev };
      delete next[fieldId];
      return next;
    });
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!schema || selectedModelId !== "veo") return;
    const prompt = formState.prompt;
    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
      setErrors({ prompt: "Prompt is required" });
      return;
    }

    setIsSubmitting(true);
    setJobError(null);
    setVideoUrl(null);
    setResolvedVideoUrl(null);
    try {
      const token = await getToken();
      const body = formStateToVeoRequest(formState);
      const res = await generateStudioV2Veo(body, token ?? undefined);
      setJobId(res.job_id);
      setJobStatus("generating");
      setJobProgress(0);
    } catch (e) {
      if (e instanceof ApiError) {
        setJobError(e.message);
      } else {
        setJobError(e instanceof Error ? e.message : "Failed to start generation");
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [schema, selectedModelId, formState, getToken]);

  // Poll job status
  useEffect(() => {
    if (
      !jobId ||
      !(
        jobStatus === "generating" ||
        jobStatus === "processing" ||
        jobStatus === "pending"
      )
    )
      return;
    let cancelled = false;
    const poll = async () => {
      try {
        const token = await getToken();
        const status = await getStudioV2JobStatus(jobId, token ?? undefined);
        if (cancelled) return;
        setJobStatus(status.status);
        setJobProgress(status.progress_percentage);
        if (status.error_message) setJobError(status.error_message);
        if (status.video_url) setVideoUrl(status.video_url);
      } catch {
        // ignore poll errors
      }
    };

    const id = setInterval(poll, POLL_INTERVAL_MS);
    poll();

    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [jobId, jobStatus, getToken]);

  // Download video bytes from Veo and create blob URL for playback
  useEffect(() => {
    if (!videoUrl?.startsWith("veo://")) return;
    const vid = videoUrl.replace("veo://", "");
    let objectUrl: string | null = null;
    let cancelled = false;

    setResolvedVideoUrl(null);
    setIsDownloadingVideo(true);

    (async () => {
      try {
        const token = await getToken();
        const blob = await downloadStudioV2JobVideo(vid, token ?? undefined);
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setResolvedVideoUrl(objectUrl);
      } catch (e) {
        if (!cancelled) {
          setJobError(e instanceof Error ? e.message : "Failed to download video");
        }
      } finally {
        if (!cancelled) setIsDownloadingVideo(false);
      }
    })();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [videoUrl, getToken]);

  // Persist completed job to localStorage
  useEffect(() => {
    if (!userId || !jobId || jobStatus !== "completed" || !resolvedVideoUrl) return;
    const newJob: SavedJob = {
      job_id: jobId,
      prompt: String(formState.prompt ?? ""),
      timestamp: new Date().toISOString(),
      status: "completed",
      blobUrl: resolvedVideoUrl,
    };
    setSavedJobs((prev) => {
      if (prev.find((j) => j.job_id === jobId)) return prev;
      const updated = [newJob, ...prev];
      try {
        // Strip session-only blob URLs before persisting
        const toSave = updated.map(({ blobUrl: _b, ...rest }) => rest);
        localStorage.setItem(
          `${LS_KEY_PREFIX}-${userId}`,
          JSON.stringify(toSave)
        );
      } catch {
        // ignore storage errors
      }
      return updated;
    });
  }, [userId, jobId, jobStatus, resolvedVideoUrl, formState.prompt]);

  const constraintMessage = useMemo(() => {
    const res = formState.resolution as string;
    if (res === "1080p" || res === "4k") {
      return `${res.toUpperCase()} requires 16:9 aspect ratio and 8s duration — auto-applied.`;
    }
    return null;
  }, [formState.resolution]);

  const isGenerating =
    jobStatus === "generating" ||
    jobStatus === "processing" ||
    jobStatus === "pending";

  const promptFields = schema?.fields.filter((f) => f.group === "prompt") ?? [];

  if (!isLoaded || !userId) {
    return (
      <Box sx={{ minHeight: "60vh", display: "grid", placeItems: "center" }}>
        <Typography>Loading...</Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: "flex",
        height: { xs: "calc(100vh - 56px)", sm: "calc(100vh - 64px)" },
        mt: -3,
        mx: { xs: -2, sm: -3 },
        overflow: "hidden",
      }}
    >
      {/* ── LEFT PANEL ── */}
      <Box
        sx={{
          width: { xs: "100%", md: 380 },
          flexShrink: 0,
          display: "flex",
          flexDirection: "column",
          borderRight: "1px solid",
          borderColor: "divider",
        }}
      >
        {/* Scrollable form content */}
        <Box sx={{ flex: 1, overflowY: "auto", p: 2 }}>
          {/* Example / placeholder video */}
          <Box
            component="video"
            src={EXAMPLE_VIDEO_URL}
            autoPlay
            muted
            loop
            playsInline
            sx={{
              width: "100%",
              display: "block",
              borderRadius: 1.5,
              bgcolor: "black",
              mb: 2,
            }}
          />

          {loadError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {loadError}
            </Alert>
          )}

          {schema && (
            <Stack spacing={2}>
              {/* Start / end frame uploads */}
              <MediaInputPanel
                fields={schema.fields}
                formState={formState}
                onFieldChange={handleFieldChange}
                errors={errors}
              />

              {/* Prompt fields */}
              {promptFields.map((field) => (
                <SchemaFieldRenderer
                  key={field.id}
                  field={field}
                  value={formState[field.id]}
                  onChange={handleFieldChange}
                  error={errors[field.id]}
                />
              ))}

              {/* Model selector */}
              <ModelSelector
                models={models}
                selectedModelId={selectedModelId}
                onSelect={setSelectedModelId}
              />

              {/* Generation settings (audio, duration, aspect ratio, resolution) */}
              <GenerationSettingsPanel
                fields={schema.fields}
                formState={formState}
                onFieldChange={handleFieldChange}
                errors={errors}
                constraintMessage={constraintMessage ?? undefined}
              />
            </Stack>
          )}
        </Box>

        {/* Sticky generate button */}
        <Box
          sx={{
            p: 2,
            flexShrink: 0,
            borderTop: "1px solid",
            borderColor: "divider",
          }}
        >
          {jobError && (
            <Alert
              severity="error"
              sx={{ mb: 1.5 }}
              onClose={() => setJobError(null)}
            >
              {jobError}
            </Alert>
          )}
          {isGenerating && (
            <Box sx={{ mb: 1.5 }}>
              <LinearProgress sx={{ borderRadius: 1 }} />
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ mt: 0.5, display: "block" }}
              >
                Generating… this typically takes 2–5 minutes
              </Typography>
            </Box>
          )}
          <Button
            variant="contained"
            fullWidth
            size="large"
            startIcon={<AutoAwesomeIcon />}
            onClick={handleSubmit}
            disabled={isSubmitting || isGenerating || isDownloadingVideo || !schema}
            sx={{ textTransform: "none", fontWeight: 700, borderRadius: 2, py: 1.5 }}
          >
            {isSubmitting ? "Starting…" : isGenerating ? "Generating…" : "Generate"}
          </Button>
        </Box>
      </Box>

      {/* ── RIGHT PANEL ── */}
      <Box
        sx={{
          flex: 1,
          display: { xs: "none", md: "flex" },
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <OutputsPanel
          savedJobs={savedJobs}
          activeJobId={jobId}
          activeJobStatus={jobStatus}
          activeJobProgress={jobProgress}
          activeResolvedVideoUrl={resolvedVideoUrl}
          isDownloadingVideo={isDownloadingVideo}
          getToken={getToken}
          onBlobUrlLoaded={(jId: string, blobUrl: string) =>
            setSavedJobs((prev) =>
              prev.map((j) => (j.job_id === jId ? { ...j, blobUrl } : j))
            )
          }
        />
      </Box>
    </Box>
  );
}
