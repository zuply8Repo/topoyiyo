/**
 * API client for backend campaign generation services
 */

import type { ContentItem, CampaignPrompts, PromptStatus, PromptResponse, ReferenceImage, ReferenceImageType } from "./types";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

/**
 * Helper function to create headers with Authorization token
 */
async function getAuthHeaders(token?: string | null): Promise<HeadersInit> {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };
  
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  
  return headers;
}

export class ApiError extends Error {
  status: number;
  code?: string;
  payload?: unknown;

  constructor(message: string, status: number, code?: string, payload?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.payload = payload;
  }
}

async function throwApiError(
  response: Response,
  fallbackMessage: string
): Promise<never> {
  try {
    const error = await response.json();
    const detail = error?.detail;
    if (typeof detail === "string") {
      throw new ApiError(detail, response.status, error?.code, error);
    }
    if (detail && typeof detail === "object") {
      const message =
        (detail as Record<string, unknown>).message as string | undefined;
      const code = (detail as Record<string, unknown>).code as string | undefined;
      throw new ApiError(message || fallbackMessage, response.status, code, detail);
    }
    throw new ApiError(error?.message || fallbackMessage, response.status, error?.code, error);
  } catch (e) {
    if (e instanceof ApiError) {
      throw e;
    }
    throw new ApiError(fallbackMessage, response.status);
  }
}

type BackendContentItem = {
  id: string;
  user_id: string;
  campaign_id?: string;
  asset_type: "image" | "video";
  image_url?: string;
  video_url?: string;
  caption: string;
  status: "pending" | "approved" | "rejected" | string;
  created_at: string;
  updated_at: string;
};

type BackendUserContentResponse = {
  items: BackendContentItem[];
};

// ============================================================================
// Campaign Generation Types
// ============================================================================

export type VideoGenerationModel = "veo";

export interface CreateCampaignResponse {
  success: boolean;
  job_id: string;
  campaign_id: string;
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
 * @param briefText - Campaign brief text
 * @param videoModel - Video generation model to use
 * @param token - Clerk session token (optional, will be required for authenticated requests)
 * @returns Campaign creation response with job_id
 * @throws Error if request fails
 */
export async function createCampaign(
  briefText: string,
  videoModel: VideoGenerationModel = "veo",
  token?: string | null
): Promise<CreateCampaignResponse> {
  const response = await fetch(`${API_BASE_URL}/campaigns/generate`, {
    method: "POST",
    headers: await getAuthHeaders(token),
    body: JSON.stringify({
      brief_text: briefText,
      video_model: videoModel,
    }),
  });

  if (!response.ok) {
    await throwApiError(response, "Failed to create campaign");
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
 * @param token - Clerk session token (optional, will be required for authenticated requests)
 * @returns Saved brief ID
 * @throws Error if request fails
 */
export async function approveMarketingBrief(
  shortSummary: string,
  markdownReport: string,
  conversationId?: string,
  token?: string | null
): Promise<ApproveBriefResponse> {
  const requestBody: ApproveBriefRequest = {
    short_summary: shortSummary,
    markdown_report: markdownReport,
    conversation_id: conversationId,
  };

  const response = await fetch(`${API_BASE_URL}/marketing/brief/approve`, {
    method: "POST",
    headers: await getAuthHeaders(token),
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    await throwApiError(response, "Failed to approve brief");
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
 * @param token - Clerk session token (optional, will be required for authenticated requests)
 * @returns Agent response with updated conversation
 * @throws Error if request fails
 */
export async function sendMarketingChatMessage(
  messages: ChatMessage[],
  conversationId?: string,
  token?: string | null
): Promise<MarketingChatResponse> {
  const requestBody: MarketingChatRequest = {
    messages,
    conversation_id: conversationId,
  };

  const response = await fetch(`${API_BASE_URL}/marketing/brief/chat`, {
    method: "POST",
    headers: await getAuthHeaders(token),
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    await throwApiError(response, "Failed to send message");
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
 * @param limit - Maximum number of campaigns to return
 * @param token - Clerk session token (optional, will be required for authenticated requests)
 * @returns List of campaigns with metadata
 * @throws Error if request fails
 */
export async function listUserCampaigns(
  limit: number = 50,
  token?: string | null
): Promise<Campaign[]> {
  const response = await fetch(
    `${API_BASE_URL}/campaigns/user/campaigns?limit=${limit}`,
    {
      method: "GET",
      headers: await getAuthHeaders(token),
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
 * @param token - Clerk session token (optional, will be required for authenticated requests)
 * @returns Active campaign or null if user has no campaigns
 * @throws Error if request fails
 */
export async function getActiveCampaign(
  token?: string | null
): Promise<Campaign | null> {
  const response = await fetch(
    `${API_BASE_URL}/campaigns/user/active`,
    {
      method: "GET",
      headers: await getAuthHeaders(token),
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
 * @param token - Clerk session token (optional, will be required for authenticated requests)
 * @returns List of content items with images/videos
 * @throws Error if request fails
 */
export async function fetchCampaignContent(
  campaignId: string,
  token?: string | null
): Promise<ContentItem[]> {
  const response = await fetch(
    `${API_BASE_URL}/campaigns/${campaignId}/content`,
    {
      method: "GET",
      headers: await getAuthHeaders(token),
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
 * @param status - Optional filter by status
 * @param limit - Maximum number of items to return (default: 100)
 * @param token - Clerk session token (optional, will be required for authenticated requests)
 * @returns List of all content items
 * @throws Error if request fails
 */
export async function fetchAllUserContent(
  status?: string,
  limit: number = 100,
  token?: string | null
): Promise<ContentItem[]> {
  let url = `${API_BASE_URL}/campaigns/user/content?limit=${limit}`;
  if (status) {
    url += `&status=${status}`;
  }

  const response = await fetch(url, {
    method: "GET",
    headers: await getAuthHeaders(token),
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

  const data = (await response.json()) as BackendUserContentResponse;

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
 * Update the caption of a content item
 * 
 * @param contentId - Content item ID
 * @param caption - New caption text
 * @param token - Clerk session token (optional, will be required for authenticated requests)
 * @returns Updated content item
 * @throws Error if request fails
 */
export async function updateContentCaption(
  contentId: string,
  caption: string,
  token?: string | null
): Promise<ContentItem> {
  const response = await fetch(
    `${API_BASE_URL}/content/${contentId}/caption`,
    {
      method: "PATCH",
      headers: await getAuthHeaders(token),
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
 * @param token - Clerk session token (optional, will be required for authenticated requests)
 * @throws Error if request fails
 */
export async function deleteContentItem(
  contentId: string,
  token?: string | null
): Promise<void> {
  const response = await fetch(
    `${API_BASE_URL}/content/${contentId}`,
    {
      method: "DELETE",
      headers: await getAuthHeaders(token),
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

// ============================================================================
// Prompt Management API
// ============================================================================

export interface SavePromptsPayload {
  campaign_id: string;
  campaign_name: string;
  creative_direction: {
    concept: string;
    narrative: string;
    tone: string;
    visual_direction: string;
  };
  video_prompts: Array<{
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
    status?: string;
  }>;
  story_images: Array<{
    asset_id: string;
    prompt: string;
    subject: string;
    composition: string;
    style: string;
    color_palette: string;
    dimensions: string;
    quality?: string;
    model_type?: string;
    rationale: string;
    status?: string;
  }>;
  carousel_images: Array<{
    asset_id: string;
    prompt: string;
    subject: string;
    composition: string;
    style: string;
    color_palette: string;
    dimensions: string;
    post_number?: number;
    image_number?: number;
    quality?: string;
    model_type?: string;
    rationale: string;
    status?: string;
  }>;
}

/**
 * Save campaign prompts to database for user review
 * 
 * @param campaignId - Campaign UUID
 * @param prompts - Complete prompt data from backend
 * @param token - Clerk session token (optional, will be required for authenticated requests)
 * @returns Success confirmation
 * @throws Error if request fails
 */
export async function saveCampaignPrompts(
  campaignId: string,
  prompts: SavePromptsPayload,
  token?: string | null
): Promise<{ success: boolean; total_prompts: number }> {
  const response = await fetch(
    `${API_BASE_URL}/campaigns/${campaignId}/prompts/save`,
    {
      method: "POST",
      headers: await getAuthHeaders(token),
      body: JSON.stringify(prompts),
    }
  );

  if (!response.ok) {
    let errorMessage = "Failed to save prompts";
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
 * Get all prompts for a campaign
 * 
 * @param campaignId - Campaign UUID
 * @param token - Clerk session token (optional, will be required for authenticated requests)
 * @returns All prompts organized by type
 * @throws Error if request fails
 */
export async function getCampaignPrompts(
  campaignId: string,
  token?: string | null
): Promise<{
  success: boolean;
  campaign_id: string;
  campaign_name: string;
  creative_direction: Record<string, unknown>;
  video_prompts: PromptResponse[];
  story_images: PromptResponse[];
  carousel_images: PromptResponse[];
  total: number;
}> {
  const response = await fetch(
    `${API_BASE_URL}/campaigns/${campaignId}/prompts`,
    {
      method: "GET",
      headers: await getAuthHeaders(token),
    }
  );

  if (!response.ok) {
    let errorMessage = "Failed to get prompts";
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
 * Update a single prompt (edit or status change)
 * 
 * @param promptId - Prompt UUID
 * @param fullPrompt - Updated prompt text
 * @param status - New status
 * @param token - Clerk session token (optional, will be required for authenticated requests)
 * @returns Updated prompt data
 * @throws Error if request fails
 */
export async function updatePrompt(
  promptId: string,
  fullPrompt: string,
  status: PromptStatus,
  token?: string | null
): Promise<{ success: boolean; prompt: PromptResponse }> {
  const response = await fetch(`${API_BASE_URL}/prompts/${promptId}`, {
    method: "PATCH",
    headers: await getAuthHeaders(token),
    body: JSON.stringify({
      full_prompt: fullPrompt,
      status,
    }),
  });

  if (!response.ok) {
    let errorMessage = "Failed to update prompt";
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
 * Approve a single prompt and trigger immediate generation
 * 
 * @param promptId - Prompt UUID
 * @param campaignId - Campaign UUID
 * @param token - Clerk session token (optional, will be required for authenticated requests)
 * @returns Job ID and status
 * @throws Error if request fails
 */
export async function approveAndGeneratePrompt(
  promptId: string,
  campaignId: string,
  token?: string | null
): Promise<{
  success: boolean;
  job_id: string;
  status: string;
  message: string;
}> {
  const response = await fetch(
    `${API_BASE_URL}/prompts/${promptId}/approve-and-generate`,
    {
      method: "POST",
      headers: await getAuthHeaders(token),
      body: JSON.stringify({ 
        campaign_id: campaignId 
      }),
    }
  );

  if (!response.ok) {
    await throwApiError(response, "Failed to approve and generate prompt");
  }

  return response.json();
}

/**
 * Trigger content generation from approved prompts
 * 
 * @param campaignId - Campaign UUID
 * @param token - Clerk session token (optional, will be required for authenticated requests)
 * @returns Job ID and approval counts
 * @throws Error if request fails
 */
export async function generateApprovedContent(
  campaignId: string,
  token?: string | null
): Promise<{
  success: boolean;
  job_id: string;
  approved_videos: number;
  approved_images: number;
  message: string;
}> {
  const response = await fetch(
    `${API_BASE_URL}/campaigns/${campaignId}/prompts/generate`,
    {
      method: "POST",
      headers: await getAuthHeaders(token),
      body: JSON.stringify({}),
    }
  );

  if (!response.ok) {
    await throwApiError(response, "Failed to generate content");
  }

  return response.json();
}

// ============================================================================
// Reference Images API
// ============================================================================

/**
 * Upload a reference image for a prompt
 * 
 * @param promptId - Prompt UUID
 * @param imageType - Type of image (logo or product)
 * @param file - Image file to upload
 * @param token - Clerk JWT session token
 * @param userId - Clerk user ID
 * @returns Uploaded image metadata
 * @throws Error if request fails
 */
export async function uploadReferenceImage(
  promptId: string,
  imageType: ReferenceImageType,
  file: File,
  token?: string | null,
  userId?: string | null
): Promise<ReferenceImage> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('image_type', imageType);
  if (userId) {
    formData.append('user_id', userId);
  }

  const headers: HeadersInit = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(
    `${API_BASE_URL}/prompts/${promptId}/reference-images/upload`,
    {
      method: "POST",
      headers,
      body: formData,
    }
  );

  if (!response.ok) {
    await throwApiError(response, "Failed to upload reference image");
  }

  return response.json();
}

/**
 * Get all active reference images for a prompt
 * 
 * @param promptId - Prompt UUID
 * @param token - Clerk JWT session token
 * @param userId - Clerk user ID
 * @returns List of active reference images
 * @throws Error if request fails
 */
export async function getReferenceImages(
  promptId: string,
  token?: string | null,
  userId?: string | null
): Promise<ReferenceImage[]> {
  const params = userId ? `?user_id=${encodeURIComponent(userId)}` : '';
  const response = await fetch(
    `${API_BASE_URL}/prompts/${promptId}/reference-images${params}`,
    {
      method: "GET",
      headers: await getAuthHeaders(token),
    }
  );

  if (!response.ok) {
    await throwApiError(response, "Failed to get reference images");
  }

  const data = await response.json();
  return data.images || [];
}

/**
 * Delete a reference image
 * 
 * @param imageId - Reference image UUID
 * @param token - Clerk JWT session token
 * @param userId - Clerk user ID
 * @throws Error if request fails
 */
export async function deleteReferenceImage(
  imageId: string,
  token?: string | null,
  userId?: string | null
): Promise<void> {
  const params = userId ? `?user_id=${encodeURIComponent(userId)}` : '';
  const response = await fetch(
    `${API_BASE_URL}/reference-images/${imageId}${params}`,
    {
      method: "DELETE",
      headers: await getAuthHeaders(token),
    }
  );

  if (!response.ok) {
    await throwApiError(response, "Failed to delete reference image");
  }
}

// ============================================================================
// Credits API
// ============================================================================

export interface CreditBalanceResponse {
  user_id: string;
  balance_eur: number;
}

export interface CreditsPricingResponse {
  text_model_eur_per_1000_tokens: number;
  veo_video_eur_per_unit: number;
}

export async function getCreditBalance(token?: string | null): Promise<number> {
  const response = await fetch(`${API_BASE_URL}/credits/balance`, {
    method: "GET",
    headers: await getAuthHeaders(token),
  });

  if (!response.ok) {
    await throwApiError(response, "Failed to get credit balance");
  }

  const data: CreditBalanceResponse = await response.json();
  return data.balance_eur;
}

export async function getCreditsPricing(): Promise<CreditsPricingResponse> {
  const response = await fetch(`${API_BASE_URL}/credits/pricing`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });
  if (!response.ok) {
    await throwApiError(response, "Failed to get pricing");
  }
  return response.json();
}

export async function topUpCredits(
  amountEur: number,
  token?: string | null
): Promise<number> {
  const response = await fetch(`${API_BASE_URL}/credits/top-up`, {
    method: "POST",
    headers: await getAuthHeaders(token),
    body: JSON.stringify({
      amount_eur: amountEur,
    }),
  });

  if (!response.ok) {
    await throwApiError(response, "Failed to top up credits");
  }

  const data = (await response.json()) as { balance_eur: number };
  return data.balance_eur;
}

// ============================================================================
// Payments API
// ============================================================================

export type PackageId = "creator" | "growth" | "agency";

export async function createCheckoutSession(
  packageId: PackageId,
  token?: string | null
): Promise<string> {
  const response = await fetch(`${API_BASE_URL}/payments/create-checkout-session`, {
    method: "POST",
    headers: await getAuthHeaders(token),
    body: JSON.stringify({ package_id: packageId }),
  });

  if (!response.ok) {
    await throwApiError(response, "Failed to create checkout session");
  }

  const data = (await response.json()) as { session_url: string };
  return data.session_url;
}

// ============================================================================
// Studio V2 API
// ============================================================================

export interface StudioV2FieldOption {
  value: string;
  label: string;
  description?: string;
}

export interface StudioV2FieldSchema {
  id: string;
  label: string;
  type: "text" | "textarea" | "number" | "select" | "boolean" | "image" | "image_array" | "file" | "video_upload";
  required: boolean;
  default?: unknown;
  group: string;
  help_text?: string;
  options?: StudioV2FieldOption[];
  min?: number;
  max?: number;
  placeholder?: string;
  visible_when?: Record<string, unknown>;
  max_items?: number;
  accepted_mime_types?: string[];
  max_file_size_mb?: number;
}

export interface StudioV2ModelSchema {
  model_id: string;
  label: string;
  media_type: "video" | "image";
  description?: string;
  fields: StudioV2FieldSchema[];
}

export interface StudioV2ModelSummary {
  model_id: string;
  label: string;
  media_type: "video" | "image";
  description?: string;
}

export interface StudioV2VeoGenerateRequest {
  prompt: string;
  negative_prompt?: string;
  model_variant?: string;
  first_frame_image_base64?: string;
  last_frame_image_base64?: string;
  reference_images_base64?: string[];
  aspect_ratio?: "16:9" | "9:16";
  duration_seconds?: 4 | 6 | 8;
  resolution?: "720p" | "1080p" | "4k";
  sample_count?: number;
  seed?: number;
  person_generation?: "allow_adult" | "allow_all" | "disallow";
  generate_audio?: boolean;
}

export interface StudioV2VeoGenerateResponse {
  success: boolean;
  job_id: string;
  message: string;
}

export interface StudioV2JobStatus {
  job_id: string;
  status: "pending" | "processing" | "generating" | "completed" | "failed";
  progress_percentage: number;
  error_message?: string;
  video_url?: string;
  created_at?: string;
  completed_at?: string;
}

export async function getStudioV2Models(
  token?: string | null
): Promise<StudioV2ModelSummary[]> {
  const response = await fetch(`${API_BASE_URL}/studio-v2/models`, {
    method: "GET",
    headers: await getAuthHeaders(token),
  });
  if (!response.ok) {
    await throwApiError(response, "Failed to fetch Studio V2 models");
  }
  return response.json();
}

export async function getStudioV2ModelSchema(
  modelId: string,
  token?: string | null
): Promise<StudioV2ModelSchema> {
  const response = await fetch(`${API_BASE_URL}/studio-v2/models/${modelId}`, {
    method: "GET",
    headers: await getAuthHeaders(token),
  });
  if (!response.ok) {
    await throwApiError(response, "Failed to fetch model schema");
  }
  return response.json();
}

export async function generateStudioV2Veo(
  body: StudioV2VeoGenerateRequest,
  token?: string | null
): Promise<StudioV2VeoGenerateResponse> {
  const response = await fetch(`${API_BASE_URL}/studio-v2/generate/veo`, {
    method: "POST",
    headers: await getAuthHeaders(token),
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    await throwApiError(response, "Failed to start Veo generation");
  }
  return response.json();
}

export interface StudioV2KlingGenerateRequest {
  prompt: string;
  negative_prompt?: string;
  generation_mode?: "text_to_video" | "image_to_video" | "motion_transfer";
  first_frame_image_base64?: string;
  last_frame_image_base64?: string;
  character_image_base64?: string;
  motion_reference_video_base64?: string;
  reference_images_base64?: string[];
  aspect_ratio?: "16:9" | "9:16" | "1:1";
  duration?: number;
  mode?: "std" | "pro";
  generate_audio?: boolean;
}

export interface StudioV2KlingGenerateResponse {
  success: boolean;
  job_id: string;
  message: string;
}

export async function generateStudioV2Kling(
  body: StudioV2KlingGenerateRequest,
  token?: string | null
): Promise<StudioV2KlingGenerateResponse> {
  const response = await fetch(`${API_BASE_URL}/studio-v2/generate/kling`, {
    method: "POST",
    headers: await getAuthHeaders(token),
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    await throwApiError(response, "Failed to start Kling generation");
  }
  return response.json();
}

export async function getStudioV2JobStatus(
  jobId: string,
  token?: string | null
): Promise<StudioV2JobStatus> {
  const response = await fetch(`${API_BASE_URL}/studio-v2/jobs/${jobId}`, {
    method: "GET",
    headers: await getAuthHeaders(token),
  });
  if (!response.ok) {
    await throwApiError(response, "Failed to fetch job status");
  }
  return response.json();
}

// ============================================================================
// Imagen API
// ============================================================================

export interface ImagenGenerateRequest {
  prompt: string;
  model_variant?: string;
  aspect_ratio?: "1:1" | "3:4" | "4:3" | "16:9" | "9:16";
  sample_count?: number;
  enhance_prompt?: boolean;
  person_generation?: "dont_allow" | "allow_adult" | "allow_all";
}

export interface ImagenGeneratedImage {
  bytes_base64_encoded: string;
  mime_type: string;
  enhanced_prompt?: string;
}

export interface ImagenGenerateResponse {
  success: boolean;
  images: ImagenGeneratedImage[];
}

export interface StudioV2ImageInput {
  bytes_base64: string;
  mime_type: string;
  file_name?: string;
}

export interface StudioV2ImageGenerateRequest {
  prompt: string;
  aspect_ratio?: "1:1" | "3:4" | "4:3" | "16:9" | "9:16";
  image_size?: "1K" | "2K" | "4K";
  sample_count?: number;
  reference_images?: StudioV2ImageInput[];
}

export interface StudioV2ImageGenerateResponse {
  success: boolean;
  images: ImagenGeneratedImage[];
}

export async function generateImagenImage(
  body: ImagenGenerateRequest,
  token?: string | null
): Promise<ImagenGenerateResponse> {
  const response = await fetch(`${API_BASE_URL}/studio-v2/imagen/generate`, {
    method: "POST",
    headers: await getAuthHeaders(token),
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    await throwApiError(response, "Failed to generate image");
  }
  return response.json();
}

export async function generateStudioV2Image(
  modelId: string,
  body: StudioV2ImageGenerateRequest,
  token?: string | null
): Promise<StudioV2ImageGenerateResponse> {
  const response = await fetch(`${API_BASE_URL}/studio-v2/generate/image/${modelId}`, {
    method: "POST",
    headers: await getAuthHeaders(token),
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    await throwApiError(response, "Failed to generate image");
  }
  return response.json();
}

/**
 * Download the generated video for a completed Studio V2 job.
 *
 * @param jobId - Full Veo operation name (jobs/{job_id:path} uses this as path, but we pass as query param)
 * @param token - Clerk session token
 * @returns Video content as a Blob (video/mp4), ready for URL.createObjectURL()
 */
export async function downloadStudioV2JobVideo(
  jobId: string,
  token?: string | null
): Promise<Blob> {
  const response = await fetch(
    `${API_BASE_URL}/studio-v2/video?job_id=${encodeURIComponent(jobId)}`,
    {
      method: "GET",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    }
  );
  if (!response.ok) {
    await throwApiError(response, "Failed to download video");
  }
  return response.blob();
}
