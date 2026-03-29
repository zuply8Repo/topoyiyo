"use client";

import React, { useCallback, useEffect, useState } from "react";
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
import PromptField from "@/components/studio-v2/PromptField";
import type { StudioElement } from "@/components/studio-v2/ElementsPanel";
import {
  ApiError,
  getStudioV2Models,
  getStudioV2ModelSchema,
  generateStudioV2Veo,
  generateStudioV2Kling,
  getStudioV2JobStatus,
  downloadStudioV2JobVideo,
} from "@/lib/api";
import type {
  StudioV2ModelSchema,
  StudioV2ModelSummary,
  StudioV2VeoGenerateRequest,
  StudioV2KlingGenerateRequest,
} from "@/lib/api";

const POLL_INTERVAL_MS = 5000;
const LS_KEY_PREFIX = "studio-v2-jobs";
const EXAMPLE_VIDEO_URL =
  "https://drdhjfxoqaxcjolegdya.supabase.co/storage/v1/object/public/generated-videos/videos/6940b42f-6521-40af-b031-5539e3c4b6e6/story_video_3_pgzgndh9m768.mp4";

/** Static model entries always shown in the model selector. */
const STATIC_MODELS: StudioV2ModelSummary[] = [
  {
    model_id: "veo-3.1-generate-001",
    label: "Veo 3.1",
    media_type: "video",
    description: "Veo 3.1 Generate 001 — high-quality video generation",
  },
  {
    model_id: "veo-3.1-fast-generate-001",
    label: "Veo 3.1 Fast",
    media_type: "video",
    description: "Veo 3.1 Fast Generate 001 — faster, lighter generation",
  },
  {
    model_id: "kling-v2-6",
    label: "Kling v2.6",
    media_type: "video",
    description: "Kling AI v2.6 — high-fidelity video with native audio and Motion Transfer",
  },
];

/** Maps UI model IDs to the Vertex AI model_variant string (Veo only). */
const MODEL_VARIANT_MAP: Record<string, string> = {
  veo: "veo-3.1-generate-001",
  "veo-3.1-generate-001": "veo-3.1-generate-001",
  "veo-3.1-fast-generate-001": "veo-3.1-fast-generate-001",
};

/** Kling model IDs — these use the Kling generation path. */
const KLING_MODEL_IDS = new Set(["kling-v2-6"]);

/** Schema API key to use — Veo variants share "veo", Kling uses "kling". */
function resolveSchemaModelId(modelId: string): string {
  if (modelId in MODEL_VARIANT_MAP) return "veo";
  if (KLING_MODEL_IDS.has(modelId)) return "kling";
  return modelId;
}

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
  formState: Record<string, unknown>,
  selectedModelId: string | null
): StudioV2VeoGenerateRequest {
  const modelVariant =
    selectedModelId && MODEL_VARIANT_MAP[selectedModelId]
      ? MODEL_VARIANT_MAP[selectedModelId]
      : formState.model_variant
        ? String(formState.model_variant)
        : "veo-3.1-generate-001";
  return {
    prompt: String(formState.prompt ?? ""),
    negative_prompt: formState.negative_prompt
      ? String(formState.negative_prompt)
      : undefined,
    model_variant: modelVariant,
    first_frame_image_base64: formState.first_frame_image
      ? String(formState.first_frame_image)
      : undefined,
    last_frame_image_base64: formState.last_frame_image
      ? String(formState.last_frame_image)
      : undefined,
    // reference_images_base64 is built from @mentioned Elements at submit time
    reference_images_base64: undefined,
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

function formStateToKlingRequest(
  formState: Record<string, unknown>,
): StudioV2KlingGenerateRequest {
  return {
    prompt: String(formState.prompt ?? ""),
    negative_prompt: formState.negative_prompt
      ? String(formState.negative_prompt)
      : undefined,
    generation_mode:
      (formState.generation_mode as "text_to_video" | "image_to_video" | "motion_transfer") ??
      "text_to_video",
    first_frame_image_base64: formState.first_frame_image
      ? String(formState.first_frame_image)
      : undefined,
    last_frame_image_base64: formState.last_frame_image
      ? String(formState.last_frame_image)
      : undefined,
    character_image_base64: formState.character_image
      ? String(formState.character_image)
      : undefined,
    motion_reference_video_base64: formState.motion_reference_video
      ? String(formState.motion_reference_video)
      : undefined,
    aspect_ratio: (formState.aspect_ratio as "16:9" | "9:16" | "1:1") ?? "16:9",
    duration: Number(formState.duration_seconds) || 5,
    mode: (formState.mode as "std" | "pro") ?? "std",
    generate_audio: Boolean(formState.generate_audio ?? false),
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
  const [enhancePrompt, setEnhancePrompt] = useState(false);
  const [elements, setElements] = useState<StudioElement[]>([]);

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

  // Load elements from localStorage
  useEffect(() => {
    if (!userId) return;
    try {
      const raw = localStorage.getItem(`studio-v2-elements-${userId}`);
      if (raw) setElements(JSON.parse(raw));
    } catch {
      // ignore parse errors
    }
  }, [userId]);

  const handleElementsChange = useCallback(
    (updated: StudioElement[]) => {
      setElements(updated);
      if (userId) {
        try {
          localStorage.setItem(`studio-v2-elements-${userId}`, JSON.stringify(updated));
        } catch {
          // ignore storage errors
        }
      }
    },
    [userId],
  );

  // Fetch available models and merge with static entries
  useEffect(() => {
    if (!isLoaded || !userId) return;
    let cancelled = false;
    (async () => {
      try {
        const token = await getToken();
        const apiList = await getStudioV2Models(token ?? undefined);
        if (!cancelled) {
          const apiIds = new Set(apiList.map((m) => m.model_id));
          const merged = [
            ...apiList,
            ...STATIC_MODELS.filter((m) => !apiIds.has(m.model_id)),
          ];
          setModels(merged);
          if (merged.length > 0 && !selectedModelId) {
            setSelectedModelId(merged[0].model_id);
          }
        }
      } catch (e) {
        if (!cancelled) {
          // Fall back to static models so the UI is still usable
          setModels(STATIC_MODELS);
          if (!selectedModelId) setSelectedModelId(STATIC_MODELS[0].model_id);
          setLoadError(e instanceof Error ? e.message : "Failed to load models");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isLoaded, userId, getToken]);

  // Fetch schema when model changes (static Veo variants reuse the "veo" schema)
  useEffect(() => {
    if (!selectedModelId || !isLoaded || !userId) return;
    let cancelled = false;
    setSchema(null);
    (async () => {
      try {
        const token = await getToken();
        const schemaId = resolveSchemaModelId(selectedModelId);
        const s = await getStudioV2ModelSchema(schemaId, token ?? undefined);
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
    setFormState((prev) => ({ ...prev, [fieldId]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[fieldId];
      return next;
    });
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!schema || !selectedModelId) return;
    const isKling = KLING_MODEL_IDS.has(selectedModelId);
    const isVeo = selectedModelId in MODEL_VARIANT_MAP;
    if (!isKling && !isVeo) return;

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

      if (isKling) {
        const body = formStateToKlingRequest(formState);
        const res = await generateStudioV2Kling(body, token ?? undefined);
        setJobId(res.job_id);
      } else {
        const body = formStateToVeoRequest(formState, selectedModelId);

        // Build reference images from @mentioned Elements (max 3 per Veo 3.1 API limit)
        const promptText = String(formState.prompt ?? "");
        const mentionedElements = [...new Set(promptText.match(/@[\w_]+/g) ?? [])]
          .map((m) => elements.find((el) => el.name === m.slice(1)))
          .filter((el): el is NonNullable<typeof el> => Boolean(el?.imageBase64));

        if (mentionedElements.length > 0) {
          body.reference_images_base64 = mentionedElements
            .slice(0, 3) // Veo 3.1 hard limit: max 3 subject images
            .map((el) => el.imageBase64);
        }

        const res = await generateStudioV2Veo(body, token ?? undefined);
        setJobId(res.job_id);
      }

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
  }, [schema, selectedModelId, formState, elements, getToken]);

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

  // Download video bytes from Veo/Kling and create blob URL for playback
  useEffect(() => {
    const isVeo = videoUrl?.startsWith("veo://");
    const isKling = videoUrl?.startsWith("kling://");
    if (!isVeo && !isKling) return;
    const vid = isVeo
      ? videoUrl!.replace("veo://", "")
      : videoUrl!.replace("kling://", "");
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
          width: { xs: "100%", md: 340 },
          flexShrink: 0,
          display: "flex",
          flexDirection: "column",
          borderRight: "1px solid",
          borderColor: "divider",
          overflow: "hidden",
        }}
      >
        {loadError && (
          <Alert severity="error" sx={{ mx: 1.5, mt: 1.5 }}>
            {loadError}
          </Alert>
        )}

        {/* Video preview */}
        <Box
          sx={{
            mx: 1.5,
            mt: 1.5,
            mb: 0.5,
            flexShrink: 0,
            borderRadius: 3,
            overflow: "hidden",
            height: 148,
            bgcolor: "black",
          }}
        >
          <Box
            component="video"
            src={EXAMPLE_VIDEO_URL}
            autoPlay
            muted
            loop
            playsInline
            sx={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
        </Box>

        {schema && (
          <>
            {/* Media upload cards */}
            <Box sx={{ px: 1.5, pt: 1.5, flexShrink: 0 }}>
              <MediaInputPanel
                fields={schema.fields}
                formState={formState}
                onFieldChange={handleFieldChange}
                errors={errors}
              />
            </Box>

            {/* Prompt fields — main prompt uses PromptField, others use SchemaFieldRenderer */}
            <Box sx={{ flex: 1, display: "flex", flexDirection: "column", px: 1.5, pt: 1, minHeight: 0 }}>
              <Stack spacing={1} sx={{ flex: 1 }}>
                {promptFields.map((field) =>
                  field.id === "prompt" ? (
                    <PromptField
                      key={field.id}
                      field={field}
                      value={String(formState[field.id] ?? "")}
                      onChange={(v) => handleFieldChange(field.id, v)}
                      error={errors[field.id]}
                      enhancePrompt={enhancePrompt}
                      onEnhanceChange={setEnhancePrompt}
                      elements={elements}
                      onElementsChange={handleElementsChange}
                    />
                  ) : (
                    <SchemaFieldRenderer
                      key={field.id}
                      field={field}
                      value={formState[field.id]}
                      onChange={handleFieldChange}
                      error={errors[field.id]}
                    />
                  ),
                )}
              </Stack>
            </Box>

            {/* Model selector */}
            <Box sx={{ px: 1.5, pt: 1, flexShrink: 0 }}>
              <ModelSelector
                models={models}
                selectedModelId={selectedModelId}
                onSelect={setSelectedModelId}
              />
            </Box>

            {/* Generation settings icon strip */}
            <Box sx={{ px: 1.5, pt: 1, flexShrink: 0 }}>
              <GenerationSettingsPanel
                fields={schema.fields}
                formState={formState}
                onFieldChange={handleFieldChange}
                errors={errors}
              />
            </Box>
          </>
        )}

        {/* Sticky generate button */}
        <Box
          sx={{
            p: 1.5,
            mt: "auto",
            flexShrink: 0,
            borderTop: "1px solid",
            borderColor: "divider",
          }}
        >
          {jobError && (
            <Alert
              severity="error"
              sx={{ mb: 1 }}
              onClose={() => setJobError(null)}
            >
              {jobError}
            </Alert>
          )}
          {isGenerating && (
            <Box sx={{ mb: 1 }}>
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
            sx={{ textTransform: "none", fontWeight: 700, borderRadius: 2, py: 1.25 }}
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
