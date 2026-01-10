"use client";

import React from "react";
import { Box, Button, Chip, Paper, Stack, Typography } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import { useRouter } from "next/navigation";
import type { Campaign } from "@/lib/api";

interface CampaignHeaderProps {
  campaign: Campaign | null;
  onSwitchCampaign?: () => void;
  showActions?: boolean;
}

export default function CampaignHeader({
  campaign,
  onSwitchCampaign,
  showActions = true,
}: CampaignHeaderProps) {
  const router = useRouter();

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "success";
      case "in_progress":
        return "primary";
      case "draft":
        return "default";
      case "failed":
        return "error";
      default:
        return "default";
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      month: "short",
      year: "numeric",
    });
  };

  if (!campaign) {
    return (
      <Paper
        variant="outlined"
        sx={{
          borderRadius: 4,
          borderColor: "divider",
          p: 2.5,
          bgcolor: "background.paper",
        }}
      >
        <Stack spacing={1.5} alignItems="center">
          <Typography variant="h6" sx={{ fontWeight: 900 }}>
            No campaigns yet
          </Typography>
          <Typography color="text.secondary" align="center">
            Create your first campaign to start generating content
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => router.push("/prompt")}
            sx={{ textTransform: "none", borderRadius: 999, fontWeight: 800 }}
          >
            Create Campaign
          </Button>
        </Stack>
      </Paper>
    );
  }

  return (
    <Paper
      variant="outlined"
      sx={{
        borderRadius: 4,
        borderColor: "divider",
        p: 2.5,
        bgcolor: "background.paper",
      }}
    >
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={2}
        alignItems={{ sm: "center" }}
        justifyContent="space-between"
      >
        <Stack spacing={1} sx={{ flex: 1, minWidth: 0 }}>
          <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
            <Typography
              variant="h6"
              sx={{ fontWeight: 900, wordBreak: "break-word" }}
            >
              {campaign.campaign_name}
            </Typography>
            <Chip
              label={campaign.status}
              color={getStatusColor(campaign.status) as any}
              size="small"
              sx={{ fontWeight: 700, textTransform: "capitalize" }}
            />
          </Stack>
          
          <Stack
            direction="row"
            spacing={2}
            divider={
              <Box
                sx={{
                  width: 4,
                  height: 4,
                  borderRadius: "50%",
                  bgcolor: "text.secondary",
                  alignSelf: "center",
                }}
              />
            }
            flexWrap="wrap"
          >
            <Typography variant="body2" color="text.secondary">
              {campaign.content_count} {campaign.content_count === 1 ? "item" : "items"}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {formatDate(campaign.created_at)}
            </Typography>
          </Stack>

          {campaign.brief_text && (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {campaign.brief_text}
            </Typography>
          )}
        </Stack>

        {showActions && (
          <Stack direction="row" spacing={1.5}>
            {onSwitchCampaign && (
              <Button
                variant="outlined"
                size="small"
                onClick={onSwitchCampaign}
                sx={{ textTransform: "none", borderRadius: 999, fontWeight: 800 }}
              >
                Switch Campaign
              </Button>
            )}
            <Button
              variant="contained"
              size="small"
              startIcon={<AddIcon />}
              onClick={() => router.push("/prompt")}
              sx={{ textTransform: "none", borderRadius: 999, fontWeight: 800 }}
            >
              New Campaign
            </Button>
          </Stack>
        )}
      </Stack>
    </Paper>
  );
}

