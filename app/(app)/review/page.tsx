"use client";

import ContentCard from "@/components/ContentCard";
import CampaignHeader from "@/components/CampaignHeader";
import CampaignSelector from "@/components/CampaignSelector";
import { 
  fetchCampaignContent, 
  updateContentCaption, 
  deleteContentItem,
  getActiveCampaign,
  listUserCampaigns,
  type Campaign
} from "@/lib/api";
import type { ContentItem } from "@/lib/types";
import { useSession } from "next-auth/react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Grid,
  Snackbar,
  Stack,
  Typography,
} from "@mui/material";
import { useRouter, useSearchParams } from "next/navigation";
import React from "react";

export default function ReviewPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const campaignIdFromUrl = searchParams.get("campaignId");
  
  const { data: session } = useSession();
  const userId = session?.user?.id;

  const [campaign, setCampaign] = React.useState<Campaign | null>(null);
  const [campaigns, setCampaigns] = React.useState<Campaign[]>([]);
  const [items, setItems] = React.useState<ContentItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [loadingCampaigns, setLoadingCampaigns] = React.useState(false);
  const [selectorOpen, setSelectorOpen] = React.useState(false);
  const [toast, setToast] = React.useState<{ 
    msg: string; 
    severity: "success" | "info" | "error" 
  } | null>(null);

  // Load active campaign if no campaignId in URL
  const loadActiveCampaign = React.useCallback(async () => {
    if (!userId || campaignIdFromUrl) return;

    try {
      setLoading(true);
      const activeCampaign = await getActiveCampaign(userId);
      
      if (activeCampaign) {
        setCampaign(activeCampaign);
        // Update URL with campaign ID
        router.replace(`/review?campaignId=${activeCampaign.id}`, { scroll: false });
      } else {
        setCampaign(null);
        setLoading(false);
      }
    } catch (error) {
      console.error("Failed to load active campaign:", error);
      setToast({ 
        msg: "Failed to load campaign. Please try again.", 
        severity: "error" 
      });
      setLoading(false);
    }
  }, [userId, campaignIdFromUrl, router]);

  // Load campaign content
  const loadContent = React.useCallback(async (campaignId: string) => {
    if (!userId) return;

    try {
      setLoading(true);
      const content = await fetchCampaignContent(campaignId, userId);
      setItems(content);
    } catch (error) {
      console.error("Failed to load campaign content:", error);
      setToast({ 
        msg: "Failed to load content. Please try again.", 
        severity: "error" 
      });
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Load campaign list for selector
  const loadCampaigns = React.useCallback(async () => {
    if (!userId) return;

    try {
      setLoadingCampaigns(true);
      const campaignList = await listUserCampaigns(userId);
      setCampaigns(campaignList);
    } catch (error) {
      console.error("Failed to load campaigns:", error);
    } finally {
      setLoadingCampaigns(false);
    }
  }, [userId]);

  // Initial load: either from URL or fetch active campaign
  React.useEffect(() => {
    if (!userId) return;

    if (campaignIdFromUrl) {
      // Load the campaign from URL
      const loadCampaignById = async () => {
        try {
          setLoading(true);
          // Fetch campaigns to get campaign metadata
          const campaignList = await listUserCampaigns(userId);
          const selectedCampaign = campaignList.find(c => c.id === campaignIdFromUrl);
          
          if (selectedCampaign) {
            setCampaign(selectedCampaign);
            await loadContent(campaignIdFromUrl);
          } else {
            setToast({ 
              msg: "Campaign not found.", 
              severity: "error" 
            });
            setLoading(false);
          }
        } catch (error) {
          console.error("Failed to load campaign:", error);
          setLoading(false);
        }
      };
      loadCampaignById();
    } else {
      // No campaignId in URL, load active campaign
      loadActiveCampaign();
    }
  }, [userId, campaignIdFromUrl, loadActiveCampaign, loadContent]);

  // Load campaign content when campaign changes
  React.useEffect(() => {
    if (campaign?.id && userId) {
      loadContent(campaign.id);
    }
  }, [campaign?.id, userId, loadContent]);

  const handleSaveCaption = async (id: string, caption: string) => {
    if (!userId) return;

    try {
      await updateContentCaption(id, userId, caption);
      
      // Update local state
      setItems(prev => 
        prev.map(item => 
          item.id === id ? { ...item, caption } : item
        )
      );
      
      setToast({ msg: "Caption saved successfully!", severity: "success" });
    } catch (error) {
      console.error("Failed to save caption:", error);
      setToast({ msg: "Failed to save caption. Please try again.", severity: "error" });
    }
  };

  const handleDelete = async (id: string) => {
    if (!userId) return;

    // Confirm deletion
    if (!window.confirm("Are you sure you want to delete this content item?")) {
      return;
    }

    try {
      await deleteContentItem(id, userId);
      
      // Remove from local state
      setItems(prev => prev.filter(item => item.id !== id));
      
      // Update campaign content count
      if (campaign) {
        setCampaign({
          ...campaign,
          content_count: Math.max(0, campaign.content_count - 1)
        });
      }
      
      setToast({ msg: "Content deleted successfully!", severity: "success" });
    } catch (error) {
      console.error("Failed to delete content:", error);
      setToast({ msg: "Failed to delete content. Please try again.", severity: "error" });
    }
  };

  const handleSwitchCampaign = () => {
    loadCampaigns();
    setSelectorOpen(true);
  };

  const handleSelectCampaign = (selectedCampaign: Campaign) => {
    setCampaign(selectedCampaign);
    router.push(`/review?campaignId=${selectedCampaign.id}`, { scroll: false });
    setSelectorOpen(false);
  };

  if (loading) {
    return (
      <Stack spacing={2.5} alignItems="center" justifyContent="center" sx={{ minHeight: 400 }}>
        <CircularProgress />
        <Typography color="text.secondary">Loading campaign content...</Typography>
      </Stack>
    );
  }

  return (
    <Stack spacing={2.5}>
      <Stack spacing={0.25}>
        <Typography variant="h5" sx={{ fontWeight: 900 }}>
          Review Campaign Content
        </Typography>
        <Typography color="text.secondary">
          Edit captions or delete items you don't want to keep.
        </Typography>
      </Stack>

      <CampaignHeader
        campaign={campaign}
        onSwitchCampaign={handleSwitchCampaign}
        showActions={true}
      />

      {campaign && items.length === 0 ? (
        <Box
          sx={{
            border: "1px dashed",
            borderColor: "divider",
            borderRadius: 4,
            p: 4,
            textAlign: "center",
            bgcolor: "background.paper",
          }}
        >
          <Stack spacing={1.5} alignItems="center">
            <Typography variant="h6" sx={{ fontWeight: 900 }}>
              No content items yet
            </Typography>
            <Typography color="text.secondary">
              This campaign doesn't have any generated content yet. Content generation may still be in progress.
            </Typography>
            <Button
              variant="outlined"
              onClick={() => router.push("/dashboard")}
              sx={{ textTransform: "none", borderRadius: 999, fontWeight: 800 }}
            >
              Go to Dashboard
            </Button>
          </Stack>
        </Box>
      ) : campaign && items.length > 0 ? (
        <Grid container spacing={2}>
          {items.map((item) => (
            <Grid key={item.id} item xs={12} sm={6} md={4}>
              <ContentCard
                item={item}
                onSaveCaption={handleSaveCaption}
                onDelete={handleDelete}
              />
            </Grid>
          ))}
        </Grid>
      ) : null}

      <CampaignSelector
        open={selectorOpen}
        campaigns={campaigns}
        currentCampaignId={campaign?.id}
        loading={loadingCampaigns}
        onClose={() => setSelectorOpen(false)}
        onSelect={handleSelectCampaign}
      />

      <Snackbar
        open={Boolean(toast)}
        autoHideDuration={3000}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        {toast ? (
          <Alert onClose={() => setToast(null)} severity={toast.severity} sx={{ width: "100%" }}>
            {toast.msg}
          </Alert>
        ) : null}
      </Snackbar>
    </Stack>
  );
}
