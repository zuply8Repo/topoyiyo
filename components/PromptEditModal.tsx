'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  Chip,
  IconButton,
  Alert,
  CircularProgress,
  Paper,
  Stack,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import SaveIcon from '@mui/icons-material/Save';
import VideoLibraryIcon from '@mui/icons-material/VideoLibrary';
import ImageIcon from '@mui/icons-material/Image';
import CollectionsIcon from '@mui/icons-material/Collections';
import UploadIcon from '@mui/icons-material/Upload';
import DeleteIcon from '@mui/icons-material/Delete';
import { useSession } from 'next-auth/react';
import { uploadReferenceImage, getReferenceImages, deleteReferenceImage } from '@/lib/api';
import type { ReferenceImage } from '@/lib/types';

interface PromptEditModalProps {
  open: boolean;
  onClose: () => void;
  promptId: string;
  assetId: string;
  promptType: 'video' | 'story_image' | 'carousel_image';
  initialPrompt: string;
  engine: 'veo' | 'nano_banana';
  metadata?: Record<string, any>;
  onSave: (promptId: string, updatedPrompt: string) => Promise<void>;
}

const PromptEditModal: React.FC<PromptEditModalProps> = ({
  open,
  onClose,
  promptId,
  assetId,
  promptType,
  initialPrompt,
  engine,
  metadata,
  onSave,
}) => {
  const { data: session } = useSession();
  const userId = session?.user?.id;
  
  const [editedPrompt, setEditedPrompt] = useState(initialPrompt);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [hasImageChanges, setHasImageChanges] = useState(false);
  
  // Reference images state
  const [referenceImages, setReferenceImages] = useState<ReferenceImage[]>([]);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isUploadingProduct, setIsUploadingProduct] = useState(false);
  const [loadingImages, setLoadingImages] = useState(false);

  // Update local state when initialPrompt changes
  useEffect(() => {
    setEditedPrompt(initialPrompt);
    setHasChanges(false);
    setHasImageChanges(false);
    setError(null);
  }, [initialPrompt, open]);

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
      const images = await getReferenceImages(promptId, userId);
      setReferenceImages(images);
    } catch (err) {
      console.error('Failed to load reference images:', err);
    } finally {
      setLoadingImages(false);
    }
  };

  // Track changes
  useEffect(() => {
    setHasChanges(editedPrompt !== initialPrompt);
  }, [editedPrompt, initialPrompt]);

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

  // Handle save
  const handleSave = async () => {
    const hasAnyChanges = hasChanges || hasImageChanges;
    
    if (!hasAnyChanges) {
      onClose();
      return;
    }

    if (editedPrompt.trim().length === 0) {
      setError('Prompt cannot be empty');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await onSave(promptId, editedPrompt);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save prompt');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle cancel
  const handleCancel = () => {
    const hasAnyChanges = hasChanges || hasImageChanges;
    
    if (hasAnyChanges) {
      const confirmed = window.confirm(
        'You have unsaved changes. Are you sure you want to close?'
      );
      if (!confirmed) return;
    }
    setEditedPrompt(initialPrompt);
    setError(null);
    setReferenceImages([]);
    setHasImageChanges(false);
    onClose();
  };

  // Handle image upload
  const handleImageUpload = async (imageType: 'logo' | 'product', file: File) => {
    if (!userId) {
      setError('User not authenticated');
      return;
    }

    // Validate file size (10MB max)
    if (file.size > 10485760) {
      setError('Image size must be less than 10MB');
      return;
    }

    // Validate file type
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setError('Only PNG, JPG, and WEBP images are supported');
      return;
    }

    try {
      if (imageType === 'logo') {
        setIsUploadingLogo(true);
      } else {
        setIsUploadingProduct(true);
      }

      const uploadedImage = await uploadReferenceImage(promptId, imageType, file, userId);
      
      // Update local state - replace existing image of same type
      setReferenceImages((prev) => {
        const filtered = prev.filter((img) => img.image_type !== imageType);
        return [...filtered, uploadedImage];
      });

      // Mark as having image changes so Save button becomes active
      setHasImageChanges(true);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload image');
    } finally {
      setIsUploadingLogo(false);
      setIsUploadingProduct(false);
    }
  };

  // Handle image delete
  const handleImageDelete = async (imageId: string) => {
    if (!userId) return;

    try {
      await deleteReferenceImage(imageId, userId);
      setReferenceImages((prev) => prev.filter((img) => img.id !== imageId));
      // Mark as having image changes so Save button becomes active
      setHasImageChanges(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete image');
    }
  };

  // Get logo and product images
  const logoImage = referenceImages.find((img) => img.image_type === 'logo');
  const productImage = referenceImages.find((img) => img.image_type === 'product');

  return (
    <Dialog
      open={open}
      onClose={handleCancel}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          minHeight: '60vh',
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
              Edit Prompt
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {assetId}
            </Typography>
          </Box>
        </Box>
        <IconButton
          edge="end"
          color="inherit"
          onClick={handleCancel}
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
          {metadata?.duration && (
            <Chip
              label={`Duration: ${metadata.duration}s`}
              variant="outlined"
              size="small"
            />
          )}
          {metadata?.aspect_ratio && (
            <Chip
              label={`Ratio: ${metadata.aspect_ratio}`}
              variant="outlined"
              size="small"
            />
          )}
          {metadata?.model_type && (
            <Chip
              label={`Model: ${metadata.model_type}`}
              variant="outlined"
              size="small"
            />
          )}
        </Box>

        {/* Guidelines */}
        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="body2">
            <strong>Editing Guidelines:</strong>
            {promptType === 'video' && (
              <>
                <br />
                • Maintain VEO-optimized structure: Setup → Action → Resolution
                <br />
                • Keep descriptions clear and specific for 8-second videos
                <br />• Ensure portrait (9:16) ratio compatibility
              </>
            )}
            {(promptType === 'story_image' || promptType === 'carousel_image') && (
              <>
                <br />
                • Use clear, descriptive language for Nano Banana
                <br />
                • Focus on visual elements, composition, and style
                <br />• Maintain Instagram portrait format (9:16) compatibility
              </>
            )}
          </Typography>
        </Alert>

        {/* Reference Images Upload (Video prompts only) */}
        {promptType === 'video' && (
          <>
            <Alert severity="info" icon={<ImageIcon />} sx={{ mb: 3 }}>
              <Typography variant="body2">
                <strong>Privacy Notice:</strong> Uploaded images are used only for video generation 
                and will be automatically deleted after 2 days.
              </Typography>
            </Alert>

            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" gutterBottom fontWeight="bold">
                Reference Images (Optional)
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
                Upload brand logo and product images to enhance video generation
              </Typography>

              <Stack spacing={2}>
                {/* Logo Upload */}
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2" fontWeight="bold">
                      Logo Image
                    </Typography>
                    <Button
                      component="label"
                      variant="outlined"
                      size="small"
                      startIcon={isUploadingLogo ? <CircularProgress size={16} /> : <UploadIcon />}
                      disabled={isUploadingLogo || !!logoImage}
                    >
                      {logoImage ? 'Uploaded' : 'Upload Logo'}
                      <input
                        type="file"
                        hidden
                        accept="image/png,image/jpeg,image/jpg,image/webp"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleImageUpload('logo', file);
                        }}
                      />
                    </Button>
                  </Box>
                  {logoImage && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 2 }}>
                      <Box
                        component="img"
                        src={logoImage.public_url}
                        alt="Logo"
                        sx={{
                          width: 80,
                          height: 80,
                          objectFit: 'contain',
                          border: '1px solid #e0e0e0',
                          borderRadius: 1,
                        }}
                      />
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body2">{logoImage.file_name}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {logoImage.file_size ? `${(logoImage.file_size / 1024 / 1024).toFixed(2)} MB` : ''}
                        </Typography>
                      </Box>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleImageDelete(logoImage.id)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  )}
                </Paper>

                {/* Product Upload */}
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2" fontWeight="bold">
                      Product Image
                    </Typography>
                    <Button
                      component="label"
                      variant="outlined"
                      size="small"
                      startIcon={isUploadingProduct ? <CircularProgress size={16} /> : <UploadIcon />}
                      disabled={isUploadingProduct || !!productImage}
                    >
                      {productImage ? 'Uploaded' : 'Upload Product'}
                      <input
                        type="file"
                        hidden
                        accept="image/png,image/jpeg,image/jpg,image/webp"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleImageUpload('product', file);
                        }}
                      />
                    </Button>
                  </Box>
                  {productImage && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 2 }}>
                      <Box
                        component="img"
                        src={productImage.public_url}
                        alt="Product"
                        sx={{
                          width: 80,
                          height: 80,
                          objectFit: 'contain',
                          border: '1px solid #e0e0e0',
                          borderRadius: 1,
                        }}
                      />
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body2">{productImage.file_name}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {productImage.file_size ? `${(productImage.file_size / 1024 / 1024).toFixed(2)} MB` : ''}
                        </Typography>
                      </Box>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleImageDelete(productImage.id)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  )}
                </Paper>
              </Stack>
            </Box>
          </>
        )}

        {/* Error message */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Prompt editor */}
        <TextField
          fullWidth
          multiline
          rows={12}
          value={editedPrompt}
          onChange={(e) => setEditedPrompt(e.target.value)}
          placeholder="Enter your prompt here..."
          variant="outlined"
          sx={{
            '& .MuiInputBase-root': {
              fontFamily: 'monospace',
              fontSize: '0.9rem',
            },
          }}
          helperText={`${editedPrompt.length} characters${
            hasChanges ? ' • Modified' : ''
          }`}
        />
      </DialogContent>

      {/* Actions */}
      <DialogActions
        sx={{
          borderTop: '1px solid #e0e0e0',
          px: 3,
          py: 2,
          gap: 1,
        }}
      >
        <Button onClick={handleCancel} disabled={isSaving}>
          Cancel
        </Button>
        <Button
          variant="contained"
          startIcon={
            isSaving ? (
              <CircularProgress size={20} color="inherit" />
            ) : (
              <SaveIcon />
            )
          }
          onClick={handleSave}
          disabled={isSaving || (!hasChanges && !hasImageChanges)}
          sx={{
            minWidth: 120,
          }}
        >
          {isSaving ? 'Saving...' : 'Save Changes'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PromptEditModal;
