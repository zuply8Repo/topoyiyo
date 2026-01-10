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

