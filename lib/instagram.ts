/**
 * Instagram API Client
 * Handles Instagram account connection, scheduling, and publishing.
 */

import type { InstagramAccount, InstagramScheduledPost } from "./types";
export type { InstagramAccount, InstagramScheduledPost } from "./types";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

// ============================================================================
// Authentication
// ============================================================================

export interface InitAuthResponse {
  authorization_url: string;
  state: string;
}

export interface CompleteAuthResponse {
  success: boolean;
  account_id: string;
  instagram_username: string;
  message: string;
}

/**
 * Initialize Instagram OAuth flow
 * 
 * @returns Authorization URL and state token
 * @throws Error if request fails
 */
export async function initInstagramAuth(): Promise<InitAuthResponse> {
  const response = await fetch(`${API_BASE_URL}/instagram/auth/init`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || "Failed to initialize Instagram auth");
  }

  return response.json();
}

/**
 * Complete Instagram OAuth flow
 * 
 * @param code - Authorization code from OAuth callback
 * @param state - State token for CSRF protection
 * @param userId - User ID
 * @returns Account connection response
 * @throws Error if request fails
 */
export async function completeInstagramAuth(
  code: string,
  state: string,
  userId: string
): Promise<CompleteAuthResponse> {
  const response = await fetch(`${API_BASE_URL}/instagram/auth/callback`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ code, state, user_id: userId }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || "Failed to complete Instagram auth");
  }

  return response.json();
}

// ============================================================================
// Account Management
// ============================================================================

export interface ListAccountsResponse {
  success: boolean;
  accounts: InstagramAccount[];
}

/**
 * List all connected Instagram accounts for a user
 * 
 * @param userId - User ID
 * @returns List of Instagram accounts
 * @throws Error if request fails
 */
export async function listInstagramAccounts(
  userId: string
): Promise<InstagramAccount[]> {
  const response = await fetch(
    `${API_BASE_URL}/instagram/accounts?user_id=${userId}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || "Failed to list Instagram accounts");
  }

  const data: ListAccountsResponse = await response.json();
  return data.accounts;
}

/**
 * Get active Instagram account for a user
 * 
 * @param userId - User ID
 * @returns Active Instagram account or null
 * @throws Error if request fails
 */
export async function getActiveInstagramAccount(
  userId: string
): Promise<InstagramAccount | null> {
  const response = await fetch(
    `${API_BASE_URL}/instagram/accounts/active?user_id=${userId}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    }
  );

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || "Failed to get active Instagram account");
  }

  return response.json();
}

/**
 * Disconnect an Instagram account
 * 
 * @param accountId - Instagram account ID
 * @throws Error if request fails
 */
export async function disconnectInstagramAccount(
  accountId: string
): Promise<void> {
  const response = await fetch(
    `${API_BASE_URL}/instagram/accounts/${accountId}`,
    {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || "Failed to disconnect Instagram account");
  }
}

// ============================================================================
// Scheduling
// ============================================================================

export interface SchedulePostRequest {
  user_id: string;
  content_item_id: string;
  instagram_account_id?: string;
  scheduled_date: string; // YYYY-MM-DD
  scheduled_time: string; // HH:MM
  campaign_id?: string;
}

export interface ScheduleBatchRequest {
  user_id: string;
  instagram_account_id?: string;
  posts: Array<{
    content_item_id: string;
    scheduled_date: string;
    scheduled_time: string;
    campaign_id?: string;
  }>;
}

export interface ListScheduledPostsResponse {
  success: boolean;
  posts: InstagramScheduledPost[];
  total: number;
}

/**
 * Schedule a single post to Instagram
 * 
 * @param request - Schedule post request
 * @returns Scheduled post
 * @throws Error if request fails
 */
export async function scheduleInstagramPost(
  request: SchedulePostRequest
): Promise<InstagramScheduledPost> {
  const response = await fetch(`${API_BASE_URL}/instagram/schedule`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || "Failed to schedule Instagram post");
  }

  return response.json();
}

/**
 * Schedule multiple posts at once
 * 
 * @param request - Batch schedule request
 * @returns List of scheduled posts
 * @throws Error if request fails
 */
export async function scheduleInstagramPostsBatch(
  request: ScheduleBatchRequest
): Promise<InstagramScheduledPost[]> {
  const response = await fetch(`${API_BASE_URL}/instagram/schedule/batch`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || "Failed to schedule Instagram posts");
  }

  const data: ListScheduledPostsResponse = await response.json();
  return data.posts;
}

/**
 * List scheduled posts for a user
 * 
 * @param userId - User ID
 * @param status - Optional filter by status
 * @param campaignId - Optional filter by campaign
 * @returns List of scheduled posts
 * @throws Error if request fails
 */
export async function listScheduledPosts(
  userId: string,
  status?: string,
  campaignId?: string
): Promise<InstagramScheduledPost[]> {
  const params = new URLSearchParams({ user_id: userId });
  if (status) params.append("status", status);
  if (campaignId) params.append("campaign_id", campaignId);

  const response = await fetch(
    `${API_BASE_URL}/instagram/schedule?${params.toString()}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || "Failed to list scheduled posts");
  }

  const data: ListScheduledPostsResponse = await response.json();
  return data.posts;
}

/**
 * Update scheduled post date/time
 * 
 * @param postId - Scheduled post ID
 * @param scheduledDate - New date (YYYY-MM-DD)
 * @param scheduledTime - New time (HH:MM)
 * @returns Updated scheduled post
 * @throws Error if request fails
 */
export async function updateScheduledPost(
  postId: string,
  scheduledDate: string,
  scheduledTime: string
): Promise<InstagramScheduledPost> {
  const response = await fetch(
    `${API_BASE_URL}/instagram/schedule/${postId}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ scheduled_date: scheduledDate, scheduled_time: scheduledTime }),
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || "Failed to update scheduled post");
  }

  return response.json();
}

/**
 * Cancel a scheduled post
 * 
 * @param postId - Scheduled post ID
 * @throws Error if request fails
 */
export async function cancelScheduledPost(postId: string): Promise<void> {
  const response = await fetch(
    `${API_BASE_URL}/instagram/schedule/${postId}`,
    {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || "Failed to cancel scheduled post");
  }
}

// ============================================================================
// Publishing
// ============================================================================

export interface PublishResponse {
  success: boolean;
  total: number;
  succeeded: number;
  failed: number;
  details: Array<{
    post_id: string;
    content_item_id?: string;
    success: boolean;
    media_id?: string;
    permalink?: string;
    error?: string;
  }>;
}

/**
 * Publish scheduled posts to Instagram immediately
 * 
 * @param scheduledPostIds - List of scheduled post IDs
 * @param userId - User ID
 * @returns Publishing results
 * @throws Error if request fails
 */
export async function publishToInstagram(
  scheduledPostIds: string[],
  userId: string
): Promise<PublishResponse> {
  const response = await fetch(`${API_BASE_URL}/instagram/publish`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      user_id: userId,
      scheduled_post_ids: scheduledPostIds,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || "Failed to publish to Instagram");
  }

  return response.json();
}

/**
 * Get status of a scheduled post
 * 
 * @param postId - Scheduled post ID
 * @returns Scheduled post with current status
 * @throws Error if request fails
 */
export async function getScheduledPostStatus(
  postId: string
): Promise<InstagramScheduledPost> {
  const response = await fetch(
    `${API_BASE_URL}/instagram/schedule/${postId}/status`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || "Failed to get post status");
  }

  return response.json();
}
