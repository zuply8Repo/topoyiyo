"use client";

import type { ContentItem } from "@/lib/types";
import { downloadMedia } from "@/lib/downloadMedia";
import {
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  IconButton,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import DownloadIcon from "@mui/icons-material/Download";
import EditIcon from "@mui/icons-material/Edit";
import CollectionsIcon from "@mui/icons-material/Collections";
import React from "react";

export type CarouselPreviewCardProps = {
  items: ContentItem[];
  onDeleteAll: (ids: string[]) => void;
  onCaptionChange?: (itemIds: string[], newCaption: string) => Promise<void>;
};

export default function CarouselPreviewCard({
  items,
  onDeleteAll,
  onCaptionChange,
}: CarouselPreviewCardProps) {
  const [previewOpen, setPreviewOpen] = React.useState(false);
  const [editingCaption, setEditingCaption] = React.useState(false);
  const [captionDraft, setCaptionDraft] = React.useState("");
  const [savingCaption, setSavingCaption] = React.useState(false);
  const [downloading, setDownloading] = React.useState(false);

  const caption = items[0]?.caption ?? "";
  const ids = items.map((i) => i.id);

  // Download images sequentially to avoid overwhelming mobile memory.
  const handleDownloadAll = async () => {
    if (downloading) return;
    try {
      setDownloading(true);
      for (let index = 0; index < items.length; index++) {
        const url = items[index].imageUrl;
        if (!url) continue;
        await downloadMedia(url, `carousel-${index + 1}.jpg`, "image/jpeg");
      }
    } finally {
      setDownloading(false);
    }
  };

  const handleDeleteAll = () => {
    if (window.confirm(`Delete all ${items.length} carousel images?`)) {
      onDeleteAll(ids);
    }
  };

  const startEditCaption = () => {
    setCaptionDraft(caption);
    setEditingCaption(true);
  };

  const cancelEditCaption = () => {
    setEditingCaption(false);
    setCaptionDraft("");
  };

  const saveCaption = async () => {
    if (!onCaptionChange || captionDraft.trim() === caption) {
      setEditingCaption(false);
      return;
    }
    try {
      setSavingCaption(true);
      await onCaptionChange(ids, captionDraft.trim());
      setEditingCaption(false);
      setCaptionDraft("");
    } finally {
      setSavingCaption(false);
    }
  };

  return (
    <Card
      variant="outlined"
      sx={{
        fontFamily: "Geist",
        borderRadius: 4,
        overflow: "hidden",
        borderColor: "divider",
        height: "100%",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Carousel badge */}
      <Box sx={{ px: 2, pt: 1.5, pb: 0.5 }}>
        <Chip
          icon={<CollectionsIcon sx={{ fontSize: 18 }} />}
          label="Carousel"
          size="small"
          sx={{
            fontWeight: 600,
            height: 24,
            "& .MuiChip-label": { px: 0.5 },
          }}
        />
      </Box>

      {/* Horizontal strip preview - 3 images side by side */}
      <Box
        onClick={() => setPreviewOpen(true)}
        sx={{
          position: "relative",
          display: "flex",
          flexDirection: "row",
          width: "100%",
          height: 180,
          bgcolor: "grey.100",
          cursor: "pointer",
          "&:hover .carousel-overlay": { opacity: 0.6 },
          "&:hover .delete-btn": { opacity: 1 },
        }}
      >
        <Tooltip title="Delete carousel">
          <IconButton
            className="delete-btn"
            aria-label="Delete all"
            onClick={(e) => {
              e.stopPropagation();
              handleDeleteAll();
            }}
            size="small"
            sx={{
              position: "absolute",
              top: 8,
              right: 8,
              zIndex: 2,
              opacity: 0,
              transition: "opacity 0.2s ease",
              bgcolor: "rgba(255,255,255,0.9)",
              color: "error.main",
              "&:hover": {
                opacity: 1,
                bgcolor: "error.main",
                color: "error.contrastText",
                transform: "scale(1.08)",
              },
            }}
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        {items.map((item) => (
          <Box
            key={item.id}
            sx={{
              flex: 1,
              minWidth: 0,
              borderRight: (t) =>
                item.id !== items[items.length - 1].id
                  ? `1px solid ${t.palette.divider}`
                  : "none",
            }}
          >
            {item.imageUrl && (
              <Box
                component="img"
                src={item.imageUrl}
                alt={`Carousel ${items.indexOf(item) + 1}`}
                sx={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                }}
              />
            )}
          </Box>
        ))}
        <Box
          className="carousel-overlay"
          sx={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            bgcolor: "rgba(0,0,0,0.3)",
            opacity: 0,
            transition: "opacity 0.2s ease",
            pointerEvents: "none",
          }}
        >
          <CollectionsIcon
            sx={{
              fontSize: 48,
              color: "white",
              filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.5))",
            }}
          />
        </Box>
      </Box>

      {/* Caption - editable when onCaptionChange is provided */}
      <Box sx={{ px: 2, py: 1, display: "flex", alignItems: "flex-start", gap: 0.5 }}>
        {editingCaption ? (
          <Stack direction="row" spacing={1} sx={{ flex: 1, minWidth: 0 }}>
            <TextField
              size="small"
              fullWidth
              multiline
              maxRows={3}
              value={captionDraft}
              onChange={(e) => setCaptionDraft(e.target.value)}
              placeholder="Carousel caption..."
              sx={{ "& .MuiInputBase-root": { fontSize: "0.875rem" } }}
              autoFocus
            />
            <Button
              size="small"
              variant="contained"
              onClick={saveCaption}
              disabled={savingCaption || captionDraft.trim() === caption}
              sx={{ textTransform: "none", fontWeight: 700, flexShrink: 0 }}
            >
              {savingCaption ? "Saving…" : "Save"}
            </Button>
            <Button
              size="small"
              variant="outlined"
              onClick={cancelEditCaption}
              disabled={savingCaption}
              sx={{ textTransform: "none", flexShrink: 0 }}
            >
              Cancel
            </Button>
          </Stack>
        ) : (
          <>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{
                flex: 1,
                overflow: "hidden",
                textOverflow: "ellipsis",
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
              }}
            >
              {caption || "No caption"}
            </Typography>
            {onCaptionChange && (
              <Tooltip title="Edit caption">
                <IconButton size="small" onClick={startEditCaption} sx={{ flexShrink: 0 }}>
                  <EditIcon sx={{ fontSize: 18 }} />
                </IconButton>
              </Tooltip>
            )}
          </>
        )}
      </Box>

      {/* Actions */}
      <Box
        sx={{
          px: 2,
          pb: 2,
          pt: 1.5,
          display: "flex",
          gap: 1,
          borderTop: 1,
          borderColor: "divider",
          mt: "auto",
        }}
      >
        <Button
          startIcon={downloading ? <CircularProgress size={16} /> : <DownloadIcon />}
          onClick={handleDownloadAll}
          disabled={downloading}
          variant="outlined"
          size="small"
          sx={{ textTransform: "none", fontWeight: 700 }}
        >
          {downloading ? "Downloading…" : "Download All"}
        </Button>
        <Button
          startIcon={<CollectionsIcon />}
          onClick={() => setPreviewOpen(true)}
          variant="outlined"
          size="small"
          sx={{ textTransform: "none", fontWeight: 700 }}
        >
          Preview
        </Button>
      </Box>

      {/* Preview Modal */}
      <Dialog
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            overflow: "hidden",
            maxHeight: "90vh",
          },
        }}
      >
        <DialogContent
          sx={{
            p: 2,
            display: "flex",
            flexDirection: "row",
            gap: 2,
            overflowX: "auto",
            justifyContent: "center",
          }}
        >
          {items.map((item, index) => (
            <Box
              key={item.id}
              sx={{
                flex: "0 0 auto",
                maxWidth: "min(33%, 280px)",
                minWidth: 200,
              }}
            >
              {item.imageUrl && (
                <Box
                  component="img"
                  src={item.imageUrl}
                  alt={`Carousel ${index + 1}`}
                  sx={{
                    width: "100%",
                    height: "auto",
                    objectFit: "contain",
                    borderRadius: 1,
                    border: 1,
                    borderColor: "divider",
                  }}
                />
              )}
              {item.caption && (
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: "block", mt: 0.5 }}
                >
                  {item.caption.substring(0, 60)}
                  {item.caption.length > 60 ? "…" : ""}
                </Typography>
              )}
            </Box>
          ))}
        </DialogContent>
        <DialogActions sx={{ px: 2, py: 1.5 }}>
          <Button
            startIcon={downloading ? <CircularProgress size={18} /> : <DownloadIcon />}
            onClick={handleDownloadAll}
            disabled={downloading}
            variant="outlined"
            sx={{ textTransform: "none", fontWeight: 700 }}
          >
            {downloading ? "Downloading…" : "Download All"}
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
}
