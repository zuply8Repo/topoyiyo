"use client";

import React from "react";
import {
  Alert,
  Avatar,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  LinearProgress,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Stack,
  Typography,
} from "@mui/material";
import InstagramIcon from "@mui/icons-material/Instagram";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import { useAuth } from "@clerk/nextjs";
import type { ContentItem, InstagramAccount, ScheduleAssignment } from "@/lib/types";
import {
  getActiveInstagramAccount,
  scheduleInstagramPostsBatch,
  publishToInstagram,
  initInstagramAuth,
  type PublishResponse,
} from "@/lib/instagram";

export interface InstagramScheduleDialogProps {
  open: boolean;
  onClose: () => void;
  userId: string;
  campaignId?: string;
  scheduledItems: ScheduleAssignment[];
  contentItems: ContentItem[];
  onSuccess?: () => void;
}

type ProcessingState = "idle" | "scheduling" | "publishing" | "complete" | "scheduled" | "error";

/**
 * Build a local Date from a YYYY-MM-DD string and HH:MM time string.
 * Avoids the UTC-midnight pitfall of `new Date("YYYY-MM-DD")`.
 */
function toLocalDateTime(dateISO: string, timeStr: string): Date {
  const [year, month, day] = dateISO.split("-").map(Number);
  const [hours, minutes] = timeStr.split(":").map(Number);
  return new Date(year, month - 1, day, hours, minutes, 0, 0);
}

export default function InstagramScheduleDialog({
  open,
  onClose,
  userId,
  campaignId,
  scheduledItems,
  contentItems,
  onSuccess,
}: InstagramScheduleDialogProps) {
  const { getToken } = useAuth();
  const [account, setAccount] = React.useState<InstagramAccount | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [state, setState] = React.useState<ProcessingState>("idle");
  const [error, setError] = React.useState<string | null>(null);
  const [publishResults, setPublishResults] = React.useState<PublishResponse | null>(null);
  const [progress, setProgress] = React.useState(0);

  const contentById = React.useMemo(() => {
    const map = new Map<string, ContentItem>();
    contentItems.forEach((item) => map.set(item.id, item));
    return map;
  }, [contentItems]);

  // Load Instagram account when dialog opens
  React.useEffect(() => {
    if (open) {
      checkAndLoadAccount();
    } else {
      // Reset state when dialog closes
      setState("idle");
      setError(null);
      setPublishResults(null);
      setProgress(0);
    }
  }, [open]);

  const checkAndLoadAccount = async () => {
    try {
      setLoading(true);
      const token = await getToken();
      const activeAccount = await getActiveInstagramAccount(userId, token);
      
      if (!activeAccount) {
        await initiateInstagramAuth();
      } else {
        setAccount(activeAccount);
      }
    } catch (err: unknown) {
      console.error("Failed to check Instagram account:", err);
      setError(err instanceof Error ? err.message : "Failed to check Instagram account");
    } finally {
      setLoading(false);
    }
  };

  const initiateInstagramAuth = async () => {
    try {
      const token = await getToken();
      const { authorization_url, state } = await initInstagramAuth(token);
      
      // Save state and return URL for callback verification
      localStorage.setItem("instagram_oauth_state", state);
      localStorage.setItem("instagram_oauth_return", "schedule_dialog");
      
      // Redirect to Instagram OAuth
      window.location.href = authorization_url;
    } catch (err: unknown) {
      console.error("Failed to initiate Instagram auth:", err);
      setError("Failed to connect to Instagram. Please try again.");
      setLoading(false);
    }
  };

  const loadAccount = async () => {
    try {
      setLoading(true);
      const token = await getToken();
      const activeAccount = await getActiveInstagramAccount(userId, token);
      setAccount(activeAccount);
      
      if (!activeAccount) {
        setError("No Instagram account connected. Please connect an account first.");
      }
    } catch (err: unknown) {
      console.error("Failed to load Instagram account:", err);
      setError(err instanceof Error ? err.message : "Failed to load Instagram account");
    } finally {
      setLoading(false);
    }
  };

  // 5-minute buffer: items due within 5 min of now are treated as "publish immediately"
  const FUTURE_THRESHOLD_MS = 5 * 60 * 1000;

  const classifyItems = () => {
    const cutoff = Date.now() + FUTURE_THRESHOLD_MS;
    const dueNow: typeof scheduledItems = [];
    const future: typeof scheduledItems = [];
    for (const item of scheduledItems) {
      const dt = toLocalDateTime(item.dateISO, item.time);
      if (dt.getTime() <= cutoff) {
        dueNow.push(item);
      } else {
        future.push(item);
      }
    }
    return { dueNow, future };
  };

  const handleScheduleAndPublish = async () => {
    if (!account || scheduledItems.length === 0) return;

    try {
      setState("scheduling");
      setError(null);
      setProgress(0);

      const token = await getToken();
      const { dueNow, future } = classifyItems();

      // Save ALL items to the DB (both future and due-now)
      const allPosts = scheduledItems.map((item) => ({
        content_item_id: item.itemId,
        scheduled_date: item.dateISO,
        scheduled_time: item.time,
        campaign_id: campaignId,
      }));

      const scheduledPosts = await scheduleInstagramPostsBatch(
        { user_id: userId, instagram_account_id: account.id, posts: allPosts },
        token
      );

      setProgress(50);

      if (dueNow.length > 0) {
        // Publish the due-now subset immediately
        setState("publishing");
        const dueNowIds = new Set(dueNow.map((i) => i.itemId));
        const postIdsToPublish = scheduledPosts
          .filter((p) => dueNowIds.has(p.content_item_id))
          .map((p) => p.id);

        const results = await publishToInstagram(postIdsToPublish, userId, token);
        setPublishResults(results);
        setProgress(100);
        setState("complete");

        if (results.succeeded > 0) {
          setTimeout(() => onSuccess?.(), 2000);
        }
      } else {
        // All items are in the future — scheduler will publish them at the right time
        setProgress(100);
        setState("scheduled");
        setTimeout(() => onSuccess?.(), 2000);
      }

      void future; // explicitly acknowledging future items are handled by the scheduler
    } catch (err: unknown) {
      console.error("Failed to schedule and publish:", err);
      setError(err instanceof Error ? err.message : "Failed to schedule and publish");
      setState("error");
    }
  };

  const renderContent = () => {
    if (loading) {
      return (
        <Stack alignItems="center" spacing={2} sx={{ py: 4 }}>
          <CircularProgress />
          <Typography color="text.secondary">
            {!account ? "Connecting to Instagram..." : "Loading Instagram account..."}
          </Typography>
        </Stack>
      );
    }

    if (!account) {
      return (
        <Alert severity="info" sx={{ mb: 2 }}>
          <Stack spacing={2}>
            <Typography variant="body2">
              You need to connect your Instagram Business or Creator account to publish content.
            </Typography>
            <Button
              variant="contained"
              startIcon={<InstagramIcon />}
              onClick={initiateInstagramAuth}
              sx={{
                textTransform: "none",
                bgcolor: "#E4405F",
                "&:hover": {
                  bgcolor: "#C13584",
                },
              }}
            >
              Connect Instagram Account
            </Button>
          </Stack>
        </Alert>
      );
    }

    if (state === "scheduled") {
      const { dueNow, future } = classifyItems();
      return (
        <Stack spacing={2}>
          <Alert severity="success">
            {future.length} {future.length === 1 ? "post has" : "posts have"} been scheduled
            successfully. {dueNow.length > 0 ? `${dueNow.length} post(s) were published immediately.` : ""}
          </Alert>
          <Typography variant="body2" color="text.secondary">
            Your content will be automatically published at the scheduled date and time.
          </Typography>
        </Stack>
      );
    }

    if (state === "complete" && publishResults) {
      return (
        <Stack spacing={3}>
          <Alert severity={publishResults.failed === 0 ? "success" : "warning"}>
            Published {publishResults.succeeded} of {publishResults.total} posts to Instagram
            {publishResults.failed > 0 && ` (${publishResults.failed} failed)`}
          </Alert>

          <List>
            {publishResults.details.map((detail, index) => {
              const content = contentById.get(detail.content_item_id || "");
              const isVideo = content?.assetType === "video";
              const mediaUrl = isVideo ? content?.videoUrl : content?.imageUrl;

              return (
                <React.Fragment key={detail.post_id}>
                  <ListItem>
                    <ListItemAvatar>
                      <Box
                        sx={{
                          position: "relative",
                          width: 48,
                          height: 48,
                          borderRadius: 1,
                          overflow: "hidden",
                        }}
                      >
                        {isVideo && mediaUrl ? (
                          <>
                            <video
                              src={mediaUrl}
                              style={{
                                width: "100%",
                                height: "100%",
                                objectFit: "cover",
                              }}
                            />
                            <Box
                              sx={{
                                position: "absolute",
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                bgcolor: "rgba(0, 0, 0, 0.3)",
                              }}
                            >
                              <PlayArrowIcon sx={{ color: "white", fontSize: 20 }} />
                            </Box>
                          </>
                        ) : (
                          <Box
                            component="img"
                            src={mediaUrl}
                            alt="Content"
                            sx={{
                              width: "100%",
                              height: "100%",
                              objectFit: "cover",
                            }}
                          />
                        )}
                      </Box>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>
                            {content?.caption.substring(0, 50) || "Content"}...
                          </Typography>
                          {detail.success ? (
                            <CheckCircleIcon sx={{ fontSize: 18, color: "success.main" }} />
                          ) : (
                            <ErrorIcon sx={{ fontSize: 18, color: "error.main" }} />
                          )}
                        </Stack>
                      }
                      secondary={
                        detail.success
                          ? detail.permalink
                            ? "Published successfully"
                            : "Scheduled successfully"
                          : detail.error || "Failed to publish"
                      }
                    />
                  </ListItem>
                  {index < publishResults.details.length - 1 && <Divider />}
                </React.Fragment>
              );
            })}
          </List>
        </Stack>
      );
    }

    return (
      <Stack spacing={3}>
        {/* Instagram Account Info */}
        <Stack direction="row" spacing={2} alignItems="center">
          <Avatar
            src={account.profile_picture_url}
            alt={account.instagram_username}
            sx={{ width: 56, height: 56 }}
          >
            <InstagramIcon />
          </Avatar>
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
              @{account.instagram_username}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {account.followers_count.toLocaleString()} followers
            </Typography>
          </Box>
        </Stack>

        <Divider />

        {/* Scheduled Items Preview */}
        <Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1.5 }}>
            Content to Publish ({scheduledItems.length} {scheduledItems.length === 1 ? "post" : "posts"})
          </Typography>
          <List dense>
            {scheduledItems.slice(0, 5).map((item, index) => {
              const content = contentById.get(item.itemId);
              const isVideo = content?.assetType === "video";
              const mediaUrl = isVideo ? content?.videoUrl : content?.imageUrl;

              return (
                <React.Fragment key={item.itemId}>
                  <ListItem>
                    <ListItemAvatar>
                      <Box
                        sx={{
                          position: "relative",
                          width: 40,
                          height: 40,
                          borderRadius: 1,
                          overflow: "hidden",
                        }}
                      >
                        {isVideo && mediaUrl ? (
                          <>
                            <video
                              src={mediaUrl}
                              style={{
                                width: "100%",
                                height: "100%",
                                objectFit: "cover",
                              }}
                            />
                            <Box
                              sx={{
                                position: "absolute",
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                bgcolor: "rgba(0, 0, 0, 0.3)",
                              }}
                            >
                              <PlayArrowIcon sx={{ color: "white", fontSize: 16 }} />
                            </Box>
                          </>
                        ) : (
                          <Box
                            component="img"
                            src={mediaUrl}
                            alt="Content"
                            sx={{
                              width: "100%",
                              height: "100%",
                              objectFit: "cover",
                            }}
                          />
                        )}
                      </Box>
                    </ListItemAvatar>
                    <ListItemText
                      primary={content?.caption.substring(0, 40) || "Content"}
                      secondary={`${item.dateISO} at ${item.time}`}
                    />
                  </ListItem>
                  {index < Math.min(scheduledItems.length, 5) - 1 && <Divider />}
                </React.Fragment>
              );
            })}
            {scheduledItems.length > 5 && (
              <ListItem>
                <ListItemText
                  primary={`... and ${scheduledItems.length - 5} more`}
                  sx={{ textAlign: "center" }}
                />
              </ListItem>
            )}
          </List>
        </Box>

        {error && <Alert severity="error">{error}</Alert>}

        {state === "scheduling" && (
          <Stack spacing={1}>
            <Typography variant="body2" color="text.secondary">
              Scheduling posts...
            </Typography>
            <LinearProgress variant="determinate" value={progress} />
          </Stack>
        )}

        {state === "publishing" && (
          <Stack spacing={1}>
            <Typography variant="body2" color="text.secondary">
              Publishing to Instagram...
            </Typography>
            <LinearProgress variant="determinate" value={progress} />
          </Stack>
        )}
      </Stack>
    );
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Stack direction="row" spacing={1} alignItems="center">
          <InstagramIcon sx={{ color: "#E4405F" }} />
          <Typography variant="h6" sx={{ fontWeight: 800 }}>
            Publish to Instagram
          </Typography>
        </Stack>
      </DialogTitle>
      <DialogContent>{renderContent()}</DialogContent>
      <DialogActions>
        {state === "complete" || state === "scheduled" ? (
          <Button
            onClick={onClose}
            variant="contained"
            sx={{ textTransform: "none" }}
          >
            Done
          </Button>
        ) : (
          <>
            <Button
              onClick={onClose}
              disabled={state === "scheduling" || state === "publishing"}
              sx={{ textTransform: "none" }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleScheduleAndPublish}
              variant="contained"
              disabled={
                !account ||
                scheduledItems.length === 0 ||
                state === "scheduling" ||
                state === "publishing"
              }
              sx={{
                textTransform: "none",
                bgcolor: "#E4405F",
                "&:hover": {
                  bgcolor: "#C13584",
                },
              }}
            >
              {state === "scheduling" || state === "publishing" ? (
                "Processing..."
              ) : (() => {
                const cutoff = Date.now() + FUTURE_THRESHOLD_MS;
                const allFuture = scheduledItems.every(
                  (i) => toLocalDateTime(i.dateISO, i.time).getTime() > cutoff
                );
                const anyFuture = scheduledItems.some(
                  (i) => toLocalDateTime(i.dateISO, i.time).getTime() > cutoff
                );
                return allFuture
                  ? "Schedule for Later"
                  : anyFuture
                  ? "Schedule & Publish"
                  : "Publish Now";
              })()}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}
