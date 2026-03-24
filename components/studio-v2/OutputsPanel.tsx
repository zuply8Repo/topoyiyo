"use client";

import React, { useState } from "react";
import {
  Box,
  Button,
  Chip,
  IconButton,
  LinearProgress,
  Stack,
  Typography,
} from "@mui/material";
import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBackIosNew";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import DownloadIcon from "@mui/icons-material/Download";
import VideoFileIcon from "@mui/icons-material/VideoFile";
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
}: OutputsPanelProps) {
  const [page, setPage] = useState(0);
  const [loadingJobId, setLoadingJobId] = useState<string | null>(null);

  const isGenerating =
    activeJobStatus === "generating" ||
    activeJobStatus === "processing" ||
    activeJobStatus === "pending";

  // Prepend the active in-progress job if it isn't in savedJobs yet
  const allJobs: DisplayJob[] = [...savedJobs];
  if (
    activeJobId &&
    isGenerating &&
    !savedJobs.find((j) => j.job_id === activeJobId)
  ) {
    allJobs.unshift({
      job_id: activeJobId,
      prompt: "Generating…",
      timestamp: new Date().toISOString(),
      status: "completed",
      isActiveGenerating: true,
    });
  }

  const totalPages = Math.ceil(allJobs.length / PAGE_SIZE);
  const pageJobs = allJobs.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const handleLoadVideo = async (jobId: string) => {
    setLoadingJobId(jobId);
    try {
      const token = await getToken();
      const blob = await downloadStudioV2JobVideo(jobId, token ?? undefined);
      const url = URL.createObjectURL(blob);
      onBlobUrlLoaded(jobId, url);
    } catch (e) {
      console.error("Failed to load video:", e);
    } finally {
      setLoadingJobId(null);
    }
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
              const blobUrl = isActive ? activeResolvedVideoUrl : job.blobUrl;
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
                    sx={{
                      aspectRatio: "16 / 9",
                      bgcolor: "black",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      position: "relative",
                    }}
                  >
                    {blobUrl ? (
                      <Box
                        component="video"
                        src={blobUrl}
                        controls
                        playsInline
                        sx={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          display: "block",
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
                    ) : (
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => handleLoadVideo(job.job_id)}
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

                  {/* Card info */}
                  <Box sx={{ p: 1.5 }}>
                    <Typography
                      variant="caption"
                      display="block"
                      fontWeight={600}
                      sx={{
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        mb: 0.5,
                      }}
                    >
                      {job.prompt || "—"}
                    </Typography>
                    <Stack
                      direction="row"
                      alignItems="center"
                      justifyContent="space-between"
                    >
                      <Typography variant="caption" color="text.secondary">
                        {new Date(job.timestamp).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </Typography>
                      <Stack direction="row" spacing={0.5} alignItems="center">
                        {showGenerating && (
                          <Chip
                            label="Generating"
                            size="small"
                            color="warning"
                            variant="outlined"
                            sx={{ height: 18, fontSize: "0.6rem" }}
                          />
                        )}
                        {blobUrl && (
                          <IconButton
                            size="small"
                            component="a"
                            href={blobUrl}
                            download={`video-${job.job_id.slice(-6)}.mp4`}
                            sx={{ p: 0.25 }}
                          >
                            <DownloadIcon sx={{ fontSize: 14 }} />
                          </IconButton>
                        )}
                      </Stack>
                    </Stack>
                  </Box>
                </Box>
              );
            })}
          </Box>
        )}
      </Box>
    </Box>
  );
}
