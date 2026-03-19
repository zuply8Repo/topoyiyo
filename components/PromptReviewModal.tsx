'use client';

import React, { useState, useEffect } from 'react';
import {
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Chip,
  IconButton,
  Paper,
  Divider,
  Stack,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import EditIcon from '@mui/icons-material/Edit';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import ReplayIcon from '@mui/icons-material/Replay';
import CancelIcon from '@mui/icons-material/Cancel';
import VideoLibraryIcon from '@mui/icons-material/VideoLibrary';
import ImageIcon from '@mui/icons-material/Image';
import CollectionsIcon from '@mui/icons-material/Collections';
import { useAuth } from '@clerk/nextjs';
import { getReferenceImages } from '@/lib/api';
import type { ReferenceImage } from '@/lib/types';

interface PromptReviewModalProps {
  open: boolean;
  onClose: () => void;
  promptId: string;
  assetId: string;
  promptType: 'video' | 'story_image' | 'carousel_image';
  fullPrompt: string;
  status: 'pending' | 'approved' | 'rejected' | 'edited' | 'failed';
  engine: 'veo' | 'nano_banana';
  metadata?: Record<string, unknown>;
  onApprove: (promptId: string) => void;
  onEdit: (promptId: string) => void;
  onReject: (promptId: string) => void;
}

const PromptReviewModal: React.FC<PromptReviewModalProps> = ({
  open,
  onClose,
  promptId,
  assetId,
  promptType,
  fullPrompt,
  status,
  engine,
  metadata,
  onApprove,
  onEdit,
  onReject,
}) => {
  const { userId, getToken } = useAuth();
  
  const [referenceImages, setReferenceImages] = useState<ReferenceImage[]>([]);
  const [loadingImages, setLoadingImages] = useState(false);

  // Load reference images when modal opens
  useEffect(() => {
    if (open && userId && promptType === 'video') {
      loadReferenceImages();
    }
  }, [open, userId, promptId, promptType]);

  const loadReferenceImages = async () => {
    if (!userId) return;
    
    try {
      setLoadingImages(true);
      const token = await getToken();
      const images = await getReferenceImages(promptId, token, userId);
      setReferenceImages(images);
    } catch (err) {
      console.error('Failed to load reference images:', err);
    } finally {
      setLoadingImages(false);
    }
  };

  const logoImage = referenceImages.find((img) => img.image_type === 'logo');
  const productImage = referenceImages.find((img) => img.image_type === 'product');
  // Get icon based on prompt type
  const getTypeIcon = () => {
    switch (promptType) {
      case 'video':
        return <VideoLibraryIcon sx={{ color: '#E1306C', fontSize: 32 }} />;
      case 'story_image':
        return <ImageIcon sx={{ color: '#833AB4', fontSize: 32 }} />;
      case 'carousel_image':
        return <CollectionsIcon sx={{ color: '#FD1D1D', fontSize: 32 }} />;
      default:
        return null;
    }
  };

  // Get readable type label
  const getTypeLabel = () => {
    switch (promptType) {
      case 'video':
        return 'Story Video';
      case 'story_image':
        return 'Story Image';
      case 'carousel_image':
        return 'Carousel Image';
      default:
        return promptType;
    }
  };

  // Get engine label
  const getEngineLabel = () => {
    return engine === 'veo' ? 'VEO' : 'Nano Banana';
  };

  const generationError = metadata?.generation_error as string | undefined;
  const failureType = metadata?.failure_type as string | undefined;
  const isContentFiltered = failureType === 'content_filtered';

  // Get status color
  const getStatusColor = () => {
    switch (status) {
      case 'approved':
        return 'success';
      case 'rejected':
      case 'failed':
        return 'error';
      case 'edited':
        return 'warning';
      case 'pending':
      default:
        return 'default';
    }
  };

  // Handle actions and close modal
  const handleApprove = () => {
    onApprove(promptId);
    onClose();
  };

  const handleEdit = () => {
    onEdit(promptId);
    onClose();
  };

  const handleReject = () => {
    onReject(promptId);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          minHeight: '70vh',
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
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {getTypeIcon()}
          <Box>
            <Typography variant="h6" component="div">
              Review Prompt
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {assetId}
            </Typography>
          </Box>
        </Box>
        <IconButton
          edge="end"
          color="inherit"
          onClick={onClose}
          aria-label="close"
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      {/* Content */}
      <DialogContent sx={{ pt: 3 }}>
        {/* Metadata chips */}
        <Box sx={{ mb: 3, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Chip label={getTypeLabel()} variant="outlined" />
          <Chip label={getEngineLabel()} variant="outlined" color="primary" />
          <Chip
            label={status.toUpperCase()}
            variant="filled"
            color={getStatusColor()}
          />
          {typeof metadata?.duration === 'number' && (
            <Chip
              label={`Duration: ${metadata.duration}s`}
              variant="outlined"
              size="small"
            />
          )}
          {typeof metadata?.aspect_ratio === 'string' && (
            <Chip
              label={`Ratio: ${metadata.aspect_ratio}`}
              variant="outlined"
              size="small"
            />
          )}
          {typeof metadata?.model_type === 'string' && (
            <Chip
              label={`Model: ${metadata.model_type}`}
              variant="outlined"
              size="small"
            />
          )}
        </Box>

        <Divider sx={{ mb: 3 }} />

        {/* Generation failure banner */}
        {status === 'failed' && (
          <Alert
            severity="error"
            icon={<ErrorOutlineIcon />}
            sx={{ mb: 3, borderRadius: 1 }}
          >
            <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5 }}>
              {isContentFiltered
                ? 'Blocked by AI Safety Filter — credits refunded'
                : 'Generation Failed — credits refunded'}
            </Typography>
            <Typography variant="body2">
              {generationError ||
                'An error occurred during generation. Edit your prompt and retry.'}
            </Typography>
            {isContentFiltered && (
              <Typography variant="caption" sx={{ mt: 0.5, display: 'block', fontStyle: 'italic' }}>
                Tip: Remove references to specific people, locations, or sensitive scenes, then retry.
              </Typography>
            )}
          </Alert>
        )}

        {/* Prompt Content */}
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" gutterBottom fontWeight="bold">
            Full Prompt
          </Typography>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              backgroundColor: '#f9f9f9',
              border: '1px solid #e0e0e0',
              borderRadius: 2,
              maxHeight: '400px',
              overflowY: 'auto',
              '&::-webkit-scrollbar': {
                width: '8px',
              },
              '&::-webkit-scrollbar-thumb': {
                backgroundColor: '#ccc',
                borderRadius: '4px',
              },
              '&::-webkit-scrollbar-thumb:hover': {
                backgroundColor: '#999',
              },
            }}
          >
            <Typography
              variant="body1"
              sx={{
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                fontFamily: 'monospace',
                fontSize: '0.95rem',
                lineHeight: 1.6,
              }}
            >
              {fullPrompt}
            </Typography>
          </Paper>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ mt: 1, display: 'block' }}
          >
            {fullPrompt.length} characters
          </Typography>
        </Box>

        {/* Reference Images (Video prompts only) */}
        {promptType === 'video' && referenceImages.length > 0 && (
          <Box sx={{ mt: 3 }}>
            <Typography variant="subtitle2" gutterBottom fontWeight="bold">
              Reference Images
            </Typography>
            <Stack spacing={2}>
              {logoImage && (
                <Paper
                  elevation={0}
                  sx={{
                    p: 2,
                    backgroundColor: '#f9f9f9',
                    border: '1px solid #e0e0e0',
                    borderRadius: 2,
                  }}
                >
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Logo Image
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 1 }}>
                    <Box
                      component="img"
                      src={logoImage.public_url}
                      alt="Logo"
                      sx={{
                        width: 100,
                        height: 100,
                        objectFit: 'contain',
                        border: '1px solid #e0e0e0',
                        borderRadius: 1,
                      }}
                    />
                    <Box>
                      <Typography variant="body2">{logoImage.file_name}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {logoImage.file_size
                          ? `${(logoImage.file_size / 1024 / 1024).toFixed(2)} MB`
                          : ''}
                      </Typography>
                    </Box>
                  </Box>
                </Paper>
              )}
              {productImage && (
                <Paper
                  elevation={0}
                  sx={{
                    p: 2,
                    backgroundColor: '#f9f9f9',
                    border: '1px solid #e0e0e0',
                    borderRadius: 2,
                  }}
                >
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Product Image
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 1 }}>
                    <Box
                      component="img"
                      src={productImage.public_url}
                      alt="Product"
                      sx={{
                        width: 100,
                        height: 100,
                        objectFit: 'contain',
                        border: '1px solid #e0e0e0',
                        borderRadius: 1,
                      }}
                    />
                    <Box>
                      <Typography variant="body2">{productImage.file_name}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {productImage.file_size
                          ? `${(productImage.file_size / 1024 / 1024).toFixed(2)} MB`
                          : ''}
                      </Typography>
                    </Box>
                  </Box>
                </Paper>
              )}
            </Stack>
          </Box>
        )}

        {/* Additional metadata if available */}
        {metadata && Object.keys(metadata).length > 0 && (
          <Box sx={{ mt: 3 }}>
            <Typography variant="subtitle2" gutterBottom fontWeight="bold">
              Additional Details
            </Typography>
            <Paper
              elevation={0}
              sx={{
                p: 2,
                backgroundColor: '#f9f9f9',
                border: '1px solid #e0e0e0',
                borderRadius: 2,
              }}
            >
              <Box sx={{ display: 'grid', gap: 1 }}>
                {Object.entries(metadata).map(([key, value]) => (
                  <Box
                    key={key}
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <Typography variant="body2" color="text.secondary">
                      {key.replace(/_/g, ' ').toUpperCase()}:
                    </Typography>
                    <Typography variant="body2" fontWeight="medium">
                      {typeof value === 'object'
                        ? JSON.stringify(value)
                        : String(value)}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Paper>
          </Box>
        )}
      </DialogContent>

      {/* Actions */}
      <DialogActions
        sx={{
          borderTop: '1px solid #e0e0e0',
          px: 3,
          py: 2,
          gap: 1,
          justifyContent: 'space-between',
        }}
      >
        <Button onClick={onClose} variant="outlined">
          Close
        </Button>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            color="error"
            startIcon={<CancelIcon />}
            onClick={handleReject}
            disabled={status === 'rejected'}
          >
            Reject
          </Button>
          <Button
            variant="outlined"
            color="primary"
            startIcon={<EditIcon />}
            onClick={handleEdit}
          >
            Edit
          </Button>
          <Button
            variant="contained"
            color={status === 'failed' ? 'warning' : 'success'}
            startIcon={status === 'failed' ? <ReplayIcon /> : <CheckCircleIcon />}
            onClick={handleApprove}
            disabled={status === 'approved'}
            sx={{ minWidth: 120 }}
          >
            {status === 'failed' ? 'Retry' : 'Approve'}
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
};

export default PromptReviewModal;
