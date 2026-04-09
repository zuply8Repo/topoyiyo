"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
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
  StudioV2FieldSchema,
  StudioV2ModelSchema,
  StudioV2ModelSummary,
  StudioV2VeoGenerateRequest,
  StudioV2KlingGenerateRequest,
  KlingShotItem,
} from "@/lib/api";
import {
  buildKlingMultiImagePrompt,
  resolveMentionedElementsWithTokensInOrder,
} from "@/lib/studioV2Mentions";

const POLL_INTERVAL_MS = 5000;
const EXAMPLE_VIDEO_URL =
  "https://drdhjfxoqaxcjolegdya.supabase.co/storage/v1/object/public/generated-videos/videos/6940b42f-6521-40af-b031-5539e3c4b6e6/story_video_3_pgzgndh9m768.mp4";

const DEFAULT_MODEL_ID = "kling-v3";

/** Static model entries always shown in the model selector. */
const STATIC_MODELS: StudioV2ModelSummary[] = [
  {
    model_id: "kling-v3",
    label: "Kling v3",
    media_type: "video",
    description: "Kling AI v3 — 3–15 s video, multi-shot storytelling, native audio, 720p / 1080p",
  },
  {
    model_id: "kling",
    label: "Kling v2.6",
    media_type: "video",
    description: "Kling AI v2.6 — high-fidelity video with native audio and Motion Transfer",
  },
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
];

/** Maps UI model IDs to the Vertex AI model_variant string (Veo only). */
const MODEL_VARIANT_MAP: Record<string, string> = {
  veo: "veo-3.1-generate-001",
  "veo-3.1-generate-001": "veo-3.1-generate-001",
  "veo-3.1-fast-generate-001": "veo-3.1-fast-generate-001",
};

/** Kling model IDs — these use the Kling generation path. */
const KLING_MODEL_IDS = new Set(["kling", "kling-v2-6", "kling-v3"]);

/** Schema API key to use — Veo variants share "veo"; kling-v3 has its own schema; kling/kling-v2-6 share "kling". */
function resolveSchemaModelId(modelId: string): string {
  if (modelId in MODEL_VARIANT_MAP) return "veo";
  if (modelId === "kling-v3") return "kling-v3";
  if (KLING_MODEL_IDS.has(modelId)) return "kling";
  return modelId;
}

export interface SavedJob {
  job_id: string;
  prompt: string;
  timestamp: string;
  status: "completed" | "failed";
  /** Ephemeral blob URL for in-session playback before upload completes. */
  blobUrl?: string;
  /** Permanent Supabase Storage public URL after upload. */
  videoUrl?: string;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function inferImageMimeFromBase64(b64: string): string {
  const raw = b64.includes(",") ? b64.split(",")[1] : b64;
  const head = raw.slice(0, 8);
  if (head.startsWith("/9j")) return "image/jpeg";
  if (head.startsWith("iVBOR")) return "image/png";
  return "image/png";
}

function buildDefaultFormState(schema: StudioV2ModelSchema): Record<string, unknown> {
  const state: Record<string, unknown> = {};
  for (const field of schema.fields) {
    state[field.id] = field.default ?? (field.type === "boolean" ? false : "");
  }
  return state;
}

/** When switching models, keep user input for fields that exist in the new schema and remain valid. */
function isValidForField(field: StudioV2FieldSchema, value: unknown): boolean {
  if (value === undefined || value === null) return false;
  switch (field.type) {
    case "boolean":
      return typeof value === "boolean";
    case "number": {
      const n = typeof value === "number" ? value : Number(value);
      return !Number.isNaN(n);
    }
    case "text":
    case "textarea":
      return typeof value === "string" || typeof value === "number";
    case "select": {
      if (field.options && field.options.length > 0) {
        const v = String(value);
        return field.options.some((o) => o.value === v);
      }
      return typeof value === "string" || typeof value === "number";
    }
    case "image":
    case "file":
    case "video_upload":
      return typeof value === "string" && value.length > 0;
    case "image_array":
      return Array.isArray(value);
    default:
      return false;
  }
}

function normalizeMergedValue(field: StudioV2FieldSchema, value: unknown): unknown {
  switch (field.type) {
    case "number": {
      const n = typeof value === "number" ? value : Number(value);
      let v = n;
      if (field.min != null) v = Math.max(field.min, v);
      if (field.max != null) v = Math.min(field.max, v);
      return v;
    }
    case "text":
    case "textarea":
      return typeof value === "string" ? value : String(value ?? "");
    case "select":
      return String(value);
    default:
      return value;
  }
}

function mergeFormStateWithSchema(
  prev: Record<string, unknown>,
  schema: StudioV2ModelSchema
): Record<string, unknown> {
  const next = buildDefaultFormState(schema);
  for (const field of schema.fields) {
    if (!Object.prototype.hasOwnProperty.call(prev, field.id)) continue;
    const prevVal = prev[field.id];
    if (prevVal === undefined) continue;
    if (isValidForField(field, prevVal)) {
      next[field.id] = normalizeMergedValue(field, prevVal);
    }
  }
  return next;
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

/** Maps UI model ID → Kling API model_name string. */
function resolveKlingModelName(modelId: string | null): string {
  if (modelId === "kling-v3") return "kling-v3";
  return "kling-v2-6";
}

function formStateToKlingRequest(
  formState: Record<string, unknown>,
  selectedModelId: string | null,
): StudioV2KlingGenerateRequest {
  const schemaMode = formState.generation_mode as string | undefined;
  const hasFirstFrame = Boolean(formState.first_frame_image);

  let generation_mode: "text_to_video" | "image_to_video" | "multi_image_to_video" | "motion_transfer";
  if (schemaMode === "motion_transfer") {
    generation_mode = "motion_transfer";
  } else {
    generation_mode = hasFirstFrame ? "image_to_video" : "text_to_video";
  }

  const base: StudioV2KlingGenerateRequest = {
    prompt: String(formState.prompt ?? ""),
    negative_prompt: formState.negative_prompt
      ? String(formState.negative_prompt)
      : undefined,
    generation_mode,
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
    model_name: resolveKlingModelName(selectedModelId),
    aspect_ratio: (formState.aspect_ratio as "16:9" | "9:16" | "1:1") ?? "16:9",
    duration: Number(formState.duration_seconds) || 5,
    mode: (formState.mode as "std" | "pro") ?? "std",
    // kling-v3: default native audio on when unset (matches model schema); kling v2.6 defaults off.
    generate_audio: Boolean(
      formState.generate_audio ?? selectedModelId === "kling-v3",
    ),
  };

  // Multi-shot (kling-v3 only)
  if (formState.multi_shot_enabled === true) {
    const shots: KlingShotItem[] = [];
    for (let i = 1; i <= 6; i++) {
      const shotPrompt = formState[`shot_${i}_prompt`];
      const shotDuration = formState[`shot_${i}_duration`];
      if (shotPrompt && String(shotPrompt).trim()) {
        shots.push({
          prompt: String(shotPrompt).trim(),
          duration: Number(shotDuration) || 5,
        });
      }
    }
    if (shots.length > 0) {
      base.multi_shot = true;
      base.shots = shots;
    }
  }

  return base;
}

/** Fetch an image from a URL and return its raw base64 string (no data-URL prefix). */
async function urlToBase64(url: string): Promise<string> {
  const res = await fetch(url);
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.includes(",") ? result.split(",")[1] : result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/** Resolve reference image base64 for an element (lazy-fetch if only URL is available). */
async function resolveElementBase64(el: StudioElement): Promise<string | null> {
  if (el.imageBase64) return el.imageBase64;
  if (el.imageUrl) {
    try {
      return await urlToBase64(el.imageUrl);
    } catch {
      return null;
    }
  }
  return null;
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

  // Track which DB job IDs we've already saved to avoid duplicate POSTs
  const savedJobIdsRef = useRef<Set<string>>(new Set());
  /** Provider job IDs whose finished video bytes were uploaded to Supabase Storage. */
  const videoPersistedRef = useRef<Set<string>>(new Set());
  const videoUploadInflightRef = useRef<Set<string>>(new Set());

  // ---------------------------------------------------------------------------
  // Load jobs and elements from DB on mount
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!userId || !isLoaded) return;

    const load = async () => {
      try {
        const [jobsRes, elementsRes] = await Promise.all([
          fetch("/api/studio-v2/jobs"),
          fetch("/api/studio-v2/elements"),
        ]);

        if (jobsRes.ok) {
          const { jobs } = await jobsRes.json() as { jobs: Array<{
            provider_job_id: string;
            prompt: string;
            created_at: string;
            status: string;
            video_url?: string | null;
          }> };
          const loaded: SavedJob[] = jobs
            .filter((j) => j.status === "completed" || j.status === "failed")
            .map((j) => ({
              job_id: j.provider_job_id,
              prompt: j.prompt,
              timestamp: j.created_at,
              status: j.status as "completed" | "failed",
              videoUrl: j.video_url ?? undefined,
            }));
          setSavedJobs(loaded);
          loaded.forEach((j) => savedJobIdsRef.current.add(j.job_id));
        }

        if (elementsRes.ok) {
          const { elements: dbElements } = await elementsRes.json() as {
            elements: Array<{
              id: string;
              name: string;
              category: "character" | "location" | "prop";
              pinned: boolean;
              imageUrl: string | null;
            }>;
          };
          setElements(
            dbElements.map((el) => ({
              id: el.id,
              name: el.name,
              category: el.category,
              pinned: el.pinned,
              imageBase64: "",    // populated lazily on submit if needed
              imageUrl: el.imageUrl ?? undefined,
            }))
          );
        }
      } catch (e) {
        console.warn("[studio-v2] Failed to load from DB, falling back to localStorage", e);
        // Fallback: load from localStorage
        try {
          const raw = localStorage.getItem(`studio-v2-jobs-${userId}`);
          if (raw) setSavedJobs(JSON.parse(raw));
        } catch { /* ignore */ }
        try {
          const raw = localStorage.getItem(`studio-v2-elements-${userId}`);
          if (raw) setElements(JSON.parse(raw));
        } catch { /* ignore */ }
      }
    };

    load();
  }, [userId, isLoaded]);

  // ---------------------------------------------------------------------------
  // Fetch available models and merge with static entries
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!isLoaded || !userId) return;
    let cancelled = false;
    (async () => {
      try {
        const token = await getToken();
        const apiList = await getStudioV2Models(token ?? undefined);
        if (!cancelled) {
          const videoModels = apiList.filter((m) => m.media_type === "video");
          const apiIds = new Set(videoModels.map((m) => m.model_id));
          const merged = [
            ...videoModels,
            ...STATIC_MODELS.filter((m) => !apiIds.has(m.model_id)),
          ];
          setModels(merged);
          if (merged.length > 0 && !selectedModelId) {
            const preferred = merged.find((m) => m.model_id === DEFAULT_MODEL_ID);
            setSelectedModelId((preferred ?? merged[0]).model_id);
          }
        }
      } catch (e) {
        if (!cancelled) {
          setModels(STATIC_MODELS);
          if (!selectedModelId) setSelectedModelId(DEFAULT_MODEL_ID);
          setLoadError(e instanceof Error ? e.message : "Failed to load models");
        }
      }
    })();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, userId, getToken]);

  // ---------------------------------------------------------------------------
  // Fetch schema when model changes
  // ---------------------------------------------------------------------------
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
          setFormState((prev) => mergeFormStateWithSchema(prev, s));
          setErrors({});
        }
      } catch (e) {
        if (!cancelled) {
          setLoadError(e instanceof Error ? e.message : "Failed to load schema");
        }
      }
    })();
    return () => { cancelled = true; };
  }, [selectedModelId, isLoaded, userId, getToken]);

  const handleFieldChange = useCallback((fieldId: string, value: unknown) => {
    setFormState((prev) => ({ ...prev, [fieldId]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[fieldId];
      return next;
    });
  }, []);

  // ---------------------------------------------------------------------------
  // Elements — diff-based DB sync
  // ---------------------------------------------------------------------------
  const handleElementsChange = useCallback(
    async (updated: StudioElement[]) => {
      const prev = elements;
      setElements(updated);

      if (!userId) return;

      try {
        if (updated.length > prev.length) {
          // New element added — find it and POST to DB
          const newEl = updated.find((el) => !prev.some((p) => p.id === el.id));
          if (newEl) {
            const res = await fetch("/api/studio-v2/elements", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                name: newEl.name,
                category: newEl.category,
                pinned: newEl.pinned,
                imageBase64: newEl.imageBase64 || undefined,
                imageMimeType: newEl.imageBase64
                  ? inferImageMimeFromBase64(newEl.imageBase64)
                  : undefined,
              }),
            });
            if (res.ok) {
              const { element } = await res.json() as { element: { id: string; imageUrl: string | null } };
              // Replace the temp element with the DB version (real UUID + imageUrl)
              setElements((curr) =>
                curr.map((el) =>
                  el.id === newEl.id
                    ? { ...el, id: element.id, imageUrl: element.imageUrl ?? undefined, imageBase64: "" }
                    : el
                )
              );
            }
          }
        } else if (updated.length < prev.length) {
          // Element deleted
          const deletedEl = prev.find((el) => !updated.some((u) => u.id === el.id));
          if (deletedEl) {
            await fetch(`/api/studio-v2/elements?id=${encodeURIComponent(deletedEl.id)}`, {
              method: "DELETE",
            });
          }
        } else {
          // Element updated (metadata and/or image)
          const changedEl = updated.find((el) => {
            const prevEl = prev.find((p) => p.id === el.id);
            return prevEl && (
              prevEl.pinned !== el.pinned ||
              prevEl.name !== el.name ||
              prevEl.category !== el.category
            );
          });
          if (changedEl) {
            await fetch("/api/studio-v2/elements", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                id: changedEl.id,
                pinned: changedEl.pinned,
                name: changedEl.name,
                category: changedEl.category,
              }),
            });
          }

          const imageEl = updated.find((el) => {
            const prevEl = prev.find((p) => p.id === el.id);
            if (!prevEl || !el.imageBase64 || !UUID_RE.test(el.id)) return false;
            return prevEl.imageBase64 !== el.imageBase64;
          });
          if (imageEl) {
            const res = await fetch("/api/studio-v2/elements", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                id: imageEl.id,
                imageBase64: imageEl.imageBase64,
                imageMimeType: inferImageMimeFromBase64(imageEl.imageBase64),
              }),
            });
            if (res.ok) {
              const { element } = await res.json() as { element: { imageUrl: string | null } };
              setElements((curr) =>
                curr.map((el) =>
                  el.id === imageEl.id
                    ? { ...el, imageUrl: element.imageUrl ?? undefined, imageBase64: "" }
                    : el
                )
              );
            }
          }
        }
      } catch (e) {
        console.warn("[studio-v2] element sync failed", e);
      }
    },
    [elements, userId]
  );

  // ---------------------------------------------------------------------------
  // Submit generation job
  // ---------------------------------------------------------------------------
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

      // Resolve @mentioned elements (first-appearance order, max 3), fetch base64
      const promptText = String(formState.prompt ?? "");
      const { elements: mentionedElements, tokens: mentionTokens } =
        resolveMentionedElementsWithTokensInOrder(promptText, elements);

      const referenceBase64List = (
        await Promise.all(
          mentionedElements.map((el) => resolveElementBase64(el as StudioElement))
        )
      ).filter((b): b is string => Boolean(b));

      // Collect public Supabase URLs for mentioned elements (preferred over base64 for Kling v3 I2V)
      const referenceUrlList = mentionedElements
        .map((el) => (el as StudioElement).imageUrl)
        .filter((u): u is string => Boolean(u));

      let newJobId: string;

      if (isKling) {
        const body = formStateToKlingRequest(formState, selectedModelId);

        const hasFirstFrame = Boolean(formState.first_frame_image);
        const hasLastFrame = Boolean(formState.last_frame_image);
        const hasFrame = hasFirstFrame || hasLastFrame;
        const hasMentionedImages =
          referenceUrlList.length > 0 || referenceBase64List.length > 0;

        if (hasFrame) {
          // ── Image-to-video via omni-video: frame drives generation.
          // omni-video supports both frames (type: first_frame/end_frame) AND
          // reference images (no type) in the same image_list — include them.
          body.generation_mode = "image_to_video";
          if (selectedModelId === "kling-v3" && hasMentionedImages) {
            body.prompt = buildKlingMultiImagePrompt(promptText, mentionTokens);
            if (referenceUrlList.length > 0) {
              body.reference_image_urls = referenceUrlList;
            }
            if (referenceBase64List.length > 0) {
              body.reference_images_base64 = referenceBase64List;
            }
          }
        } else if (selectedModelId === "kling-v3" && hasMentionedImages) {
          // ── Multi-image-to-video: no frame, but element references present.
          // Rewrite @mention-slug → <<<image_N>>> and send via image_list[].
          body.generation_mode = "multi_image_to_video";
          body.prompt = buildKlingMultiImagePrompt(promptText, mentionTokens);
          if (referenceUrlList.length > 0) {
            body.reference_image_urls = referenceUrlList;
          }
          if (referenceBase64List.length > 0) {
            body.reference_images_base64 = referenceBase64List;
          }
        } else {
          // ── Text-to-video (or non-v3 with reference images)
          body.generation_mode = "text_to_video";
          if (referenceBase64List.length > 0) {
            body.reference_images_base64 = referenceBase64List;
          }
        }

        const res = await generateStudioV2Kling(body, token ?? undefined);
        newJobId = res.job_id;
      } else {
        const body = formStateToVeoRequest(formState, selectedModelId);
        if (referenceBase64List.length > 0) {
          body.reference_images_base64 = referenceBase64List;
        }
        const res = await generateStudioV2Veo(body, token ?? undefined);
        newJobId = res.job_id;
      }

      setJobId(newJobId);
      setJobStatus("generating");
      setJobProgress(0);

      // Persist job to DB (fire-and-forget, don't block the UI)
      if (!savedJobIdsRef.current.has(newJobId)) {
        savedJobIdsRef.current.add(newJobId);
        fetch("/api/studio-v2/jobs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            provider_job_id: newJobId,
            model_id: selectedModelId,
            prompt: String(formState.prompt ?? "").trim(),
          }),
        }).catch((e) => console.warn("[studio-v2] job create failed", e));
      }
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

  // ---------------------------------------------------------------------------
  // Poll job status
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (
      !jobId ||
      !(jobStatus === "generating" || jobStatus === "processing" || jobStatus === "pending")
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
    return () => { cancelled = true; clearInterval(id); };
  }, [jobId, jobStatus, getToken]);

  // ---------------------------------------------------------------------------
  // Download video bytes from Veo/Kling and create blob URL for playback
  // ---------------------------------------------------------------------------
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

  // ---------------------------------------------------------------------------
  // Persist completed video to Supabase Storage + DB, keep UI list in sync
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!userId || !jobId || jobStatus !== "completed" || !resolvedVideoUrl) return;
    if (videoPersistedRef.current.has(jobId)) return;
    if (videoUploadInflightRef.current.has(jobId)) return;

    let cancelled = false;
    videoUploadInflightRef.current.add(jobId);

    (async () => {
      setSavedJobs((prev) => {
        if (prev.find((j) => j.job_id === jobId)) return prev;
        return [
          {
            job_id: jobId,
            prompt: String(formState.prompt ?? ""),
            timestamp: new Date().toISOString(),
            status: "completed",
            blobUrl: resolvedVideoUrl,
          },
          ...prev,
        ];
      });

      try {
        const blob = await fetch(resolvedVideoUrl).then((r) => r.blob());
        if (cancelled) return;

        const fd = new FormData();
        fd.append("file", blob, "video.mp4");
        fd.append("provider_job_id", jobId);
        const res = await fetch("/api/studio-v2/jobs/video", { method: "POST", body: fd });
        if (!res.ok) {
          const errText = await res.text();
          throw new Error(errText || res.statusText);
        }
        const { videoUrl } = await res.json() as { videoUrl: string };
        if (cancelled) return;
        videoPersistedRef.current.add(jobId);
        setSavedJobs((prev) =>
          prev.map((j) =>
            j.job_id === jobId
              ? { ...j, videoUrl, blobUrl: undefined }
              : j
          )
        );
      } catch (e) {
        console.warn("[studio-v2] video persist failed, keeping blob + marking job completed", e);
        if (cancelled) return;
        fetch("/api/studio-v2/jobs", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ provider_job_id: jobId, status: "completed" }),
        }).catch((err) => console.warn("[studio-v2] job status PATCH failed", err));
      } finally {
        videoUploadInflightRef.current.delete(jobId);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId, jobId, jobStatus, resolvedVideoUrl, formState.prompt]);

  // ---------------------------------------------------------------------------
  // Mark failed jobs in DB
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!userId || !jobId || jobStatus !== "failed") return;
    fetch("/api/studio-v2/jobs", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider_job_id: jobId, status: "failed" }),
    }).catch((e) => console.warn("[studio-v2] job fail update failed", e));
  }, [userId, jobId, jobStatus]);

  const isGenerating =
    jobStatus === "generating" ||
    jobStatus === "processing" ||
    jobStatus === "pending";

  const allPromptFields = schema?.fields.filter((f) => f.group === "prompt") ?? [];
  const promptFields = allPromptFields.filter((f) => {
    if (!f.visible_when) return true;
    return Object.entries(f.visible_when).every(([k, v]) => formState[k] === v);
  });

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
          pt: { xs: 0, md: 3 },
          pb: { xs: 0, md: 1.25 },
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
            position: "relative",
            mx: 1.5,
            mt: { xs: 1.5, md: 0 },
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
          <ModelSelector
            variant="overlay"
            models={models}
            selectedModelId={selectedModelId}
            onSelect={setSelectedModelId}
          />
        </Box>

        {schema && (
          <>
            {/* Media upload cards */}
            <Box sx={{ px: 1.5, pt: { xs: 1.5, md: 1.25 }, flexShrink: 0 }}>
              <MediaInputPanel
                fields={schema.fields}
                formState={formState}
                onFieldChange={handleFieldChange}
                errors={errors}
              />
            </Box>

            {/* Prompt fields */}
            <Box
              sx={{
                flex: { xs: 1, md: "0 0 auto" },
                display: "flex",
                flexDirection: "column",
                px: 1.5,
                pt: { xs: 1, md: 0.75 },
                minHeight: 0,
              }}
            >
              <Stack spacing={{ xs: 1, md: 0.75 }} sx={{ flex: { xs: 1, md: "0 0 auto" }, minHeight: 0 }}>
                {promptFields.map((field) =>
                  field.id === "negative_prompt" ? (
                    <Box key={field.id} sx={{ display: { xs: "block", md: "none" } }}>
                      <SchemaFieldRenderer
                        field={field}
                        value={formState[field.id]}
                        onChange={handleFieldChange}
                        error={errors[field.id]}
                      />
                    </Box>
                  ) :
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

            {/* Generation settings */}
            <Box sx={{ px: 1.5, pt: { xs: 1, md: 0.5 }, pb: { xs: 0, md: 0.25 }, flexShrink: 0 }}>
              <GenerationSettingsPanel
                fields={schema.fields}
                formState={formState}
                onFieldChange={handleFieldChange}
                errors={errors}
                constraintMessage={
                  KLING_MODEL_IDS.has(selectedModelId ?? "") &&
                  formState.last_frame_image &&
                  formState.mode !== "pro"
                    ? "Last frame requires Pro mode — will auto-upgrade to Pro."
                    : undefined
                }
              />
            </Box>
          </>
        )}

        {/* Sticky generate button */}
        <Box
          sx={{
            px: 1.5,
            pt: { xs: 1.5, md: 0.75 },
            pb: 1.5,
            mt: { xs: "auto", md: 0 },
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
          onPersistVideoFromBlob={async (jId: string, blob: Blob) => {
            if (videoPersistedRef.current.has(jId)) return;
            try {
              const fd = new FormData();
              fd.append("file", blob, "video.mp4");
              fd.append("provider_job_id", jId);
              const res = await fetch("/api/studio-v2/jobs/video", { method: "POST", body: fd });
              if (!res.ok) return;
              const { videoUrl } = await res.json() as { videoUrl: string };
              videoPersistedRef.current.add(jId);
              setSavedJobs((prev) =>
                prev.map((j) =>
                  j.job_id === jId ? { ...j, videoUrl, blobUrl: undefined } : j
                )
              );
            } catch {
              /* keep blob URL for playback */
            }
          }}
        />
      </Box>
    </Box>
  );
}
