'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  Typography,
  Tabs,
  Tab,
  Grid,
  IconButton,
  Chip,
  Alert,
  Fade,
  LinearProgress,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PromptCard from './PromptCard';
import PromptEditModal from './PromptEditModal';
import PromptReviewModal from './PromptReviewModal';
import type { PromptResponse } from '@/lib/types';

interface PromptApprovalModalProps {
  open: boolean;
  onClose: () => void;
  prompts: PromptResponse[];
  onApprove: (promptId: string) => Promise<void>;
  onEdit: (promptId: string, updatedPrompt: string) => Promise<void>;
  approvingPrompts: Set<string>;
}

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

const PromptApprovalModal: React.FC<PromptApprovalModalProps> = ({
  open,
  onClose,
  prompts,
  onApprove,
  onEdit,
  approvingPrompts,
}) => {
  const [tabValue, setTabValue] = useState(0);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<PromptResponse | null>(null);
  const [reviewingPrompt, setReviewingPrompt] = useState<PromptResponse | null>(null);

  // Filter prompts by type (only show pending/edited prompts)
  const videoPrompts = prompts.filter(
    (p) => p.prompt_type === 'video' && p.status !== 'approved'
  );
  const storyImagePrompts = prompts.filter(
    (p) => p.prompt_type === 'story_image' && p.status !== 'approved'
  );
  const carouselImagePrompts = prompts.filter(
    (p) => p.prompt_type === 'carousel_image' && p.status !== 'approved'
  );

  const pendingCount =
    videoPrompts.length + storyImagePrompts.length + carouselImagePrompts.length;
  const totalCount = prompts.length;
  const approvedCount = totalCount - pendingCount;
  const progress = totalCount > 0 ? (approvedCount / totalCount) * 100 : 0;

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
    await onEdit(promptId, updatedPrompt);
    setEditModalOpen(false);
    setEditingPrompt(null);
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="xl"
        fullWidth
        PaperProps={{
          sx: {
            minHeight: '80vh',
            maxHeight: '90vh',
          },
        }}
      >
        {/* Header */}
        <DialogTitle
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid #e0e0e0',
            pb: 2,
          }}
        >
          <Box>
            <Typography variant="h6" component="div" fontWeight="bold">
              {pendingCount > 0
                ? `Review Prompts (${pendingCount} pending)`
                : 'All Prompts Approved! ✓'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {pendingCount > 0
                ? 'Review and approve prompts to start content generation'
                : 'All prompts have been approved and are generating'}
            </Typography>
          </Box>
          <IconButton edge="end" color="inherit" onClick={onClose} aria-label="close">
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        {/* Progress Bar */}
        <Box sx={{ px: 3, pt: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body2" fontWeight="medium">
              Approval Progress
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {approvedCount} of {totalCount} approved
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={progress}
            sx={{ height: 8, borderRadius: 1 }}
            color={progress === 100 ? 'success' : 'primary'}
          />
        </Box>

        {/* Content */}
        <DialogContent sx={{ pt: 2 }}>
          {pendingCount > 0 ? (
            <>
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
                      videoPrompts.length === 0 ? (
                        <CheckCircleIcon color="success" fontSize="small" />
                      ) : undefined
                    }
                    iconPosition="end"
                  />
                  <Tab
                    label={`Story Images (${storyImagePrompts.length})`}
                    icon={
                      storyImagePrompts.length === 0 ? (
                        <CheckCircleIcon color="success" fontSize="small" />
                      ) : undefined
                    }
                    iconPosition="end"
                  />
                  <Tab
                    label={`Carousel Images (${carouselImagePrompts.length})`}
                    icon={
                      carouselImagePrompts.length === 0 ? (
                        <CheckCircleIcon color="success" fontSize="small" />
                      ) : undefined
                    }
                    iconPosition="end"
                  />
                </Tabs>
              </Box>

              {/* Tab Panels */}
              <TabPanel value={tabValue} index={0}>
                {videoPrompts.length > 0 ? (
                  <Grid container spacing={3}>
                    {videoPrompts.map((prompt) => (
                      <Fade key={prompt.id} in={true} timeout={300}>
                        <Grid item xs={12} md={6} lg={4}>
                          <PromptCard
                            promptId={prompt.id}
                            assetId={prompt.asset_id}
                            promptType={prompt.prompt_type}
                            fullPrompt={prompt.full_prompt}
                            status={prompt.status}
                            engine={prompt.engine}
                            metadata={prompt.metadata}
                            onApprove={onApprove}
                            onEdit={handleEdit}
                            onReview={handleReview}
                            isApproving={approvingPrompts.has(prompt.id)}
                          />
                        </Grid>
                      </Fade>
                    ))}
                  </Grid>
                ) : (
                  <Alert severity="success" sx={{ mt: 2 }}>
                    All video prompts approved! ✓
                  </Alert>
                )}
              </TabPanel>

              <TabPanel value={tabValue} index={1}>
                {storyImagePrompts.length > 0 ? (
                  <Grid container spacing={3}>
                    {storyImagePrompts.map((prompt) => (
                      <Fade key={prompt.id} in={true} timeout={300}>
                        <Grid item xs={12} md={6} lg={4}>
                          <PromptCard
                            promptId={prompt.id}
                            assetId={prompt.asset_id}
                            promptType={prompt.prompt_type}
                            fullPrompt={prompt.full_prompt}
                            status={prompt.status}
                            engine={prompt.engine}
                            metadata={prompt.metadata}
                            onApprove={onApprove}
                            onEdit={handleEdit}
                            onReview={handleReview}
                            isApproving={approvingPrompts.has(prompt.id)}
                          />
                        </Grid>
                      </Fade>
                    ))}
                  </Grid>
                ) : (
                  <Alert severity="success" sx={{ mt: 2 }}>
                    All story image prompts approved! ✓
                  </Alert>
                )}
              </TabPanel>

              <TabPanel value={tabValue} index={2}>
                {carouselImagePrompts.length > 0 ? (
                  <Grid container spacing={3}>
                    {carouselImagePrompts.map((prompt) => (
                      <Fade key={prompt.id} in={true} timeout={300}>
                        <Grid item xs={12} md={6} lg={4}>
                          <PromptCard
                            promptId={prompt.id}
                            assetId={prompt.asset_id}
                            promptType={prompt.prompt_type}
                            fullPrompt={prompt.full_prompt}
                            status={prompt.status}
                            engine={prompt.engine}
                            metadata={prompt.metadata}
                            onApprove={onApprove}
                            onEdit={handleEdit}
                            onReview={handleReview}
                            isApproving={approvingPrompts.has(prompt.id)}
                          />
                        </Grid>
                      </Fade>
                    ))}
                  </Grid>
                ) : (
                  <Alert severity="success" sx={{ mt: 2 }}>
                    All carousel image prompts approved! ✓
                  </Alert>
                )}
              </TabPanel>
            </>
          ) : (
            <Alert severity="success" icon={<CheckCircleIcon />} sx={{ mt: 2 }}>
              <Typography variant="h6" gutterBottom>
                All Prompts Approved!
              </Typography>
              <Typography variant="body2">
                All prompts have been approved and are being generated. You can close
                this modal and check the content section below for completed items.
              </Typography>
            </Alert>
          )}
        </DialogContent>
      </Dialog>

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
          onApprove={async (id) => {
            await onApprove(id);
            setReviewModalOpen(false);
            setReviewingPrompt(null);
          }}
          onEdit={(id) => {
            setReviewModalOpen(false);
            handleEdit(id);
          }}
          onReject={() => {
            // Reject is removed, this won't be called
          }}
        />
      )}
    </>
  );
};

export default PromptApprovalModal;
