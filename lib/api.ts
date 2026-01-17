/**
 * API client for backend campaign generation services
 */

import type { ContentItem } from "./types";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

// ============================================================================
// Campaign Generation Types
// ============================================================================

export interface CreateCampaignResponse {
  success: boolean;
  job_id: string;
  message: string;
}

// ============================================================================
// Marketing Chat Types
// ============================================================================

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface MarketingChatRequest {
  messages: ChatMessage[];
  conversation_id?: string;
  user_id?: string;
}

export interface MarketingChatResponse {
  conversation_id: string;
  assistant_message: string;
  messages: ChatMessage[];
  brief_generated: boolean;
  brief_content?: string;
}

export interface JobStatus {
  job_id: string;
  status: "pending" | "processing" | "completed" | "failed";
  progress_percentage: number;
  error_message?: string;
  campaign_id?: string;
  created_at: string;
  completed_at?: string;
}

/**
 * Create a new campaign generation job
 *
 * @param userId - User ID
 * @param briefText - Campaign brief text
 * @returns Campaign creation response with job_id
 * @throws Error if request fails
 */
export async function createCampaign(
  userId: string,
  briefText: string
): Promise<CreateCampaignResponse> {
  const response = await fetch(`${API_BASE_URL}/campaigns/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      user_id: userId,
      brief_text: briefText,
    }),
  });

  if (!response.ok) {
    let errorMessage = "Failed to create campaign";
    try {
      const error = await response.json();
      errorMessage = error.detail || errorMessage;
    } catch {
      // If parsing fails, use default message
    }
    throw new Error(errorMessage);
  }

  return response.json();
}

/**
 * Get the status of a campaign generation job
 *
 * @param jobId - Job ID to check
 * @returns Current job status
 * @throws Error if request fails
 */
export async function getCampaignStatus(jobId: string): Promise<JobStatus> {
  const response = await fetch(`${API_BASE_URL}/campaigns/status/${jobId}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    let errorMessage = "Failed to get campaign status";
    try {
      const error = await response.json();
      errorMessage = error.detail || errorMessage;
    } catch {
      // If parsing fails, use default message
    }
    throw new Error(errorMessage);
  }

  return response.json();
}

// ============================================================================
// Marketing Brief Approval
// ============================================================================

export interface ApproveBriefRequest {
  short_summary: string;
  markdown_report: string;
  conversation_id?: string;
  user_id?: string;
}

export interface ApproveBriefResponse {
  id: string;
  success: boolean;
}

/**
 * Save an approved marketing brief to the database
 *
 * @param shortSummary - Executive summary
 * @param markdownReport - Full markdown report
 * @param conversationId - Conversation ID
 * @param userId - User ID
 * @returns Saved brief ID
 * @throws Error if request fails
 */
export async function approveMarketingBrief(
  shortSummary: string,
  markdownReport: string,
  conversationId?: string,
  userId?: string
): Promise<ApproveBriefResponse> {
  const requestBody: ApproveBriefRequest = {
    short_summary: shortSummary,
    markdown_report: markdownReport,
    conversation_id: conversationId,
    user_id: userId,
  };

  const response = await fetch(`${API_BASE_URL}/marketing/brief/approve`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    let errorMessage = "Failed to approve brief";
    try {
      const error = await response.json();
      errorMessage = error.detail || errorMessage;
    } catch {
      // If parsing fails, use default message
    }
    throw new Error(errorMessage);
  }

  return response.json();
}

// ============================================================================
// Marketing Chat API
// ============================================================================

/**
 * Send a message to the marketing intake agent
 *
 * @param messages - Full conversation history
 * @param conversationId - Optional conversation ID for tracking
 * @param userId - Optional user ID
 * @returns Agent response with updated conversation
 * @throws Error if request fails
 */
export async function sendMarketingChatMessage(
  messages: ChatMessage[],
  conversationId?: string,
  userId?: string
): Promise<MarketingChatResponse> {
  const requestBody: MarketingChatRequest = {
    messages,
    conversation_id: conversationId,
    user_id: userId,
  };

  const response = await fetch(`${API_BASE_URL}/marketing/brief/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    let errorMessage = "Failed to send message";
    try {
      const error = await response.json();
      errorMessage = error.detail || errorMessage;
    } catch {
      // If parsing fails, use default message
    }
    throw new Error(errorMessage);
  }

  return response.json();
}

// ============================================================================
// Campaign API
// ============================================================================

export interface Campaign {
  id: string;
  user_id: string;
  campaign_name: string;
  brief_text?: string;
  status: "draft" | "in_progress" | "completed" | "failed";
  content_count: number;
  created_at: string;
  updated_at: string;
}

export interface CampaignListResponse {
  success: boolean;
  campaigns: Campaign[];
  total: number;
}

export interface ActiveCampaignResponse {
  success: boolean;
  campaign: Campaign | null;
}

/**
 * Get all campaigns for a user
 * 
 * @param userId - User ID
 * @param limit - Maximum number of campaigns to return
 * @returns List of campaigns with metadata
 * @throws Error if request fails
 */
export async function listUserCampaigns(
  userId: string,
  limit: number = 50
): Promise<Campaign[]> {
  const response = await fetch(
    `${API_BASE_URL}/campaigns/user/${userId}?limit=${limit}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    }
  );

  if (!response.ok) {
    let errorMessage = "Failed to list campaigns";
    try {
      const error = await response.json();
      errorMessage = error.detail || errorMessage;
    } catch {
      // If parsing fails, use default message
    }
    throw new Error(errorMessage);
  }

  const data: CampaignListResponse = await response.json();
  return data.campaigns;
}

/**
 * Get the user's active campaign (most recent completed or in_progress)
 * 
 * @param userId - User ID
 * @returns Active campaign or null if user has no campaigns
 * @throws Error if request fails
 */
export async function getActiveCampaign(
  userId: string
): Promise<Campaign | null> {
  const response = await fetch(
    `${API_BASE_URL}/campaigns/user/${userId}/active`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    }
  );

  if (!response.ok) {
    let errorMessage = "Failed to get active campaign";
    try {
      const error = await response.json();
      errorMessage = error.detail || errorMessage;
    } catch {
      // If parsing fails, use default message
    }
    throw new Error(errorMessage);
  }

  const data: ActiveCampaignResponse = await response.json();
  return data.campaign;
}

// ============================================================================
// Content Items API
// ============================================================================

export interface CampaignContentResponse {
  success: boolean;
  campaign_id: string;
  items: Array<{
    id: string;
    user_id: string;
    campaign_id?: string;
    asset_type: "image" | "video";
    image_url?: string;
    video_url?: string;
    caption: string;
    status: string;
    created_at: string;
    updated_at: string;
  }>;
  total: number;
}

/**
 * Fetch all content items for a campaign
 * 
 * @param campaignId - Campaign UUID
 * @param userId - User ID for authorization
 * @returns List of content items with images/videos
 * @throws Error if request fails
 */
export async function fetchCampaignContent(
  campaignId: string,
  userId: string
): Promise<ContentItem[]> {
  const response = await fetch(
    `${API_BASE_URL}/campaigns/${campaignId}/content?user_id=${userId}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    }
  );

  if (!response.ok) {
    let errorMessage = "Failed to fetch campaign content";
    try {
      const error = await response.json();
      errorMessage = error.detail || errorMessage;
    } catch {
      // If parsing fails, use default message
    }
    throw new Error(errorMessage);
  }

  const data: CampaignContentResponse = await response.json();

  // Map backend response to frontend ContentItem type
  return data.items.map((item) => ({
    id: item.id,
    userId: item.user_id,
    campaignId: item.campaign_id,
    assetType: item.asset_type,
    imageUrl: item.image_url,
    videoUrl: item.video_url,
    caption: item.caption,
    status: item.status as "pending" | "approved" | "rejected",
    createdAt: new Date(item.created_at).getTime(),
    updatedAt: new Date(item.updated_at).getTime(),
  }));
}

/**
 * Fetch all content items for a user across all campaigns
 * 
 * @param userId - User ID
 * @param status - Optional filter by status
 * @param limit - Maximum number of items to return (default: 100)
 * @returns List of all content items
 * @throws Error if request fails
 */
export async function fetchAllUserContent(
  userId: string,
  status?: string,
  limit: number = 100
): Promise<ContentItem[]> {
  let url = `${API_BASE_URL}/campaigns/user/${userId}/content?limit=${limit}`;
  if (status) {
    url += `&status=${status}`;
  }

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    let errorMessage = "Failed to fetch user content";
    try {
      const error = await response.json();
      errorMessage = error.detail || errorMessage;
    } catch {
      // If parsing fails, use default message
    }
    throw new Error(errorMessage);
  }

  const data = await response.json();

  // Map backend response to frontend ContentItem type
  return data.items.map((item: any) => ({
    id: item.id,
    userId: item.user_id,
    campaignId: item.campaign_id,
    assetType: item.asset_type,
    imageUrl: item.image_url,
    videoUrl: item.video_url,
    caption: item.caption,
    status: item.status as "pending" | "approved" | "rejected",
    createdAt: new Date(item.created_at).getTime(),
    updatedAt: new Date(item.updated_at).getTime(),
  }));
}

/**
 * Update the caption of a content item
 * 
 * @param contentId - Content item ID
 * @param userId - User ID for authorization
 * @param caption - New caption text
 * @returns Updated content item
 * @throws Error if request fails
 */
export async function updateContentCaption(
  contentId: string,
  userId: string,
  caption: string
): Promise<ContentItem> {
  const response = await fetch(
    `${API_BASE_URL}/content/${contentId}/caption?user_id=${userId}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ caption }),
    }
  );

  if (!response.ok) {
    let errorMessage = "Failed to update caption";
    try {
      const error = await response.json();
      errorMessage = error.detail || errorMessage;
    } catch {
      // If parsing fails, use default message
    }
    throw new Error(errorMessage);
  }

  const data = await response.json();
  const item = data.item;

  return {
    id: item.id,
    userId: item.user_id,
    campaignId: item.campaign_id,
    assetType: item.asset_type,
    imageUrl: item.image_url,
    videoUrl: item.video_url,
    caption: item.caption,
    status: item.status as "pending" | "approved" | "rejected",
    createdAt: new Date(item.created_at).getTime(),
    updatedAt: new Date(item.updated_at).getTime(),
  };
}

/**
 * Delete a content item
 * 
 * @param contentId - Content item ID
 * @param userId - User ID for authorization
 * @throws Error if request fails
 */
export async function deleteContentItem(
  contentId: string,
  userId: string
): Promise<void> {
  const response = await fetch(
    `${API_BASE_URL}/content/${contentId}?user_id=${userId}`,
    {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
    }
  );

  if (!response.ok) {
    let errorMessage = "Failed to delete content item";
    try {
      const error = await response.json();
      errorMessage = error.detail || errorMessage;
    } catch {
      // If parsing fails, use default message
    }
    throw new Error(errorMessage);
  }
}

