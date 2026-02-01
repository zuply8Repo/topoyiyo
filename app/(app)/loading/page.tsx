"use client";

import { Box, CircularProgress, LinearProgress, Paper, Stack, Typography, Alert } from "@mui/material";
import { useRouter, useSearchParams } from "next/navigation";
import React from "react";
import { getCampaignStatus } from "@/lib/api";

export default function LoadingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const jobId = searchParams.get("job_id");
  const campaignIdParam = searchParams.get("campaign_id");
  
  const [status, setStatus] = React.useState<string>("pending");
  const [progress, setProgress] = React.useState(0);
  const [error, setError] = React.useState<string | null>(null);
  const [campaignId, setCampaignId] = React.useState<string | null>(campaignIdParam);
  const [isPolling, setIsPolling] = React.useState(true);

  React.useEffect(() => {
    // If no job_id, redirect back to prompt
    if (!jobId) {
      router.push("/prompt");
      return;
    }

    const pollStatus = async () => {
      try {
        const jobStatus = await getCampaignStatus(jobId);
        setStatus(jobStatus.status);
        setProgress(jobStatus.progress_percentage);
        
        // Store campaign_id when available
        if (jobStatus.campaign_id) {
          setCampaignId(jobStatus.campaign_id);
        }
        
        if (jobStatus.status === "completed") {
          setIsPolling(false);
          // Wait 2 seconds before redirecting to show completion
          const finalCampaignId = jobStatus.campaign_id || campaignId;
          if (finalCampaignId) {
            setTimeout(() => router.push(`/approval?campaignId=${finalCampaignId}`), 2000);
          } else {
            // Fallback if campaign_id is not available
            setTimeout(() => router.push("/dashboard"), 2000);
          }
        } else if (jobStatus.status === "failed") {
          setIsPolling(false);
          setError(jobStatus.error_message || "Prompt generation failed");
        }
      } catch (err) {
        console.error("Failed to get job status:", err);
        // Continue polling even if one request fails
      }
    };

    // Initial poll
    pollStatus();

    // Poll every 5 seconds if still active
    let interval: NodeJS.Timeout | null = null;
    if (isPolling) {
      interval = setInterval(pollStatus, 5000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [jobId, router, isPolling]);

  const getStatusMessage = () => {
    switch (status) {
      case "pending":
        return "Your campaign is queued...";
      case "processing":
        return "Our creative team is crafting your prompts...";
      case "completed":
        return "Prompts ready! Redirecting...";
      case "failed":
        return "Prompt generation failed";
      default:
        return "Processing...";
    }
  };

  const getStatusDescription = () => {
    if (status === "completed") {
      return "Your prompts are ready for review and approval!";
    }
    if (status === "failed") {
      return "Something went wrong. Please try again or contact support.";
    }
    return "Generating 6 video prompts and 24 image prompts for your campaign...";
  };

  return (
    <Box sx={{ display: "grid", placeItems: "center", minHeight: { xs: 420, sm: 520 } }}>
      <Paper
        variant="outlined"
        sx={{
          borderRadius: 4,
          borderColor: "divider",
          p: { xs: 3, sm: 4 },
          width: "100%",
          maxWidth: 560,
        }}
      >
        <Stack spacing={3} alignItems="center">
          {status !== "failed" && (
            <CircularProgress size={60} />
          )}
          
          <Stack spacing={1} alignItems="center" sx={{ width: "100%" }}>
            <Typography variant="h5" sx={{ fontWeight: 900 }}>
              {getStatusMessage()}
            </Typography>
            <Typography color="text.secondary" align="center">
              {getStatusDescription()}
            </Typography>
          </Stack>

          <Box sx={{ width: "100%" }}>
            <LinearProgress 
              variant="determinate" 
              value={progress} 
              sx={{ height: 8, borderRadius: 4 }}
            />
            <Typography 
              variant="body2" 
              color="text.secondary" 
              align="center" 
              sx={{ mt: 1 }}
            >
              {progress}% complete • {status}
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ width: "100%" }}>
              {error}
            </Alert>
          )}

          {status !== "failed" && (
            <Typography 
              variant="caption" 
              color="text.secondary" 
              sx={{ maxWidth: "90%", textAlign: "center" }}
            >
              💡 Hang tight! We're generating prompts using VEO for videos and Nano Banana for images.
            </Typography>
          )}
        </Stack>
      </Paper>
    </Box>
  );
}


