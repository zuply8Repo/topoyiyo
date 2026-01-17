"use client";

import type { ContentItem } from "@/lib/types";
import {
  Box,
  Card,
  CardContent,
  Chip,
  IconButton,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import SaveIcon from "@mui/icons-material/Save";
import CloseIcon from "@mui/icons-material/Close";
import React from "react";

export type ContentCardProps = {
  item: ContentItem;
  campaignName?: string;
  onSaveCaption: (id: string, caption: string) => void;
  onDelete: (id: string) => void;
};

export default function ContentCard({
  item,
  campaignName,
  onSaveCaption,
  onDelete,
}: ContentCardProps) {
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(item.caption);

  React.useEffect(() => setDraft(item.caption), [item.caption]);

  const handleSave = () => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== item.caption) {
      onSaveCaption(item.id, trimmed);
    }
    setEditing(false);
  };

  const handleBlur = () => {
    // Auto-save on blur
    handleSave();
  };

  return (
    <Card
      variant="outlined"
      sx={{
        borderRadius: 4,
        overflow: "hidden",
        borderColor: "divider",
        height: "100%",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Campaign Name Label */}
      {campaignName && (
        <Box sx={{ px: 2, pt: 1.5, pb: 0.5 }}>
          <Chip
            label={campaignName}
            size="small"
            sx={{
              bgcolor: "#FF9800",
              color: "white",
              fontWeight: 600,
              height: 24,
              maxWidth: "100%",
              "& .MuiChip-label": {
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                px: 1,
              },
            }}
          />
        </Box>
      )}

      {/* Media Section */}
      <Box
        sx={{
          position: "relative",
          width: "100%",
          height: 280,
          bgcolor: "grey.100",
        }}
      >
        {item.assetType === "video" && item.videoUrl ? (
          <video
            src={item.videoUrl}
            autoPlay
            muted
            loop
            playsInline
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
        ) : item.assetType === "image" && item.imageUrl ? (
          <Box
            component="img"
            src={item.imageUrl}
            alt="Generated content"
            sx={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
        ) : null}
      </Box>

      {/* Caption Section */}
      <CardContent sx={{ flexGrow: 1 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 0.75 }}>
          Caption
        </Typography>
        {!editing ? (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
              wordBreak: "break-word",
            }}
          >
            {item.caption}
          </Typography>
        ) : (
          <TextField
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={handleBlur}
            multiline
            minRows={4}
            fullWidth
            size="small"
            autoFocus
            placeholder="Enter caption..."
          />
        )}
      </CardContent>

      {/* Action Buttons */}
      <Box sx={{ px: 1.25, pb: 1.25 }}>
        <Stack
          direction="row"
          spacing={1}
          alignItems="center"
          justifyContent="space-between"
        >
          <Tooltip title="Delete content">
            <IconButton
              aria-label="Delete"
              color="error"
              onClick={() => onDelete(item.id)}
              size="small"
            >
              <DeleteIcon />
            </IconButton>
          </Tooltip>

          {!editing ? (
            <Tooltip title="Edit caption">
              <IconButton
                aria-label="Edit"
                onClick={() => setEditing(true)}
                size="small"
              >
                <EditIcon />
              </IconButton>
            </Tooltip>
          ) : (
            <Stack direction="row" spacing={0.5}>
              <Tooltip title="Save">
                <IconButton
                  aria-label="Save"
                  color="primary"
                  onClick={handleSave}
                  size="small"
                >
                  <SaveIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="Cancel">
                <IconButton
                  aria-label="Cancel editing"
                  onClick={() => {
                    setDraft(item.caption);
                    setEditing(false);
                  }}
                  size="small"
                >
                  <CloseIcon />
                </IconButton>
              </Tooltip>
            </Stack>
          )}
        </Stack>
      </Box>
    </Card>
  );
}
