'use client';

import React, { Suspense, useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import {
  Container,
  Box,
  Typography,
  Tabs,
  Tab,
  Button,
  LinearProgress,
  Alert,
  AlertTitle,
  Chip,
  Paper,
  Skeleton,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PromptCard from '@/components/PromptCard';
import PromptEditModal from '@/components/PromptEditModal';
import PromptReviewModal from '@/components/PromptReviewModal';
import { ApiError, getCampaignPrompts, updatePrompt, approveAndGeneratePrompt, getCreditBalance } from '@/lib/api';
import type { PromptResponse } from '@/lib/types';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`prompt-tabpanel-${index}`}
      aria-labelledby={`prompt-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

function ApprovalPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const campaignId = searchParams.get('campaignId');
  const { userId, isLoaded, getToken } = useAuth();

  // State
  const [tabValue, setTabValue] = useState(0);
  const [prompts, setPrompts] = useState<PromptResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [approvingPrompts, setApprovingPrompts] = useState<Set<string>>(new Set());
  const [creditBalance, setCreditBalance] = useState(0);
  const veoUnitCostEur = 3.5;

  // Edit modal state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<PromptResponse | null>(null);

  // Review modal state
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewingPrompt, setReviewingPrompt] = useState<PromptResponse | null>(null);

  // Filter prompts by type
  const videoPrompts = prompts.filter((p) => p.prompt_type === 'video');
  const storyImagePrompts = prompts.filter((p) => p.prompt_type === 'story_image');
  const carouselImagePrompts = prompts.filter((p) => p.prompt_type === 'carousel_image');

  // Calculate progress
  const calculateProgress = (promptList: PromptResponse[]) => {
    if (promptList.length === 0) return 0;
    const approvedCount = promptList.filter((p) => p.status === 'approved').length;
    return (approvedCount / promptList.length) * 100;
  };

  const videoProgress = calculateProgress(videoPrompts);
  const storyImageProgress = calculateProgress(storyImagePrompts);
  const carouselImageProgress = calculateProgress(carouselImagePrompts);

  // Fetch prompts on mount
  useEffect(() => {
    if (!campaignId) {
      setError('No campaign ID provided');
      setLoading(false);
      return;
    }

    if (!isLoaded || !userId) {
      // Wait for auth to load
      return;
    }

    fetchPrompts();
  }, [campaignId, userId, isLoaded]);

  useEffect(() => {
    if (!userId) return;
    getToken()
      .then((token) => getCreditBalance(token ?? undefined))
      .then(setCreditBalance)
      .catch(() => setCreditBalance(0));
  }, [userId, getToken]);

  const fetchPrompts = async () => {
    if (!campaignId || !userId) return;

    try {
      setLoading(true);
      setError(null);
      const token = await getToken();
      const response = await getCampaignPrompts(campaignId, token ?? undefined);
      // Combine all prompts into a single array
      const allPrompts = [
        ...response.video_prompts,
        ...response.story_images,
        ...response.carousel_images,
      ];
      setPrompts(allPrompts);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load prompts');
    } finally {
      setLoading(false);
    }
  };

  // Handle approve - immediately starts generation and removes card
  const handleApprove = async (promptId: string) => {
    if (!userId || !campaignId) return;
    
    try {
      const prompt = prompts.find((p) => p.id === promptId);
      const required = prompt?.engine === 'veo' ? veoUnitCostEur : 0;
      if (creditBalance < required) {
        router.push('/billing');
        return;
      }

      // Add to approving set
      setApprovingPrompts((prev) => new Set(prev).add(promptId));
      
      // Approve and trigger generation
      const token = await getToken();
      await approveAndGeneratePrompt(promptId, campaignId, token ?? undefined);
      
      // Remove the approved prompt from the UI with smooth transition
      setPrompts((prev) => prev.filter((p) => p.id !== promptId));
      const balance = await getCreditBalance(token ?? undefined);
      setCreditBalance(balance);
      
      // Remove from approving set
      setApprovingPrompts((prev) => {
        const newSet = new Set(prev);
        newSet.delete(promptId);
        return newSet;
      });
    } catch (err) {
      console.error('Failed to approve and generate prompt:', err);
      if (err instanceof ApiError && err.code === "INSUFFICIENT_CREDITS") {
        router.push('/billing');
        return;
      }
      alert('Failed to approve and generate content. Please try again.');
      
      // Remove from approving set on error
      setApprovingPrompts((prev) => {
        const newSet = new Set(prev);
        newSet.delete(promptId);
        return newSet;
      });
    }
  };

  // Handle reject
  const handleReject = async (promptId: string) => {
    if (!userId) return;
    
    try {
      const prompt = prompts.find((p) => p.id === promptId);
      if (!prompt) return;
      
      const token = await getToken();
      await updatePrompt(promptId, prompt.full_prompt, 'rejected', token ?? undefined);
      setPrompts((prev) =>
        prev.map((p) => (p.id === promptId ? { ...p, status: 'rejected' } : p))
      );
    } catch (err) {
      console.error('Failed to reject prompt:', err);
      alert('Failed to reject prompt. Please try again.');
    }
  };

  // Handle edit
  const handleEdit = (promptId: string) => {
    const prompt = prompts.find((p) => p.id === promptId);
    if (prompt) {
      setEditingPrompt(prompt);
      setEditModalOpen(true);
    }
  };

  // Handle review
  const handleReview = (promptId: string) => {
    const prompt = prompts.find((p) => p.id === promptId);
    if (prompt) {
      setReviewingPrompt(prompt);
      setReviewModalOpen(true);
    }
  };

  // Handle save edited prompt
  const handleSaveEdit = async (promptId: string, updatedPrompt: string) => {
    if (!userId) {
      throw new Error('User not authenticated');
    }
    
    try {
      const token = await getToken();
      await updatePrompt(promptId, updatedPrompt, 'edited', token ?? undefined);
      setPrompts((prev) =>
        prev.map((p) =>
          p.id === promptId
            ? { ...p, full_prompt: updatedPrompt, status: 'edited' }
            : p
        )
      );
    } catch (err) {
      throw new Error('Failed to save prompt changes');
    }
  };

  // Loading state
  if (!isLoaded) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Skeleton variant="text" width={300} height={60} />
        <Skeleton variant="rectangular" height={60} sx={{ mt: 2 }} />
        <Box
          sx={{
            mt: 2,
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "repeat(2, 1fr)", lg: "repeat(3, 1fr)" },
            gap: 3,
          }}
        >
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} variant="rectangular" height={400} />
          ))}
        </Box>
      </Container>
    );
  }

  if (!userId) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Alert severity="info">
          <AlertTitle>Sign in required</AlertTitle>
          Please sign in to review prompts.
        </Alert>
      </Container>
    );
  }

  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Skeleton variant="text" width={300} height={60} />
        <Skeleton variant="rectangular" height={60} sx={{ mt: 2 }} />
        <Box
          sx={{
            mt: 2,
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "repeat(2, 1fr)", lg: "repeat(3, 1fr)" },
            gap: 3,
          }}
        >
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} variant="rectangular" height={400} />
          ))}
        </Box>
      </Container>
    );
  }

  // Error state
  if (error) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Alert severity="error">
          <AlertTitle>Error</AlertTitle>
          {error}
        </Alert>
        <Button
          variant="contained"
          onClick={fetchPrompts}
          sx={{ mt: 2 }}
        >
          Retry
        </Button>
      </Container>
    );
  }

  // No prompts state
  if (prompts.length === 0 && !loading) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Alert severity="info">
          <AlertTitle>No Prompts Found</AlertTitle>
          No prompts available for this campaign. Please generate a campaign brief
          first.
        </Alert>
        <Button
          variant="contained"
          onClick={() => router.push('/prompt')}
          sx={{ mt: 2 }}
        >
          Create Campaign Brief
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom fontWeight="bold">
          Review & Approve Prompts
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Review all generated prompts before creating your content. You can approve,
          edit, or reject each prompt.
        </Typography>
      </Box>

      {/* Overall Progress */}
      <Paper elevation={2} sx={{ p: 3, mb: 4 }}>
        <Box sx={{ mb: 2 }}>
          <Typography variant="h6">Campaign Progress</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Approve prompts individually to start generating content immediately
          </Typography>
        </Box>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" },
            gap: 2,
          }}
        >
          {/* Videos */}
            <Box>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  mb: 1,
                }}
              >
                <Typography variant="body2" fontWeight="bold">
                  Story Videos
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {videoPrompts.filter((p) => p.status === 'approved').length}/
                  {videoPrompts.length}
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={videoProgress}
                sx={{ height: 8, borderRadius: 1 }}
                color={videoProgress === 100 ? 'success' : 'primary'}
              />
            </Box>

          {/* Story Images */}
            <Box>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  mb: 1,
                }}
              >
                <Typography variant="body2" fontWeight="bold">
                  Story Images
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {storyImagePrompts.filter((p) => p.status === 'approved').length}/
                  {storyImagePrompts.length}
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={storyImageProgress}
                sx={{ height: 8, borderRadius: 1 }}
                color={storyImageProgress === 100 ? 'success' : 'primary'}
              />
            </Box>

          {/* Carousel Images */}
            <Box>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  mb: 1,
                }}
              >
                <Typography variant="body2" fontWeight="bold">
                  Carousel Images
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {
                    carouselImagePrompts.filter((p) => p.status === 'approved')
                      .length
                  }
                  /{carouselImagePrompts.length}
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={carouselImageProgress}
                sx={{ height: 8, borderRadius: 1 }}
                color={carouselImageProgress === 100 ? 'success' : 'primary'}
              />
            </Box>
        </Box>
      </Paper>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs
          value={tabValue}
          onChange={(_, newValue) => setTabValue(newValue)}
          aria-label="prompt tabs"
        >
          <Tab
            label={`Story Videos (${videoPrompts.length})`}
            icon={
              videoProgress === 100 ? (
                <CheckCircleIcon color="success" />
              ) : undefined
            }
            iconPosition="end"
          />
          <Tab
            label={`Story Images (${storyImagePrompts.length})`}
            icon={
              storyImageProgress === 100 ? (
                <CheckCircleIcon color="success" />
              ) : undefined
            }
            iconPosition="end"
          />
          <Tab
            label={`Carousel Images (${carouselImagePrompts.length})`}
            icon={
              carouselImageProgress === 100 ? (
                <CheckCircleIcon color="success" />
              ) : undefined
            }
            iconPosition="end"
          />
        </Tabs>
      </Box>

      {/* Tab Panels */}
      <TabPanel value={tabValue} index={0}>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "repeat(2, 1fr)", lg: "repeat(3, 1fr)" },
            gap: 3,
          }}
        >
          {videoPrompts.map((prompt) => (
            <Box key={prompt.id} sx={{ minWidth: 0 }}>
              <PromptCard
                promptId={prompt.id}
                assetId={prompt.asset_id}
                promptType={prompt.prompt_type}
                fullPrompt={prompt.full_prompt}
                status={prompt.status}
                engine={prompt.engine}
                metadata={prompt.metadata}
                onApprove={handleApprove}
                onEdit={handleEdit}
                onReview={handleReview}
                isApproving={approvingPrompts.has(prompt.id)}
              />
            </Box>
          ))}
        </Box>
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "repeat(2, 1fr)", lg: "repeat(3, 1fr)" },
            gap: 3,
          }}
        >
          {storyImagePrompts.map((prompt) => (
            <Box key={prompt.id} sx={{ minWidth: 0 }}>
              <PromptCard
                promptId={prompt.id}
                assetId={prompt.asset_id}
                promptType={prompt.prompt_type}
                fullPrompt={prompt.full_prompt}
                status={prompt.status}
                engine={prompt.engine}
                metadata={prompt.metadata}
                onApprove={handleApprove}
                onEdit={handleEdit}
                onReview={handleReview}
                isApproving={approvingPrompts.has(prompt.id)}
              />
            </Box>
          ))}
        </Box>
      </TabPanel>

      <TabPanel value={tabValue} index={2}>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "repeat(2, 1fr)", lg: "repeat(3, 1fr)" },
            gap: 3,
          }}
        >
          {carouselImagePrompts.map((prompt) => (
            <Box key={prompt.id} sx={{ minWidth: 0 }}>
              <PromptCard
                promptId={prompt.id}
                assetId={prompt.asset_id}
                promptType={prompt.prompt_type}
                fullPrompt={prompt.full_prompt}
                status={prompt.status}
                engine={prompt.engine}
                metadata={prompt.metadata}
                onApprove={handleApprove}
                onEdit={handleEdit}
                onReview={handleReview}
                isApproving={approvingPrompts.has(prompt.id)}
              />
            </Box>
          ))}
        </Box>
      </TabPanel>

      {/* Edit Modal */}
      {editingPrompt && (
        <PromptEditModal
          open={editModalOpen}
          onClose={() => {
            setEditModalOpen(false);
            setEditingPrompt(null);
          }}
          promptId={editingPrompt.id}
          assetId={editingPrompt.asset_id}
          promptType={editingPrompt.prompt_type}
          initialPrompt={editingPrompt.full_prompt}
          engine={editingPrompt.engine}
          metadata={editingPrompt.metadata}
          onSave={handleSaveEdit}
        />
      )}

      {/* Review Modal */}
      {reviewingPrompt && (
        <PromptReviewModal
          open={reviewModalOpen}
          onClose={() => {
            setReviewModalOpen(false);
            setReviewingPrompt(null);
          }}
          promptId={reviewingPrompt.id}
          assetId={reviewingPrompt.asset_id}
          promptType={reviewingPrompt.prompt_type}
          fullPrompt={reviewingPrompt.full_prompt}
          status={reviewingPrompt.status}
          engine={reviewingPrompt.engine}
          metadata={reviewingPrompt.metadata}
          onApprove={handleApprove}
          onEdit={handleEdit}
          onReject={handleReject}
        />
      )}
    </Container>
  );
}

export default function ApprovalPage() {
  return (
    <Suspense>
      <ApprovalPageContent />
    </Suspense>
  );
}
