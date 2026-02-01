'use client';

import React from 'react';
import {
  Card,
  CardContent,
  CardActions,
  Typography,
  Box,
  IconButton,
  Chip,
  Tooltip,
  Paper,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import EditIcon from '@mui/icons-material/Edit';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VideoLibraryIcon from '@mui/icons-material/VideoLibrary';
import ImageIcon from '@mui/icons-material/Image';
import CollectionsIcon from '@mui/icons-material/Collections';
import { CircularProgress } from '@mui/material';

interface PromptCardProps {
  promptId: string;
  assetId: string;
  promptType: 'video' | 'story_image' | 'carousel_image';
  fullPrompt: string;
  status: 'pending' | 'approved' | 'rejected' | 'edited';
  engine: 'veo' | 'nano_banana';
  metadata?: Record<string, any>;
  onApprove: (promptId: string) => void;
  onEdit: (promptId: string) => void;
  onReview: (promptId: string) => void;
  isApproving?: boolean;
}

const PromptCard: React.FC<PromptCardProps> = ({
  promptId,
  assetId,
  promptType,
  fullPrompt,
  status,
  engine,
  metadata,
  onApprove,
  onEdit,
  onReview,
  isApproving = false,
}) => {
  // Get icon based on prompt type
  const getTypeIcon = () => {
    switch (promptType) {
      case 'video':
        return <VideoLibraryIcon sx={{ color: '#E1306C' }} />;
      case 'story_image':
        return <ImageIcon sx={{ color: '#833AB4' }} />;
      case 'carousel_image':
        return <CollectionsIcon sx={{ color: '#FD1D1D' }} />;
      default:
        return null;
    }
  };

  // Get color based on status
  const getStatusColor = () => {
    switch (status) {
      case 'approved':
        return '#4CAF50';
      case 'rejected':
        return '#F44336';
      case 'edited':
        return '#FF9800';
      case 'pending':
      default:
        return '#9E9E9E';
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

  return (
    <Card
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        borderLeft: `4px solid ${getStatusColor()}`,
        transition: 'all 0.3s ease',
        '&:hover': {
          boxShadow: 6,
          transform: 'translateY(-4px)',
        },
      }}
    >
      {/* Header */}
      <Box
        sx={{
          p: 2,
          pb: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {getTypeIcon()}
          <Typography variant="subtitle1" fontWeight="bold">
            {assetId}
          </Typography>
        </Box>
        <Chip
          label={status.toUpperCase()}
          size="small"
          sx={{
            backgroundColor: getStatusColor(),
            color: 'white',
            fontWeight: 'bold',
          }}
        />
      </Box>

      {/* Type and Engine Info */}
      <Box sx={{ px: 2, pb: 1, display: 'flex', gap: 1 }}>
        <Chip label={getTypeLabel()} size="small" variant="outlined" />
        <Chip
          label={getEngineLabel()}
          size="small"
          variant="outlined"
          color="primary"
        />
      </Box>

      {/* Prompt Content */}
      <CardContent sx={{ flexGrow: 1, pt: 1 }}>
        <Paper
          elevation={0}
          sx={{
            p: 2,
            backgroundColor: '#f5f5f5',
            maxHeight: '200px',
            overflowY: 'auto',
            '&::-webkit-scrollbar': {
              width: '6px',
            },
            '&::-webkit-scrollbar-thumb': {
              backgroundColor: '#ccc',
              borderRadius: '3px',
            },
          }}
        >
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {fullPrompt}
          </Typography>
        </Paper>

        {/* Metadata (optional) */}
        {metadata && Object.keys(metadata).length > 0 && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="caption" color="text.secondary">
              Metadata:
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
              {Object.entries(metadata).map(([key, value]) => {
                // Only show relevant metadata
                if (
                  ['duration', 'aspect_ratio', 'model_type', 'quality'].includes(
                    key
                  )
                ) {
                  return (
                    <Chip
                      key={key}
                      label={`${key}: ${value}`}
                      size="small"
                      variant="outlined"
                      sx={{ fontSize: '0.7rem' }}
                    />
                  );
                }
                return null;
              })}
            </Box>
          </Box>
        )}
      </CardContent>

      {/* Actions */}
      <CardActions
        sx={{
          justifyContent: 'center',
          borderTop: '1px solid #e0e0e0',
          p: 1,
        }}
      >
        <Tooltip title="Review Prompt">
          <IconButton
            color="info"
            onClick={() => onReview(promptId)}
            disabled={isApproving}
            sx={{
              '&:hover': {
                backgroundColor: 'rgba(2, 136, 209, 0.1)',
              },
            }}
          >
            <VisibilityIcon />
          </IconButton>
        </Tooltip>

        <Tooltip title="Approve">
          <IconButton
            color="success"
            onClick={() => onApprove(promptId)}
            disabled={status === 'approved' || isApproving}
            sx={{
              '&:hover': {
                backgroundColor: 'rgba(76, 175, 80, 0.1)',
              },
            }}
          >
            {isApproving ? (
              <CircularProgress size={24} color="inherit" />
            ) : (
              <CheckCircleIcon />
            )}
          </IconButton>
        </Tooltip>

        <Tooltip title="Edit">
          <IconButton
            color="primary"
            onClick={() => onEdit(promptId)}
            disabled={isApproving}
            sx={{
              '&:hover': {
                backgroundColor: 'rgba(25, 118, 210, 0.1)',
              },
            }}
          >
            <EditIcon />
          </IconButton>
        </Tooltip>
      </CardActions>
    </Card>
  );
};

export default PromptCard;
