"use client";

import React from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  LinearProgress,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import DownloadIcon from "@mui/icons-material/Download";
import HourglassEmptyIcon from "@mui/icons-material/HourglassEmpty";

interface SubmitPanelProps {
  onSubmit: () => void;
  isSubmitting: boolean;
  jobId: string | null;
  jobStatus: string | null;
  jobProgress: number;
  jobError: string | null;
  /** Resolved browser-playable blob URL. Null while video is downloading or not yet available. */
  resolvedVideoUrl: string | null;
  /** True while the backend video is being fetched and a blob URL is being created. */
  isDownloadingVideo: boolean;
}

export default function SubmitPanel({
  onSubmit,
  isSubmitting,
  jobId,
  jobStatus,
  jobProgress,
  jobError,
  resolvedVideoUrl,
  isDownloadingVideo,
}: SubmitPanelProps) {
  const isGenerating =
    jobStatus === "generating" || jobStatus === "processing" || jobStatus === "pending";

  const isComplete = jobStatus === "completed";

  return (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
      <Stack spacing={2}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Button
            variant="contained"
            size="large"
            startIcon={<SendIcon />}
            onClick={onSubmit}
            disabled={isSubmitting || isGenerating || isDownloadingVideo}
            sx={{ textTransform: "none", borderRadius: 2 }}
          >
            {isSubmitting ? "Starting..." : isGenerating ? "Generating..." : "Generate"}
          </Button>

          {isGenerating && (
            <Chip
              icon={<HourglassEmptyIcon />}
              label="Processing on Vertex AI"
              size="small"
              color="warning"
              variant="outlined"
            />
          )}
          {isComplete && !isDownloadingVideo && resolvedVideoUrl && (
            <Chip label="Complete" size="small" color="success" variant="outlined" />
          )}
        </Stack>

        {jobId && (
          <Typography variant="caption" color="text.secondary" sx={{ wordBreak: "break-all" }}>
            Job: {jobId}
          </Typography>
        )}

        {isGenerating && (
          <Box>
            <LinearProgress
              variant="indeterminate"
              sx={{ borderRadius: 1 }}
            />
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: "block" }}>
              Veo generation typically takes 2–5 minutes.
            </Typography>
          </Box>
        )}

        {jobError && (
          <Alert severity="error" variant="outlined">
            {jobError}
          </Alert>
        )}

        {isComplete && (
          <Box>
            {isDownloadingVideo && (
              <Stack spacing={1}>
                <LinearProgress sx={{ borderRadius: 1 }} />
                <Typography variant="caption" color="text.secondary">
                  Downloading video from Veo…
                </Typography>
              </Stack>
            )}

            {!isDownloadingVideo && resolvedVideoUrl && (
              <Stack spacing={1.5}>
                <Typography variant="subtitle2" fontWeight={700}>
                  Generated video
                </Typography>
                <Box
                  component="video"
                  src={resolvedVideoUrl}
                  controls
                  autoPlay
                  loop
                  playsInline
                  sx={{
                    width: "100%",
                    maxWidth: 640,
                    borderRadius: 1,
                    display: "block",
                    bgcolor: "black",
                  }}
                />
                <Button
                  component="a"
                  href={resolvedVideoUrl}
                  download="studio-v2-video.mp4"
                  variant="outlined"
                  size="small"
                  startIcon={<DownloadIcon />}
                  sx={{ alignSelf: "flex-start", textTransform: "none", borderRadius: 2 }}
                >
                  Download mp4
                </Button>
              </Stack>
            )}

            {!isDownloadingVideo && !resolvedVideoUrl && (
              <Alert severity="success" variant="outlined">
                Video generation complete. Video download failed — check console for details.
              </Alert>
            )}
          </Box>
        )}
      </Stack>
    </Paper>
  );
}
