"use client";

import React from "react";
import {
  Box,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import type { ChipProps } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import SearchIcon from "@mui/icons-material/Search";
import type { Campaign } from "@/lib/api";

interface CampaignSelectorProps {
  open: boolean;
  campaigns: Campaign[];
  currentCampaignId?: string | null;
  loading?: boolean;
  onClose: () => void;
  onSelect: (campaign: Campaign) => void;
}

export default function CampaignSelector({
  open,
  campaigns,
  currentCampaignId,
  loading = false,
  onClose,
  onSelect,
}: CampaignSelectorProps) {
  const [searchQuery, setSearchQuery] = React.useState("");

  const filteredCampaigns = React.useMemo(() => {
    if (!searchQuery.trim()) return campaigns;
    
    const query = searchQuery.toLowerCase();
    return campaigns.filter(
      (campaign) =>
        campaign.campaign_name.toLowerCase().includes(query) ||
        campaign.brief_text?.toLowerCase().includes(query)
    );
  }, [campaigns, searchQuery]);

  const getStatusColor = (status: string): ChipProps["color"] => {
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
      day: "numeric",
      year: "numeric",
    });
  };

  const handleSelect = (campaign: Campaign) => {
    onSelect(campaign);
    setSearchQuery("");
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 4 },
      }}
    >
      <DialogTitle>
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
        >
          <Typography variant="h6" sx={{ fontWeight: 900 }}>
            Select Campaign
          </Typography>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Stack>
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2}>
          <TextField
            fullWidth
            placeholder="Search campaigns..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            size="small"
            InputProps={{
              startAdornment: <SearchIcon sx={{ mr: 1, color: "text.secondary" }} />,
            }}
            sx={{
              "& .MuiOutlinedInput-root": {
                borderRadius: 999,
              },
            }}
          />

          {loading ? (
            <Stack alignItems="center" spacing={2} sx={{ py: 4 }}>
              <CircularProgress size={32} />
              <Typography color="text.secondary">Loading campaigns...</Typography>
            </Stack>
          ) : filteredCampaigns.length === 0 ? (
            <Box sx={{ py: 4, textAlign: "center" }}>
              <Typography color="text.secondary">
                {searchQuery.trim()
                  ? "No campaigns found matching your search"
                  : "No campaigns available"}
              </Typography>
            </Box>
          ) : (
            <List sx={{ maxHeight: 400, overflow: "auto" }}>
              {filteredCampaigns.map((campaign) => (
                <ListItem
                  key={campaign.id}
                  disablePadding
                  sx={{ mb: 1 }}
                >
                  <ListItemButton
                    onClick={() => handleSelect(campaign)}
                    selected={campaign.id === currentCampaignId}
                    sx={{
                      borderRadius: 3,
                      border: "1px solid",
                      borderColor:
                        campaign.id === currentCampaignId
                          ? "primary.main"
                          : "divider",
                      bgcolor:
                        campaign.id === currentCampaignId
                          ? "primary.50"
                          : "background.paper",
                      "&:hover": {
                        borderColor: "primary.main",
                      },
                    }}
                  >
                    <ListItemText
                      primary={
                        <Stack
                          direction="row"
                          spacing={1.5}
                          alignItems="center"
                          flexWrap="wrap"
                        >
                          <Typography
                            variant="body1"
                            sx={{ fontWeight: 800 }}
                            noWrap
                          >
                            {campaign.campaign_name}
                          </Typography>
                          <Chip
                            label={campaign.status}
                            color={getStatusColor(campaign.status)}
                            size="small"
                            sx={{ fontWeight: 700, textTransform: "capitalize" }}
                          />
                        </Stack>
                      }
                      secondary={
                        <Stack spacing={0.5} sx={{ mt: 0.5 }}>
                          <Typography variant="caption" color="text.secondary">
                            {campaign.content_count}{" "}
                            {campaign.content_count === 1 ? "item" : "items"} •{" "}
                            {formatDate(campaign.created_at)}
                          </Typography>
                          {campaign.brief_text && (
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              sx={{
                                display: "-webkit-box",
                                WebkitLineClamp: 1,
                                WebkitBoxOrient: "vertical",
                                overflow: "hidden",
                              }}
                            >
                              {campaign.brief_text}
                            </Typography>
                          )}
                        </Stack>
                      }
                    />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          )}
        </Stack>
      </DialogContent>
    </Dialog>
  );
}

