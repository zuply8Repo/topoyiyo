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
  instagram_permalink?: string;
  error_message?: string;
  created_at: string;
};

