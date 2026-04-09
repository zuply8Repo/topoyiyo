"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogContent,
  IconButton,
  LinearProgress,
  Popover,
  Stack,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBackIosNew";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import DownloadIcon from "@mui/icons-material/Download";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import StopIcon from "@mui/icons-material/Stop";
import VideoFileIcon from "@mui/icons-material/VideoFile";
import VolumeOffIcon from "@mui/icons-material/VolumeOff";
import VolumeUpIcon from "@mui/icons-material/VolumeUp";
import CloseIcon from "@mui/icons-material/Close";
import { downloadStudioV2JobVideo } from "@/lib/api";
import type { SavedJob } from "@/app/(app)/studio-v2/page";

const PAGE_SIZE = 12;

interface OutputsPanelProps {
  savedJobs: SavedJob[];
  activeJobId: string | null;
  activeJobStatus: string | null;
  activeJobProgress: number;
  activeResolvedVideoUrl: string | null;
  isDownloadingVideo: boolean;
  getToken: () => Promise<string | null>;
  onBlobUrlLoaded: (jobId: string, blobUrl: string) => void;
  /** Upload provider-downloaded bytes to Supabase so the clip survives refresh. */
  onPersistVideoFromBlob?: (jobId: string, blob: Blob) => Promise<void>;
}

type DisplayJob = SavedJob & { isActiveGenerating?: boolean };

export default function OutputsPanel({
  savedJobs,
  activeJobId,
  activeJobStatus,
  activeResolvedVideoUrl,
  isDownloadingVideo,
  getToken,
  onBlobUrlLoaded,
  onPersistVideoFromBlob,
}: OutputsPanelProps) {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up("md"));
  const [page, setPage] = useState(0);
  const [loadingJobId, setLoadingJobId] = useState<string | null>(null);

  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerJob, setViewerJob] = useState<DisplayJob | null>(null);
  const [modalSrc, setModalSrc] = useState<string | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState(false);
  const [mutedUi, setMutedUi] = useState(true);
  const [promptAnchorEl, setPromptAnchorEl] = useState<HTMLElement | null>(null);
  const modalVideoRef = useRef<HTMLVideoElement | null>(null);

  const isGenerating =
    activeJobStatus === "generating" ||
    activeJobStatus === "processing" ||
    activeJobStatus === "pending";

  // Prepend the active in-progress job if it isn't in savedJobs yet
  const allJobs: DisplayJob[] = useMemo(() => {
    const list: DisplayJob[] = [...savedJobs];
    if (
      activeJobId &&
      isGenerating &&
      !savedJobs.find((j) => j.job_id === activeJobId)
    ) {
      list.unshift({
        job_id: activeJobId,
        prompt: "Generating…",
        timestamp: new Date().toISOString(),
        status: "completed",
        isActiveGenerating: true,
      });
    }
    return list;
  }, [savedJobs, activeJobId, isGenerating]);

  const totalPages = Math.ceil(allJobs.length / PAGE_SIZE);
  const pageJobs = allJobs.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const handleLoadVideo = useCallback(
    async (jobId: string): Promise<string | null> => {
      setLoadingJobId(jobId);
      try {
        const token = await getToken();
        const blob = await downloadStudioV2JobVideo(jobId, token ?? undefined);
        const url = URL.createObjectURL(blob);
        onBlobUrlLoaded(jobId, url);
        await onPersistVideoFromBlob?.(jobId, blob);
        return url;
      } catch (e) {
        console.error("Failed to load video:", e);
        return null;
      } finally {
        setLoadingJobId(null);
      }
    },
    [getToken, onBlobUrlLoaded, onPersistVideoFromBlob]
  );

  const closeViewer = useCallback(() => {
    const v = modalVideoRef.current;
    if (v) {
      v.pause();
      v.currentTime = 0;
    }
    setViewerOpen(false);
    setViewerJob(null);
    setModalSrc(null);
    setModalLoading(false);
    setModalError(false);
    setMutedUi(true);
    setPromptAnchorEl(null);
  }, []);

  /** When the modal is open and waiting, attach the URL once it appears in `savedJobs`. */
  useEffect(() => {
    if (!viewerOpen || !viewerJob || modalSrc) return;
    const j = allJobs.find((x) => x.job_id === viewerJob.job_id);
    const u =
      j?.videoUrl ||
      (j && j.job_id === activeJobId ? activeResolvedVideoUrl : j?.blobUrl);
    if (u) {
      setModalSrc(u);
      setModalLoading(false);
      setModalError(false);
    }
  }, [
    viewerOpen,
    viewerJob,
    modalSrc,
    allJobs,
    activeJobId,
    activeResolvedVideoUrl,
  ]);

  useEffect(() => {
    if (modalSrc) setMutedUi(true);
  }, [modalSrc]);

  useEffect(() => {
    if (!isDesktop && viewerOpen) closeViewer();
  }, [isDesktop, viewerOpen, closeViewer]);

  const handlePlay = () => {
    const v = modalVideoRef.current;
    if (!v) return;
    void v.play();
  };

  const handleStop = () => {
    const v = modalVideoRef.current;
    if (!v) return;
    v.pause();
    v.currentTime = 0;
  };

  const handleMuteToggle = () => {
    const v = modalVideoRef.current;
    if (!v) return;
    const next = !v.muted;
    v.muted = next;
    setMutedUi(next);
  };

  const handleDownloadModal = async () => {
    if (!modalSrc || !viewerJob) return;
    try {
      const res = await fetch(modalSrc);
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = `studio-${viewerJob.job_id}.mp4`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (e) {
      console.error("Download failed:", e);
    }
  };

  const openDesktopViewer = async (
    job: DisplayJob,
    displayUrl: string | null | undefined,
    isLoadingThis: boolean
  ) => {
    if (!isDesktop) return;
    if (job.isActiveGenerating && isGenerating) return;

    setViewerJob(job);
    setViewerOpen(true);
    setModalError(false);

    if (displayUrl) {
      setModalSrc(displayUrl);
      setModalLoading(false);
      return;
    }

    if (isLoadingThis) {
      setModalSrc(null);
      setModalLoading(true);
      return;
    }

    setModalSrc(null);
    setModalLoading(true);
    const url = await handleLoadVideo(job.job_id);
    setModalLoading(false);
    if (url) setModalSrc(url);
    else setModalError(true);
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{
          px: 3,
          py: 2,
          flexShrink: 0,
          borderBottom: "1px solid",
          borderColor: "divider",
        }}
      >
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <Typography variant="h6" fontWeight={700}>
            My Files
          </Typography>
          {allJobs.length > 0 && (
            <Chip
              label={allJobs.length}
              size="small"
              variant="outlined"
              sx={{ height: 20, fontSize: "0.7rem" }}
            />
          )}
        </Stack>

        {totalPages > 1 && (
          <Stack direction="row" spacing={0.5} alignItems="center">
            <Typography variant="caption" color="text.secondary" sx={{ mr: 1 }}>
              {page + 1} / {totalPages}
            </Typography>
            <IconButton
              size="small"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
            >
              <ArrowBackIosNewIcon sx={{ fontSize: 14 }} />
            </IconButton>
            <IconButton
              size="small"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
            >
              <ArrowForwardIosIcon sx={{ fontSize: 14 }} />
            </IconButton>
          </Stack>
        )}
      </Stack>

      {/* Grid */}
      <Box sx={{ flex: 1, overflowY: "auto", p: 3 }}>
        {allJobs.length === 0 ? (
          <Box
            sx={{
              height: "100%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 2,
            }}
          >
            <VideoFileIcon sx={{ fontSize: 72, opacity: 0.2 }} />
            <Typography variant="h6" fontWeight={600} color="text.secondary">
              No videos yet
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              textAlign="center"
              maxWidth={280}
            >
              Generate your first video using the form on the left. All your
              generated videos will appear here.
            </Typography>
          </Box>
        ) : (
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
              gap: 2,
            }}
          >
            {pageJobs.map((job) => {
              const isActive = job.job_id === activeJobId;
              const displayUrl =
                job.videoUrl ||
                (isActive ? activeResolvedVideoUrl : job.blobUrl);
              const isLoadingThis =
                isActive ? isDownloadingVideo : loadingJobId === job.job_id;
              const showGenerating = job.isActiveGenerating && isGenerating;

              return (
                <Box
                  key={job.job_id}
                  sx={{
                    borderRadius: 2,
                    border: "1px solid",
                    borderColor: isActive ? "primary.main" : "divider",
                    overflow: "hidden",
                    bgcolor: "background.paper",
                    transition: "border-color 0.2s",
                  }}
                >
                  {/* Video / status area */}
                  <Box
                    onClick={
                      isDesktop
                        ? () => {
                            void openDesktopViewer(job, displayUrl, isLoadingThis);
                          }
                        : undefined
                    }
                    sx={{
                      aspectRatio: "16 / 9",
                      bgcolor: "black",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      position: "relative",
                      ...(isDesktop ? { cursor: "pointer" } : {}),
                    }}
                  >
                    {displayUrl ? (
                      <Box
                        component="video"
                        src={displayUrl}
                        autoPlay
                        muted
                        loop
                        playsInline
                        sx={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          display: "block",
                          pointerEvents: isDesktop ? "none" : "auto",
                        }}
                      />
                    ) : showGenerating || isLoadingThis ? (
                      <Stack
                        spacing={1}
                        alignItems="center"
                        sx={{ px: 2, width: "100%" }}
                      >
                        <LinearProgress sx={{ width: "100%", borderRadius: 1 }} />
                        <Typography variant="caption" color="grey.500">
                          {showGenerating ? "Generating…" : "Loading…"}
                        </Typography>
                      </Stack>
                    ) : isDesktop ? (
                      <Typography
                        variant="caption"
                        color="grey.500"
                        textAlign="center"
                        sx={{ px: 2 }}
                      >
                        Click to load & preview
                      </Typography>
                    ) : (
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => void handleLoadVideo(job.job_id)}
                        sx={{
                          color: "grey.400",
                          borderColor: "grey.700",
                          fontSize: "0.7rem",
                        }}
                      >
                        Load video
                      </Button>
                    )}
                  </Box>

                </Box>
              );
            })}
          </Box>
        )}
      </Box>

      <Dialog
        open={viewerOpen && isDesktop}
        onClose={closeViewer}
        maxWidth="md"
        fullWidth
        aria-label="Video preview"
        PaperProps={{
          sx: {
            bgcolor: "transparent",
            boxShadow: "none",
            overflow: "visible",
            backgroundImage: "none",
          },
        }}
      >
        <DialogContent
          sx={{
            p: 0,
            bgcolor: "transparent",
            overflow: "hidden",
          }}
        >
          {modalLoading && !modalSrc && (
            <Box
              sx={{
                bgcolor: "grey.900",
                minHeight: 200,
                p: 3,
                borderRadius: 2,
              }}
            >
              <LinearProgress sx={{ borderRadius: 1 }} />
              <Typography
                variant="caption"
                color="grey.400"
                sx={{ mt: 1, display: "block" }}
              >
                Loading video…
              </Typography>
            </Box>
          )}
          {modalError && !modalSrc && !modalLoading && (
            <Typography color="error" sx={{ py: 2, px: 1 }}>
              Could not load video.
            </Typography>
          )}
          {modalSrc && (
            <Box
              sx={{
                position: "relative",
                width: "100%",
                bgcolor: "black",
                borderRadius: 2,
                overflow: "hidden",
                "&:hover .viewer-chrome": {
                  opacity: 1,
                  pointerEvents: "auto",
                },
              }}
            >
              <Box
                component="video"
                ref={modalVideoRef}
                src={modalSrc}
                muted={mutedUi}
                playsInline
                controls={false}
                loop={false}
                sx={{
                  width: "100%",
                  maxHeight: "min(70vh, 520px)",
                  display: "block",
                  bgcolor: "black",
                }}
              />
              <IconButton
                className="viewer-chrome"
                size="small"
                onClick={closeViewer}
                aria-label="Close"
                sx={{
                  position: "absolute",
                  top: 8,
                  right: 8,
                  opacity: 0,
                  pointerEvents: "none",
                  transition: "opacity 0.2s ease",
                  color: "common.white",
                  bgcolor: "rgba(0,0,0,0.45)",
                  "&:hover": { bgcolor: "rgba(0,0,0,0.65)" },
                }}
              >
                <CloseIcon />
              </IconButton>
              <Stack
                className="viewer-chrome"
                direction="row"
                alignItems="center"
                flexWrap="wrap"
                sx={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  bottom: 0,
                  px: 1.25,
                  py: 1.25,
                  gap: 0.75,
                  opacity: 0,
                  pointerEvents: "none",
                  transition: "opacity 0.2s ease",
                  background:
                    "linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.35) 55%, transparent 100%)",
                }}
              >
                <IconButton
                  onClick={handlePlay}
                  aria-label="Play"
                  size="medium"
                  sx={{ color: "common.white" }}
                >
                  <PlayArrowIcon />
                </IconButton>
                <IconButton
                  onClick={handleStop}
                  aria-label="Stop"
                  size="medium"
                  sx={{ color: "common.white" }}
                >
                  <StopIcon />
                </IconButton>
                <IconButton
                  onClick={handleMuteToggle}
                  aria-label={mutedUi ? "Unmute" : "Mute"}
                  size="medium"
                  sx={{ color: "common.white" }}
                >
                  {mutedUi ? <VolumeOffIcon /> : <VolumeUpIcon />}
                </IconButton>
                <Box sx={{ flex: 1, minWidth: 8 }} />
                <Button
                  variant="outlined"
                  size="small"
                  onClick={(e) => setPromptAnchorEl(e.currentTarget)}
                  sx={{
                    color: "common.white",
                    borderColor: "rgba(255,255,255,0.45)",
                    textTransform: "none",
                    "&:hover": {
                      borderColor: "rgba(255,255,255,0.75)",
                      bgcolor: "rgba(255,255,255,0.08)",
                    },
                  }}
                >
                  Prompt
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<DownloadIcon />}
                  onClick={() => void handleDownloadModal()}
                  sx={{
                    color: "common.white",
                    borderColor: "rgba(255,255,255,0.45)",
                    textTransform: "none",
                    "&:hover": {
                      borderColor: "rgba(255,255,255,0.75)",
                      bgcolor: "rgba(255,255,255,0.08)",
                    },
                  }}
                >
                  Download
                </Button>
              </Stack>
              <Popover
                open={Boolean(promptAnchorEl)}
                anchorEl={promptAnchorEl}
                onClose={() => setPromptAnchorEl(null)}
                anchorOrigin={{ vertical: "top", horizontal: "right" }}
                transformOrigin={{ vertical: "bottom", horizontal: "right" }}
                slotProps={{
                  paper: {
                    sx: {
                      maxWidth: 440,
                      p: 2,
                      bgcolor: "background.paper",
                    },
                  },
                }}
              >
                <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
                  {viewerJob?.prompt?.trim() || "—"}
                </Typography>
              </Popover>
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
}
