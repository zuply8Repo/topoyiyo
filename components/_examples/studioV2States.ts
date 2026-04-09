import {
  playgroundActiveVideoUrl,
  playgroundContentCards,
  playgroundElements,
  playgroundImages,
  playgroundModels,
  playgroundPromptCards,
  playgroundPromptField,
  playgroundSavedJobs,
} from "@/components/_fixtures/studioV2";

export const promptFieldExamples = [
  {
    id: "default",
    label: "Default",
    value: "",
    error: undefined,
    enhancePrompt: false,
    elements: playgroundElements,
  },
  {
    id: "mentions",
    label: "With Mentions",
    value:
      "Create a premium launch video with @hero_model walking across @city_rooftop beside a glowing @neon_sign.",
    error: undefined,
    enhancePrompt: true,
    elements: playgroundElements,
  },
  {
    id: "error",
    label: "Error",
    value: "",
    error: "Prompt is required before generation can start.",
    enhancePrompt: false,
    elements: playgroundElements,
  },
] as const;

export const imageGalleryExamples = [
  {
    id: "empty",
    label: "Empty",
    images: [],
    emptyLabel: "No images yet. Use this state to refine spacing, copy, and empty illustrations.",
  },
  {
    id: "filled",
    label: "Filled",
    images: playgroundImages,
    emptyLabel: "No images yet",
  },
] as const;

export const outputsPanelExamples = [
  {
    id: "empty",
    label: "Empty",
    savedJobs: [],
    activeJobId: null,
    activeJobStatus: null,
    activeJobProgress: 0,
    activeResolvedVideoUrl: null,
    isDownloadingVideo: false,
  },
  {
    id: "generating",
    label: "Generating",
    savedJobs: playgroundSavedJobs,
    activeJobId: "job-active-1",
    activeJobStatus: "generating",
    activeJobProgress: 42,
    activeResolvedVideoUrl: null,
    isDownloadingVideo: false,
  },
  {
    id: "completed",
    label: "Completed",
    savedJobs: playgroundSavedJobs,
    activeJobId: "job-complete-1",
    activeJobStatus: "completed",
    activeJobProgress: 100,
    activeResolvedVideoUrl: playgroundActiveVideoUrl,
    isDownloadingVideo: false,
  },
] as const;

export const playgroundPromptSchema = playgroundPromptField;

export const modelSelectorExamples = [
  {
    id: "veo",
    label: "Veo",
    selectedModelId: "veo-3.1-generate-001",
    models: playgroundModels,
  },
  {
    id: "kling",
    label: "Kling",
    selectedModelId: "kling-v3",
    models: playgroundModels,
  },
  {
    id: "imagen",
    label: "Imagen",
    selectedModelId: "imagen-4",
    models: playgroundModels,
  },
] as const;

export const promptCardExamples = [
  {
    id: "pending",
    label: "Pending",
    card: playgroundPromptCards[0],
  },
  {
    id: "approved",
    label: "Approved",
    card: playgroundPromptCards[1],
  },
  {
    id: "failed",
    label: "Failed",
    card: playgroundPromptCards[2],
  },
] as const;

export const contentCardExamples = [
  {
    id: "image",
    label: "Image Card",
    card: playgroundContentCards[0],
    campaignName: "Summer Drop",
    mediaType: "STORIES" as const,
  },
  {
    id: "video",
    label: "Video Card",
    card: playgroundContentCards[1],
    campaignName: "Festival Launch",
    mediaType: "REELS" as const,
  },
] as const;
