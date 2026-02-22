"use client";

export const dynamic = 'force-dynamic';

import TimeSelectDialog from "@/components/TimeSelectDialog";
import InstagramScheduleDialog from "@/components/InstagramScheduleDialog";
import {
  getSchedule,
  removeSchedule,
  setScheduleOrderForDate,
  upsertSchedule,
} from "@/lib/store";
import {
  getActiveCampaign,
  fetchAllUserContent,
  listUserCampaigns,
  type Campaign,
} from "@/lib/api";
import { getMonthGrid } from "@/lib/monthGrid";
import type { ContentItem, ScheduleAssignment } from "@/lib/types";
import { SignedIn, useAuth } from "@clerk/nextjs";
import { useSearchParams } from "next/navigation";
import ClearIcon from "@mui/icons-material/Clear";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import InstagramIcon from "@mui/icons-material/Instagram";
import InstagramStatusBadge from "@/components/InstagramStatusBadge";
import { listScheduledPosts, type InstagramScheduledPost } from "@/lib/instagram";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  IconButton,
  Paper,
  Snackbar,
  Stack,
  Typography,
} from "@mui/material";
import React, { Suspense } from "react";

function byTime(a: ScheduleAssignment, b: ScheduleAssignment) {
  const ao = a.order ?? 0;
  const bo = b.order ?? 0;
  if (ao !== bo) return ao - bo;
  return a.time.localeCompare(b.time);
}

function DashboardLoadingFallback() {
  return (
    <Stack spacing={2.5} alignItems="center" justifyContent="center" sx={{ minHeight: 400 }}>
      <CircularProgress />
      <Typography color="text.secondary">Loading dashboard...</Typography>
    </Stack>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardLoadingFallback />}>
      <SignedIn>
        <DashboardContent />
      </SignedIn>
    </Suspense>
  );
}

function DashboardContent() {
  const { userId, isLoaded, getToken } = useAuth();
  const searchParams = useSearchParams();

  const [campaign, setCampaign] = React.useState<Campaign | null>(null);
  const [campaigns, setCampaigns] = React.useState<Campaign[]>([]);
  const [contentItems, setContentItems] = React.useState<ContentItem[]>([]);
  const [schedule, setSchedule] = React.useState<ScheduleAssignment[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [toast, setToast] = React.useState<string | null>(null);
  const [instagramPosts, setInstagramPosts] = React.useState<InstagramScheduledPost[]>([]);

  const today = React.useMemo(() => new Date(), []);
  const [year, setYear] = React.useState(today.getFullYear());
  const [month, setMonth] = React.useState(today.getMonth());

  const [dropTarget, setDropTarget] = React.useState<{
    itemId: string;
    dateISO: string;
  } | null>(null);

  const [dragging, setDragging] = React.useState<{
    itemId: string;
    source: "approved" | "scheduled";
  } | null>(null);
  const [hoverDateISO, setHoverDateISO] = React.useState<string | null>(null);
  const [instagramDialogOpen, setInstagramDialogOpen] = React.useState(false);

  // Load active campaign and its content
  const loadCampaignContent = React.useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setLoadError(null);
      const token = await getToken();

      // Get active campaign (for header display)
      const activeCampaign = await getActiveCampaign(token ?? undefined);
      setCampaign(activeCampaign);

      // Fetch ALL user campaigns (to map campaign IDs to names)
      const allCampaigns = await listUserCampaigns(50, token ?? undefined);
      setCampaigns(allCampaigns);

      // Fetch ALL content items across all campaigns
      const allContent = await fetchAllUserContent(undefined, 100, token ?? undefined);
      setContentItems(allContent);

      // Load schedule (still from localStorage for now)
      setSchedule(getSchedule(userId));

      // Load Instagram scheduled posts
      try {
        const igPosts = await listScheduledPosts(userId);
        setInstagramPosts(igPosts);
      } catch (error) {
        console.error("Failed to load Instagram posts:", error);
        // Not critical, continue without Instagram data
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load content";
      console.error("Failed to load campaign content:", error);
      setLoadError(message);
      setContentItems([]);
      setToast(message);
    } finally {
      setLoading(false);
    }
  }, [userId, getToken]);

  const refresh = React.useCallback(() => {
    loadCampaignContent();
  }, [loadCampaignContent]);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  // Handle Instagram OAuth callback return
  React.useEffect(() => {
    const instagramConnected = searchParams.get("instagram_connected");
    const instagramError = searchParams.get("instagram_error");

    if (instagramConnected === "true") {
      // User just connected Instagram, show success toast and reopen dialog
      setToast("Instagram account connected successfully!");
      
      // Refresh to load the new account data
      refresh();
      
      // Reopen the Instagram dialog after a brief delay
      setTimeout(() => {
        if (schedule.length > 0) {
          setInstagramDialogOpen(true);
        }
      }, 500);

      // Clean up URL
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete("instagram_connected");
      window.history.replaceState({}, "", newUrl.toString());
    }

    if (instagramError === "true") {
      setToast("Failed to connect Instagram account. Please try again.");
      
      // Clean up URL
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete("instagram_error");
      window.history.replaceState({}, "", newUrl.toString());
    }
  }, [searchParams, schedule, refresh]);

  const itemsById = React.useMemo(() => {
    const m = new Map<string, ContentItem>();
    for (const i of contentItems) m.set(i.id, i);
    return m;
  }, [contentItems]);

  const campaignsById = React.useMemo(() => {
    const m = new Map<string, Campaign>();
    for (const c of campaigns) m.set(c.id, c);
    return m;
  }, [campaigns]);

  const assignmentByItemId = React.useMemo(() => {
    const m = new Map<string, ScheduleAssignment>();
    for (const a of schedule) m.set(a.itemId, a);
    return m;
  }, [schedule]);

  const assignmentsByDate = React.useMemo(() => {
    const m = new Map<string, ScheduleAssignment[]>();
    for (const a of schedule) {
      const list = m.get(a.dateISO) ?? [];
      list.push(a);
      m.set(a.dateISO, list);
    }
    for (const [k, v] of m) m.set(k, v.sort(byTime));
    return m;
  }, [schedule]);

  const instagramPostByContentId = React.useMemo(() => {
    const m = new Map<string, InstagramScheduledPost>();
    for (const p of instagramPosts) {
      m.set(p.content_item_id, p);
    }
    return m;
  }, [instagramPosts]);

  const monthCells = React.useMemo(
    () => getMonthGrid(year, month),
    [year, month]
  );
  const monthLabel = React.useMemo(() => {
    const d = new Date(year, month, 1);
    return d.toLocaleString(undefined, { month: "long", year: "numeric" });
  }, [year, month]);

  const getDropContextFromPoint = React.useCallback((x: number, y: number) => {
    const el = document.elementFromPoint(x, y) as HTMLElement | null;
    if (!el) return null;

    const dayEl = el.closest?.("[data-cb-day]") as HTMLElement | null;
    const dateISO = dayEl?.dataset.dateiso ?? null;
    if (!dateISO) return null;

    const scheduledEl = el.closest?.(
      "[data-cb-scheduled]"
    ) as HTMLElement | null;
    const targetItemId = scheduledEl?.dataset.itemid ?? null;

    return { dateISO, targetItemId };
  }, []);

  const onPointerDownDrag =
    (itemId: string, source: "approved" | "scheduled") =>
    (e: React.PointerEvent) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      // Prevent page scrolling while dragging on touch.
      e.preventDefault();
      setDragging({ itemId, source });
      setHoverDateISO(null);
      (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    };

  const onPointerMoveDrag = (e: React.PointerEvent) => {
    if (!dragging) return;
    const ctx = getDropContextFromPoint(e.clientX, e.clientY);
    setHoverDateISO(ctx?.dateISO ?? null);
  };

  const onPointerUpDrag = (e: React.PointerEvent) => {
    if (!dragging) return;
    if (!userId) return;
    const ctx = getDropContextFromPoint(e.clientX, e.clientY);
    const dropDateISO = ctx?.dateISO ?? null;
    const targetItemId = ctx?.targetItemId ?? null;

    const draggingItemId = dragging.itemId;
    const fromAssignment = assignmentByItemId.get(draggingItemId);
    const fromDateISO = fromAssignment?.dateISO ?? null;

    // Reorder within the same day (no time dialog).
    if (dropDateISO && fromDateISO && dropDateISO === fromDateISO) {
      const currentIds = (assignmentsByDate.get(dropDateISO) ?? []).map(
        (a) => a.itemId
      );
      const nextIds = currentIds.filter((id) => id !== draggingItemId);
      const idx = targetItemId ? nextIds.indexOf(targetItemId) : -1;
      if (idx >= 0) nextIds.splice(idx, 0, draggingItemId);
      else nextIds.push(draggingItemId);
      setScheduleOrderForDate(dropDateISO, nextIds, userId);
      refresh();
      setToast("Reordered (stub).");
      setDragging(null);
      setHoverDateISO(null);
      return;
    }

    // Schedule / move to another day (time selection).
    if (dropDateISO) {
      setDropTarget({ itemId: draggingItemId, dateISO: dropDateISO });
    }

    setDragging(null);
    setHoverDateISO(null);
  };

  if (!isLoaded) {
    return (
      <Stack spacing={2.5} alignItems="center" justifyContent="center" sx={{ minHeight: 400 }}>
        <CircularProgress />
        <Typography color="text.secondary">Loading...</Typography>
      </Stack>
    );
  }

  if (!userId) {
    return (
      <Stack spacing={2.5} alignItems="center" justifyContent="center" sx={{ minHeight: 400 }}>
        <Typography color="text.secondary">Please sign in to continue.</Typography>
      </Stack>
    );
  }

  if (loading && !loadError) {
    return (
      <Stack spacing={2.5} alignItems="center" justifyContent="center" sx={{ minHeight: 400 }}>
        <CircularProgress />
        <Typography color="text.secondary">Loading dashboard...</Typography>
      </Stack>
    );
  }

  if (loadError) {
    return (
      <Stack spacing={2.5} alignItems="center" justifyContent="center" sx={{ minHeight: 400 }}>
        <Alert severity="error" sx={{ maxWidth: 400 }}>
          {loadError}
        </Alert>
        <Button variant="contained" onClick={refresh} sx={{ textTransform: "none", borderRadius: 999 }}>
          Retry
        </Button>
      </Stack>
    );
  }

  return (
    <Stack spacing={2.5}>
      <Stack spacing={0.25}>
        <Typography variant="h5" sx={{ fontWeight: 900 }}>
          Dashboard
        </Typography>
        <Typography color="text.secondary">
          Drag content items onto the calendar to schedule by day/time.
        </Typography>
      </Stack>

      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1.5}
        alignItems={{ sm: "center" }}
        justifyContent="flex-end"
      >
        <Button
          startIcon={<InstagramIcon />}
          variant="contained"
          onClick={() => {
            if (schedule.length === 0) {
              setToast("No content scheduled. Drag content to calendar first.");
              return;
            }
            setInstagramDialogOpen(true);
          }}
          disabled={schedule.length === 0}
          sx={{
            textTransform: "none",
            borderRadius: 999,
            fontWeight: 800,
            bgcolor: "#E4405F",
            "&:hover": {
              bgcolor: "#C13584",
            },
          }}
        >
          Publish to Instagram ({schedule.length})
        </Button>
      </Stack>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "360px 1fr" },
          gap: 2,
          alignItems: "start",
        }}
      >
        {/* Left: content library */}
        <Paper
          variant="outlined"
          sx={{ borderRadius: 4, borderColor: "divider", overflow: "hidden" }}
        >
          <Box sx={{ p: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 900 }}>
              Content Library
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Drag images or videos to schedule them on the calendar.
            </Typography>
          </Box>
          <Divider />
          <Stack 
            spacing={1} 
            sx={{ 
              p: 2,
              maxHeight: 'calc(100vh - 200px)',
              overflowY: 'auto',
              overflowX: 'hidden',
              scrollBehavior: 'smooth',
              '&::-webkit-scrollbar': {
                width: '8px',
              },
              '&::-webkit-scrollbar-track': {
                backgroundColor: 'transparent',
              },
              '&::-webkit-scrollbar-thumb': {
                backgroundColor: 'rgba(0, 0, 0, 0.2)',
                borderRadius: '4px',
                '&:hover': {
                  backgroundColor: 'rgba(0, 0, 0, 0.3)',
                },
              },
            }}
          >
            {contentItems.length === 0 ? (
              <Typography color="text.secondary">
                No content yet — generated content will appear here.
              </Typography>
            ) : (
              contentItems.map((it) => {
                const assignment = assignmentByItemId.get(it.id);
                const mediaUrl = it.assetType === "video" ? it.videoUrl : it.imageUrl;
                const statusColor = it.status === "approved" ? "success" : it.status === "rejected" ? "error" : "default";
                
                const igPost = instagramPostByContentId.get(it.id);
                
                // Get campaign name if available
                const itemCampaign = it.campaignId ? campaignsById.get(it.campaignId) : null;
                const campaignName = itemCampaign?.campaign_name || "Unknown Campaign";
                
                // Determine campaign badge color
                const isActiveCampaign = campaign && it.campaignId === campaign.id;
                const campaignBadgeColor = isActiveCampaign ? "#FF9800" : "#9C27B0"; // Orange for active, Purple for others

                return (
                  <Paper
                    key={it.id}
                    variant="outlined"
                    onPointerDown={onPointerDownDrag(it.id, "approved")}
                    onPointerMove={onPointerMoveDrag}
                    onPointerUp={onPointerUpDrag}
                    sx={{
                      borderRadius: 3,
                      borderColor: "divider",
                      p: 1.25,
                      cursor: "grab",
                      touchAction: "none",
                      opacity: dragging?.itemId === it.id ? 0.65 : 1,
                      "&:active": { cursor: "grabbing" },
                    }}
                  >
                    <Stack spacing={0.75}>
                      <Stack direction="row" spacing={1.25} alignItems="center">
                        <Box
                          sx={{
                            position: "relative",
                            width: 44,
                            height: 44,
                            borderRadius: 2,
                            overflow: "hidden",
                            flex: "0 0 auto",
                          }}
                        >
                          {it.assetType === "video" && it.videoUrl ? (
                            <>
                              <video
                                src={it.videoUrl}
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
                                <PlayArrowIcon
                                  sx={{ color: "white", fontSize: 20 }}
                                />
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
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mb: 0.25 }}>
                            <Typography
                              variant="body2"
                              sx={{ fontWeight: 800 }}
                              noWrap
                            >
                              {it.assetType === "video" ? "Video" : "Image"}
                            </Typography>
                            <Chip
                              size="small"
                              label={it.status}
                              color={statusColor}
                              sx={{ height: 18, fontSize: "0.65rem", textTransform: "capitalize" }}
                            />
                          </Stack>
                          <Box sx={{ mb: 0.25 }}>
                            <Chip
                              label={campaignName}
                              size="small"
                              sx={{
                                bgcolor: campaignBadgeColor,
                                color: "white",
                                fontWeight: 600,
                                height: 20,
                                fontSize: "0.65rem",
                                maxWidth: "100%",
                                "& .MuiChip-label": {
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                  px: 0.75,
                                },
                              }}
                            />
                          </Box>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{
                              display: "-webkit-box",
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: "vertical",
                              overflow: "hidden",
                              wordBreak: "break-word",
                            }}
                          >
                            {it.caption}
                          </Typography>
                        </Box>
                        {!assignment && (
                          <Chip
                            size="small"
                            label="Unscheduled"
                            variant="outlined"
                          />
                        )}
                      </Stack>
                      {igPost && (
                        <Box sx={{ pl: 0.5 }}>
                          <InstagramStatusBadge
                            status={igPost.publish_status}
                            permalink={igPost.instagram_permalink}
                            errorMessage={igPost.error_message}
                            size="small"
                          />
                        </Box>
                      )}
                    </Stack>
                  </Paper>
                );
              })
            )}
          </Stack>
        </Paper>

        {/* Right: calendar */}
        <Paper
          variant="outlined"
          sx={{ borderRadius: 4, borderColor: "divider", p: 2 }}
        >
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1.25}
            alignItems={{ sm: "center" }}
          >
            <Typography variant="subtitle1" sx={{ fontWeight: 900, flex: 1 }}>
              {monthLabel}
            </Typography>
            <Stack direction="row" spacing={1}>
              <Button
                variant="outlined"
                size="small"
                onClick={() => {
                  const d = new Date(year, month - 1, 1);
                  setYear(d.getFullYear());
                  setMonth(d.getMonth());
                }}
                sx={{ textTransform: "none", borderRadius: 999 }}
              >
                Prev
              </Button>
              <Button
                variant="outlined"
                size="small"
                onClick={() => {
                  const d = new Date(year, month + 1, 1);
                  setYear(d.getFullYear());
                  setMonth(d.getMonth());
                }}
                sx={{ textTransform: "none", borderRadius: 999 }}
              >
                Next
              </Button>
            </Stack>
          </Stack>

          <Box
            sx={{
              mt: 2,
              display: "grid",
              // minmax(0, 1fr) is critical for equal-width columns when children have long content.
              gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
              gap: 1,
            }}
          >
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <Box key={d} sx={{ px: 1, py: 0.5, minWidth: 0 }}>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ fontWeight: 800 }}
                >
                  {d}
                </Typography>
              </Box>
            ))}

            {monthCells.map((c) => {
              const dayAssignments = assignmentsByDate.get(c.dateISO) ?? [];
              return (
                <Paper
                  key={c.dateISO}
                  variant="outlined"
                  data-cb-day
                  data-dateiso={c.dateISO}
                  sx={{
                    minHeight: 128,
                    borderRadius: 3,
                    borderColor: "divider",
                    p: 1,
                    minWidth: 0,
                    overflow: "hidden",
                    opacity: c.inMonth ? 1 : 0.55,
                    bgcolor: c.inMonth ? "background.paper" : "grey.50",
                    outline: "2px solid",
                    outlineColor:
                      dragging && hoverDateISO === c.dateISO
                        ? "primary.main"
                        : "transparent",
                  }}
                >
                  <Stack spacing={0.75}>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ fontWeight: 900 }}
                    >
                      {c.date.getDate()}
                    </Typography>
                    <Stack
                      spacing={0.5}
                      sx={{
                        minWidth: 0,
                        // Scroll inside the day cell when multiple items are scheduled.
                        maxHeight: { xs: 78, sm: 90 },
                        overflowY:
                          dayAssignments.length > 2 ? "auto" : "visible",
                        overflowX: "hidden",
                        pr: dayAssignments.length > 2 ? 0.25 : 0,
                      }}
                    >
                      {dayAssignments.map((a) => {
                        const item = itemsById.get(a.itemId);
                        const title = item?.caption ?? a.itemId;
                        const isVideo = item?.assetType === "video";
                        const mediaUrl = isVideo ? item?.videoUrl : item?.imageUrl;
                        const thumb = mediaUrl ?? "https://picsum.photos/seed/contentbeaver/200/200";

                        return (
                          <Box
                            key={a.itemId}
                            data-cb-scheduled
                            data-itemid={a.itemId}
                            onPointerDown={onPointerDownDrag(
                              a.itemId,
                              "scheduled"
                            )}
                            onPointerMove={onPointerMoveDrag}
                            onPointerUp={onPointerUpDrag}
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 0.75,
                              border: "1px solid",
                              borderColor: "divider",
                              borderRadius: 2,
                              px: 0.75,
                              py: 0.5,
                              minWidth: 0,
                              bgcolor: "background.paper",
                              cursor: "grab",
                              touchAction: "none",
                              opacity: dragging?.itemId === a.itemId ? 0.65 : 1,
                              "&:active": { cursor: "grabbing" },
                            }}
                          >
                            <Box
                              sx={{
                                position: "relative",
                                width: 22,
                                height: 22,
                                borderRadius: 1,
                                overflow: "hidden",
                                flex: "0 0 auto",
                              }}
                            >
                              {isVideo ? (
                                <>
                                  <video
                                    src={thumb}
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
                                    <PlayArrowIcon
                                      sx={{ color: "white", fontSize: 12 }}
                                    />
                                  </Box>
                                </>
                              ) : (
                                <Box
                                  component="img"
                                  src={thumb}
                                  alt="Scheduled"
                                  sx={{
                                    width: "100%",
                                    height: "100%",
                                    objectFit: "cover",
                                  }}
                                />
                              )}
                            </Box>
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                              <Typography
                                variant="caption"
                                sx={{ fontWeight: 900, lineHeight: 1.2 }}
                                noWrap
                              >
                                {a.time}
                              </Typography>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                                sx={{ lineHeight: 1.2 }}
                                noWrap
                              >
                                {title}
                              </Typography>
                            </Box>
                            <IconButton
                              size="small"
                              aria-label="Remove schedule"
                              onPointerDown={(ev) => {
                                ev.stopPropagation();
                              }}
                              onClick={(ev) => {
                                ev.stopPropagation();
                                removeSchedule(a.itemId, userId);
                                refresh();
                                setToast("Content unscheduled.");
                              }}
                              sx={{ flex: "0 0 auto" }}
                            >
                              <ClearIcon fontSize="small" />
                            </IconButton>
                          </Box>
                        );
                      })}
                    </Stack>
                  </Stack>
                </Paper>
              );
            })}
          </Box>
        </Paper>
      </Box>

      <TimeSelectDialog
        open={Boolean(dropTarget)}
        dateISO={dropTarget?.dateISO ?? null}
        itemId={dropTarget?.itemId ?? null}
        onCancel={() => setDropTarget(null)}
        onConfirm={(time) => {
          if (!dropTarget) return;
          upsertSchedule(dropTarget.itemId, dropTarget.dateISO, time, userId);
          setDropTarget(null);
          refresh();
          setToast("Content scheduled to calendar.");
        }}
      />

      <InstagramScheduleDialog
        open={instagramDialogOpen}
        onClose={() => setInstagramDialogOpen(false)}
        userId={userId || ""}
        campaignId={campaign?.id}
        scheduledItems={schedule}
        contentItems={contentItems}
        onSuccess={() => {
          setInstagramDialogOpen(false);
          setToast("Successfully published to Instagram!");
          refresh();
        }}
      />

      {toast ? (
        <Snackbar
          open
          autoHideDuration={2600}
          onClose={() => setToast(null)}
          anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        >
          <Alert
            onClose={() => setToast(null)}
            severity="info"
            sx={{ width: "100%" }}
          >
            {toast}
          </Alert>
        </Snackbar>
      ) : null}
    </Stack>
  );
}
