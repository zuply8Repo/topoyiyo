export const ONBOARDING_STEP_OPTIONS = {
  primaryUse: [
    "education_learning",
    "filmmaking_art",
    "freelance_projects",
    "marketing_ads",
    "personal_use",
    "social_media_growth",
  ],
  aiExperience: ["beginner", "intermediate", "advanced", "expert"],
  contentGoals: [
    "commercial_ad_videos",
    "video_generations",
    "realistic_ai_avatars",
    "cinematic_visuals",
    "storyboarding",
    "upscale",
    "viral_social_media_content",
    "lipsync_talking_avatars",
    "image_editing_inpaint",
  ],
  discoverySource: [
    "facebook",
    "youtube",
    "tiktok",
    "word_of_mouth",
    "google_search",
    "news_articles",
    "twitter_x",
    "reddit",
    "linkedin",
    "chatgpt",
    "instagram",
    "other",
  ],
  frustration: [
    "ai_confusing",
    "limited_generations",
    "high_cost",
    "inconsistent_results",
    "not_production_ready",
    "other",
  ],
} as const;

export type OnboardingAnswers = {
  primaryUse: string;
  aiExperience: string;
  contentGoals: string[];
  discoverySource: string;
  discoverySourceOtherText?: string;
  frustration: string;
  frustrationOtherText?: string;
};

export type OnboardingAnswersEnvelope = {
  version: 1;
  submittedAt: string;
  answers: OnboardingAnswers;
};

function isAllowedOption(
  value: string,
  options: readonly string[]
): value is string {
  return options.includes(value);
}

function sanitizeOptionalText(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
}

export function validateAndNormalizeOnboardingAnswers(
  input: unknown
): { ok: true; value: OnboardingAnswers } | { ok: false; error: string } {
  if (!input || typeof input !== "object") {
    return { ok: false, error: "Invalid onboarding payload." };
  }

  const data = input as Partial<OnboardingAnswers>;

  if (
    !data.primaryUse ||
    !isAllowedOption(data.primaryUse, ONBOARDING_STEP_OPTIONS.primaryUse)
  ) {
    return { ok: false, error: "Invalid primary use selection." };
  }

  if (
    !data.aiExperience ||
    !isAllowedOption(data.aiExperience, ONBOARDING_STEP_OPTIONS.aiExperience)
  ) {
    return { ok: false, error: "Invalid AI experience selection." };
  }

  if (!Array.isArray(data.contentGoals) || data.contentGoals.length === 0) {
    return { ok: false, error: "Select at least one content goal." };
  }

  const uniqueGoals = Array.from(new Set(data.contentGoals));
  if (
    uniqueGoals.some(
      (goal) => !isAllowedOption(goal, ONBOARDING_STEP_OPTIONS.contentGoals)
    )
  ) {
    return { ok: false, error: "Invalid content goals selection." };
  }

  if (
    !data.discoverySource ||
    !isAllowedOption(
      data.discoverySource,
      ONBOARDING_STEP_OPTIONS.discoverySource
    )
  ) {
    return { ok: false, error: "Invalid discovery source selection." };
  }

  if (
    !data.frustration ||
    !isAllowedOption(data.frustration, ONBOARDING_STEP_OPTIONS.frustration)
  ) {
    return { ok: false, error: "Invalid frustration selection." };
  }

  const discoverySourceOtherText = sanitizeOptionalText(
    data.discoverySourceOtherText
  );
  const frustrationOtherText = sanitizeOptionalText(data.frustrationOtherText);

  if (data.discoverySource === "other" && !discoverySourceOtherText) {
    return { ok: false, error: "Please provide details for discovery source." };
  }

  if (data.frustration === "other" && !frustrationOtherText) {
    return { ok: false, error: "Please provide details for frustration." };
  }

  return {
    ok: true,
    value: {
      primaryUse: data.primaryUse,
      aiExperience: data.aiExperience,
      contentGoals: uniqueGoals,
      discoverySource: data.discoverySource,
      discoverySourceOtherText,
      frustration: data.frustration,
      frustrationOtherText,
    },
  };
}
