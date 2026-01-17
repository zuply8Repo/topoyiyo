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

type ProcessingState = "idle" | "scheduling" | "publishing" | "complete" | "error";

export default function InstagramScheduleDialog({
  open,
  onClose,
  userId,
  campaignId,
  scheduledItems,
  contentItems,
  onSuccess,
}: InstagramScheduleDialogProps) {
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
      const activeAccount = await getActiveInstagramAccount(userId);
      
      if (!activeAccount) {
        // No account connected - trigger OAuth flow
        await initiateInstagramAuth();
      } else {
        setAccount(activeAccount);
      }
    } catch (err: any) {
      console.error("Failed to check Instagram account:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const initiateInstagramAuth = async () => {
    try {
      const { authorization_url, state } = await initInstagramAuth();
      
      // Save state and return URL for callback verification
      localStorage.setItem("instagram_oauth_state", state);
      localStorage.setItem("instagram_oauth_return", "schedule_dialog");
      
      // Redirect to Instagram OAuth
      window.location.href = authorization_url;
    } catch (err: any) {
      console.error("Failed to initiate Instagram auth:", err);
      setError("Failed to connect to Instagram. Please try again.");
      setLoading(false);
    }
  };

  const loadAccount = async () => {
    try {
      setLoading(true);
      const activeAccount = await getActiveInstagramAccount(userId);
      setAccount(activeAccount);
      
      if (!activeAccount) {
        setError("No Instagram account connected. Please connect an account first.");
      }
    } catch (err: any) {
      console.error("Failed to load Instagram account:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleScheduleAndPublish = async () => {
    if (!account || scheduledItems.length === 0) return;

    try {
      setState("scheduling");
      setError(null);
      setProgress(0);

      // Prepare posts for batch scheduling
      const posts = scheduledItems.map((item) => ({
        content_item_id: item.itemId,
        scheduled_date: item.dateISO,
        scheduled_time: item.time,
        campaign_id: campaignId,
      }));

      // Schedule to database
      const scheduledPosts = await scheduleInstagramPostsBatch({
        user_id: userId,
        instagram_account_id: account.id,
        posts,
      });

      setProgress(50);
      setState("publishing");

      // Publish immediately to Instagram
      const postIds = scheduledPosts.map((p) => p.id);
      const results = await publishToInstagram(postIds, userId);

      setPublishResults(results);
      setProgress(100);
      setState("complete");

      // Call success callback after a short delay to show results
      if (results.succeeded > 0) {
        setTimeout(() => {
          onSuccess?.();
        }, 2000);
      }
    } catch (err: any) {
      console.error("Failed to schedule and publish:", err);
      setError(err.message);
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
        {state === "complete" ? (
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
              {state === "scheduling" || state === "publishing"
                ? "Publishing..."
                : "Publish Now"}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}
