"use client";

import ContentCard from "@/components/ContentCard";
import CampaignHeader from "@/components/CampaignHeader";
import CampaignSelector from "@/components/CampaignSelector";
import PromptApprovalModal from "@/components/PromptApprovalModal";
import { 
  fetchCampaignContent, 
  updateContentCaption, 
  deleteContentItem,
  getActiveCampaign,
  listUserCampaigns,
  getCampaignPrompts,
  approveAndGeneratePrompt,
  updatePrompt,
  type Campaign
} from "@/lib/api";
import type { ContentItem, PromptResponse } from "@/lib/types";
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
  Paper,
  Chip,
} from "@mui/material";
import RateReviewIcon from '@mui/icons-material/RateReview';
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
  const [prompts, setPrompts] = React.useState<PromptResponse[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [loadingCampaigns, setLoadingCampaigns] = React.useState(false);
  const [loadingPrompts, setLoadingPrompts] = React.useState(false);
  const [selectorOpen, setSelectorOpen] = React.useState(false);
  const [promptModalOpen, setPromptModalOpen] = React.useState(false);
  const [approvingPrompts, setApprovingPrompts] = React.useState<Set<string>>(new Set());
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

  // Load campaign prompts
  const loadPrompts = React.useCallback(async (campaignId: string) => {
    if (!userId) return;

    try {
      setLoadingPrompts(true);
      const response = await getCampaignPrompts(campaignId, userId);
      const allPrompts = [
        ...response.video_prompts,
        ...response.story_images,
        ...response.carousel_images,
      ];
      setPrompts(allPrompts);
    } catch (error) {
      console.error("Failed to load prompts:", error);
      // Silently fail - prompts might not exist yet
    } finally {
      setLoadingPrompts(false);
    }
  }, [userId]);

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

  // Load campaign content and prompts when campaign changes
  React.useEffect(() => {
    if (campaign?.id && userId) {
      loadContent(campaign.id);
      loadPrompts(campaign.id);
    }
  }, [campaign?.id, userId, loadContent, loadPrompts]);

  // Handle approve prompt
  const handleApprovePrompt = async (promptId: string) => {
    if (!userId || !campaign?.id) return;

    try {
      // Add to approving set
      setApprovingPrompts(prev => new Set(prev).add(promptId));

      // Approve and generate
      await approveAndGeneratePrompt(promptId, userId, campaign.id);

      // Update local state - mark as approved
      setPrompts(prev =>
        prev.map(p => (p.id === promptId ? { ...p, status: 'approved' as const } : p))
      );

      setToast({ msg: "Prompt approved! Generation started.", severity: "success" });

      // Reload content after a delay to show new items
      setTimeout(() => {
        if (campaign?.id) loadContent(campaign.id);
      }, 2000);
    } catch (error) {
      console.error("Failed to approve prompt:", error);
      setToast({ msg: "Failed to approve prompt. Please try again.", severity: "error" });
    } finally {
      // Remove from approving set
      setApprovingPrompts(prev => {
        const next = new Set(prev);
        next.delete(promptId);
        return next;
      });
    }
  };

  // Handle edit prompt
  const handleEditPrompt = async (promptId: string, updatedPrompt: string) => {
    if (!userId) return;

    try {
      await updatePrompt(promptId, userId, updatedPrompt, 'edited');

      // Update local state
      setPrompts(prev =>
        prev.map(p =>
          p.id === promptId
            ? { ...p, full_prompt: updatedPrompt, status: 'edited' as const }
            : p
        )
      );

      setToast({ msg: "Prompt updated successfully!", severity: "success" });
    } catch (error) {
      console.error("Failed to update prompt:", error);
      throw new Error("Failed to save prompt changes");
    }
  };

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

      {/* Prompt Review Section */}
      {campaign && prompts.length > 0 && (
        <Paper
          elevation={0}
          sx={{
            border: "1px dashed",
            borderColor: "divider",
            borderRadius: 4,
            p: 3,
            bgcolor: "background.paper",
          }}
        >
          <Stack spacing={2}>
            <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between">
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 900 }}>
                  Prompt to review
                </Typography>
                <Typography color="text.secondary" variant="body2">
                  {prompts.filter(p => p.status !== 'approved').length > 0
                    ? `This campaign has ${prompts.filter(p => p.status !== 'approved').length} prompts waiting for your review. Prompt generation may still be in progress.`
                    : "All prompts have been approved and are generating content."}
                </Typography>
              </Box>
              {prompts.filter(p => p.status !== 'approved').length > 0 && (
                <Chip
                  label={`${prompts.filter(p => p.status !== 'approved').length} pending`}
                  color="warning"
                  sx={{ fontWeight: 'bold' }}
                />
              )}
            </Stack>
            <Button
              variant="outlined"
              onClick={() => setPromptModalOpen(true)}
              startIcon={<RateReviewIcon />}
              disabled={loadingPrompts}
              sx={{
                textTransform: "none",
                borderRadius: 2,
                fontWeight: 800,
                alignSelf: 'flex-start',
              }}
            >
              {loadingPrompts ? (
                <>
                  <CircularProgress size={20} sx={{ mr: 1 }} />
                  Loading...
                </>
              ) : (
                `Review prompt (${prompts.filter(p => p.status !== 'approved').length})`
              )}
            </Button>
          </Stack>
        </Paper>
      )}

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

      {/* Prompt Approval Modal */}
      {campaign && (
        <PromptApprovalModal
          open={promptModalOpen}
          onClose={() => setPromptModalOpen(false)}
          prompts={prompts}
          onApprove={handleApprovePrompt}
          onEdit={handleEditPrompt}
          approvingPrompts={approvingPrompts}
        />
      )}

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
