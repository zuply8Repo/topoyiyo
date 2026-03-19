export type ContentStatus = "pending" | "approved" | "rejected";

export type AssetType = "image" | "video";

export type CampaignStatus = "draft" | "in_progress" | "completed" | "failed";

export type Campaign = {
  id: string;
  user_id: string;
  campaign_name: string;
  brief_text?: string;
  status: CampaignStatus;
  content_count: number;
  created_at: string;
  updated_at: string;
};

export type InstagramMediaType = "REELS" | "STORIES" | "CAROUSEL";

export type ContentItem = {
  id: string;
  userId?: string;
  campaignId?: string;
  assetType: AssetType;
  imageUrl?: string;
  videoUrl?: string;
  caption: string;
  status: ContentStatus;
  regenerationRequested?: boolean;
  createdAt: number;
  updatedAt: number;
  /** UI-only: user-selected Instagram media type (Reel vs Story) for 9:16 content */
  instagramMediaType?: InstagramMediaType;
};

export type Session = {
  signedIn: boolean;
  name?: string;
  email?: string;
};

export type ScheduleAssignment = {
  itemId: string;
  dateISO: string; // YYYY-MM-DD
  time: string; // HH:mm
  /**
   * Optional manual ordering within a day. Lower renders first.
   * Used for drag/drop reordering without changing the scheduled time.
   */
  order?: number;
};

// ============================================================================
// Prompt Management Types
// ============================================================================

export type PromptStatus = "pending" | "approved" | "rejected" | "edited" | "failed";
export type GenerationEngine = "veo" | "nano_banana";
export type PromptType = "video" | "story_image" | "carousel_image";

export interface VideoPrompt {
  id?: string;
  asset_id: string;
  prompt: string;
  subject: string;
  action: string;
  style: string;
  camera: string;
  composition: string;
  focus_lens: string;
  ambiance: string;
  duration: number;
  aspect_ratio: string;
  resolution: string;
  rationale: string;
  status: PromptStatus;
  engine: "veo";
}

export interface ImagePrompt {
  id?: string;
  asset_id: string;
  prompt: string;
  subject: string;
  composition: string;
  style: string;
  color_palette: string;
  dimensions: string;
  quality?: string;
  model_type?: "flash" | "pro";
  rationale: string;
  post_number?: number;
  image_number?: number;
  status: PromptStatus;
  engine: "nano_banana";
}

export interface CampaignPrompts {
  campaign_id: string;
  campaign_name: string;
  creative_direction: {
    concept: string;
    narrative: string;
    tone: string;
    visual_direction: string;
  };
  video_prompts: VideoPrompt[];
  image_prompts: {
    story_images: ImagePrompt[];
    carousel_images: ImagePrompt[];
  };
}

export interface PromptResponse {
  id: string;
  campaign_id: string;
  prompt_type: PromptType;
  asset_id: string;
  full_prompt: string;
  metadata: Record<string, unknown>;
  status: PromptStatus;
  engine: GenerationEngine;
  user_edits?: string;
  created_at: string;
  updated_at: string;
  reference_images?: ReferenceImage[];
}

// ============================================================================
// Reference Images Types
// ============================================================================

export type ReferenceImageType = "logo" | "product";

export interface ReferenceImage {
  id: string;
  prompt_id: string;
  image_type: ReferenceImageType;
  public_url: string;
  file_name: string;
  file_size?: number;
  mime_type?: string;
  uploaded_at: string;
  expires_at: string;
}

export interface ReferenceImageUpload {
  prompt_id: string;
  image_type: ReferenceImageType;
  file: File;
}

// ============================================================================
// Instagram Types
// ============================================================================

export type InstagramAccountType = "business" | "creator";

export type InstagramPublishStatus =
  | "pending"
  | "scheduled"
  | "publishing"
  | "published"
  | "failed"
  | "cancelled";

export type InstagramAccount = {
  id: string;
  instagram_user_id: string;
  instagram_username: string;
  account_type: InstagramAccountType;
  profile_picture_url?: string;
  followers_count: number;
  is_active: boolean;
  token_expiry: string;
  created_at: string;
  updated_at: string;
};

export type InstagramScheduledPost = {
  id: string;
  content_item_id: string;
  instagram_account_id: string;
  campaign_id?: string;
  scheduled_date: string;
  scheduled_time: string;
  publish_status: InstagramPublishStatus;
  media_type?: string; // "REELS", "STORIES", or "CAROUSEL"
  instagram_permalink?: string;
  error_message?: string;
  created_at: string;
};

