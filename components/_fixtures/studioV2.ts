"use client";

import type { StudioV2FieldSchema, StudioV2ModelSummary } from "@/lib/api";
import type { StudioElement } from "@/components/studio-v2/ElementsPanel";
import type { GeneratedImageItem } from "@/components/studio-v2/ImageGallery";
import type { ContentItem } from "@/lib/types";

const SAMPLE_VIDEO_URL =
  "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4";

const TRANSPARENT_PIXEL =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+hY7cAAAAASUVORK5CYII=";

export const playgroundPromptField: StudioV2FieldSchema = {
  id: "prompt",
  label: "Prompt",
  type: "textarea",
  required: true,
  group: "core",
  help_text: "Use @mentions for saved elements like characters, props, or locations.",
  placeholder: "Describe the scene, motion, camera, and mood...",
};

export const playgroundModels: StudioV2ModelSummary[] = [
  {
    model_id: "veo-3.1-generate-001",
    label: "Veo 3.1",
    media_type: "video",
    description: "High-quality cinematic video generation",
  },
  {
    model_id: "kling-v3",
    label: "Kling v3",
    media_type: "video",
    description: "Multi-shot video generation with native audio",
  },
  {
    model_id: "imagen-4",
    label: "Imagen 4",
    media_type: "image",
    description: "High-fidelity image generation and editing",
  },
];

export const playgroundElements: StudioElement[] = [
  {
    id: "hero-1",
    name: "hero_model",
    category: "character",
    imageBase64: TRANSPARENT_PIXEL,
    imageUrl: "https://placehold.co/256x256/111827/F8FAFC.png?text=Hero",
    pinned: true,
  },
  {
    id: "city-1",
    name: "city_rooftop",
    category: "location",
    imageBase64: TRANSPARENT_PIXEL,
    imageUrl: "https://placehold.co/256x256/1E3A8A/F8FAFC.png?text=Rooftop",
    pinned: false,
  },
  {
    id: "prop-1",
    name: "neon_sign",
    category: "prop",
    imageBase64: TRANSPARENT_PIXEL,
    imageUrl: "https://placehold.co/256x256/2563EB/F8FAFC.png?text=Neon",
    pinned: true,
  },
];

export const playgroundImages: GeneratedImageItem[] = [
  {
    id: "img-1",
    bytesBase64: TRANSPARENT_PIXEL,
    imageUrl: "https://placehold.co/700x980/F3F4F6/111827.png?text=Editorial+Portrait",
    mimeType: "image/png",
    prompt: "Editorial portrait with soft shadows and a clean fashion backdrop",
    modelVariant: "Imagen 4",
    aspectRatio: "3:4",
    timestamp: "2026-04-01T09:00:00.000Z",
  },
  {
    id: "img-2",
    bytesBase64: TRANSPARENT_PIXEL,
    imageUrl: "https://placehold.co/1280x720/E2E8F0/0F172A.png?text=Studio+Landscape",
    mimeType: "image/png",
    prompt: "Studio landscape with a cinematic skyline and cool blue lighting",
    modelVariant: "Imagen 4",
    aspectRatio: "16:9",
    timestamp: "2026-04-01T09:05:00.000Z",
  },
  {
    id: "img-3",
    bytesBase64: TRANSPARENT_PIXEL,
    imageUrl: "https://placehold.co/900x900/DBEAFE/1E3A8A.png?text=Brand+Square",
    mimeType: "image/png",
    prompt: "Square campaign visual with product framing and premium composition",
    modelVariant: "Imagen 4",
    aspectRatio: "1:1",
    timestamp: "2026-04-01T09:10:00.000Z",
  },
];

export const playgroundSavedJobs = [
  {
    job_id: "job-complete-1",
    prompt: "Luxury product film on a rooftop at sunset",
    timestamp: "2026-04-01T08:45:00.000Z",
    status: "completed" as const,
    blobUrl: SAMPLE_VIDEO_URL,
  },
  {
    job_id: "job-complete-2",
    prompt: "Fast-paced fashion reel with neon accents",
    timestamp: "2026-04-01T08:30:00.000Z",
    status: "completed" as const,
    blobUrl: SAMPLE_VIDEO_URL,
  },
];

export const playgroundActiveVideoUrl = SAMPLE_VIDEO_URL;

export const playgroundPromptCards = [
  {
    promptId: "prompt-pending",
    assetId: "asset-101",
    promptType: "video" as const,
    fullPrompt:
      "Create a premium campaign video of a model entering a summer festival with cinematic backlight, shallow depth of field, and elegant crowd motion.",
    status: "pending" as const,
    engine: "veo" as const,
    metadata: {
      duration: "8s",
      aspect_ratio: "9:16",
      model_type: "veo-3.1-generate-001",
      quality: "high",
    },
    isApproving: false,
  },
  {
    promptId: "prompt-approved",
    assetId: "asset-102",
    promptType: "story_image" as const,
    fullPrompt:
      "Generate a clean editorial portrait for a luxury launch with warm neutrals, sharp product silhouette, and premium catalog styling.",
    status: "approved" as const,
    engine: "nano_banana" as const,
    metadata: {
      aspect_ratio: "3:4",
      model_type: "pro",
      quality: "2K",
    },
    isApproving: false,
  },
  {
    promptId: "prompt-failed",
    assetId: "asset-103",
    promptType: "carousel_image" as const,
    fullPrompt:
      "Create a carousel narrative that follows a hero product through three bold editorial scenes with a strong luxury fashion tone.",
    status: "failed" as const,
    engine: "nano_banana" as const,
    metadata: {
      failure_type: "content_filtered",
      generation_error:
        "The prompt includes details that likely triggered a safety check. Remove named people or sensitive scene references and retry.",
      aspect_ratio: "1:1",
      model_type: "flash",
      quality: "1K",
    },
    isApproving: false,
  },
];

export const playgroundContentCards: ContentItem[] = [
  {
    id: "content-image-1",
    assetType: "image",
    imageUrl: "https://placehold.co/1080x1350/F3F4F6/111827.png?text=Editorial+Image",
    caption: "Luxury image concept for a premium campaign launch.",
    status: "approved",
    createdAt: 1711954800000,
    updatedAt: 1711954800000,
  },
  {
    id: "content-video-1",
    assetType: "video",
    videoUrl: SAMPLE_VIDEO_URL,
    caption: "Short cinematic reel optimized for mobile vertical playback.",
    status: "pending",
    createdAt: 1711958400000,
    updatedAt: 1711958400000,
  },
];
