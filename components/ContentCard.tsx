"use client";

import type { ContentItem } from "@/lib/types";
import { downloadMedia } from "@/lib/downloadMedia";
import Image from "next/image";
import {
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  FormControlLabel,
  IconButton,
  Radio,
  RadioGroup,
  Tooltip,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import DownloadIcon from "@mui/icons-material/Download";
import PlayCircleFilledIcon from "@mui/icons-material/PlayCircleFilled";
import React from "react";

export type ContentCardProps = {
  item: ContentItem;
  campaignName?: string;
  onDelete: (id: string) => void;
  /** When present, shows Reel/Story toggle for 9:16 video or image content */
  mediaType?: "REELS" | "STORIES";
  onMediaTypeChange?: (type: "REELS" | "STORIES") => void;
};

export default function ContentCard({
  item,
  campaignName,
  onDelete,
  mediaType,
  onMediaTypeChange,
}: ContentCardProps) {
  const [previewOpen, setPreviewOpen] = React.useState(false);
  const [downloading, setDownloading] = React.useState(false);

  const hasMedia =
    (item.assetType === "video" && item.videoUrl) ||
    (item.assetType === "image" && item.imageUrl);

  const handleDownload = async () => {
    const url = item.assetType === "video" ? item.videoUrl : item.imageUrl;
    if (!url || downloading) return;
    const isVideo = item.assetType === "video";
    const filename = `content-${item.id}.${isVideo ? "mp4" : "jpg"}`;
    const mimeType = isVideo ? "video/mp4" : "image/jpeg";
    try {
      setDownloading(true);
      await downloadMedia(url, filename, mimeType);
    } finally {
      setDownloading(false);
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

      {/* Media Section - clickable thumbnail */}
      <Box
        onClick={() => hasMedia && setPreviewOpen(true)}
        sx={{
          position: "relative",
          width: "100%",
          height: 280,
          bgcolor: "grey.100",
          cursor: hasMedia ? "pointer" : "default",
          "&:hover .media-overlay": {
            opacity: 1,
          },
          "&:hover .delete-btn": {
            opacity: 1,
          },
        }}
      >
        {/* Delete button - top right, visible on hover */}
        <Tooltip title="Delete content">
          <IconButton
            className="delete-btn"
            aria-label="Delete"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(item.id);
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
        {hasMedia && (
          <Box
            className="media-overlay"
            sx={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              bgcolor: "rgba(0,0,0,0.3)",
              opacity: item.assetType === "video" ? 0.6 : 0,
              transition: "opacity 0.2s ease",
            }}
          >
            <PlayCircleFilledIcon
              sx={{
                fontSize: 64,
                color: "white",
                filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.5))",
              }}
            />
          </Box>
        )}
      </Box>

      {/* Reel / Story radio buttons - horizontal: Reel left, Story right */}
      {mediaType != null && onMediaTypeChange && (
        <Box sx={{ px: 2, py: 1.5, borderTop: 1, borderColor: "divider" }}>
          <RadioGroup
            row
            value={mediaType}
            onChange={(e) => onMediaTypeChange(e.target.value as "REELS" | "STORIES")}
            sx={{ gap: 2, justifyContent: "flex-start" }}
          >
            <FormControlLabel
              value="REELS"
              control={<Radio size="small" />}
              label={
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Image
                    src="/icons/reels-logo.png"
                    alt="Reels"
                    width={20}
                    height={20}
                  />
                  <span style={{ fontWeight: 600 }}>Reel</span>
                </Box>
              }
              sx={{ m: 0 }}
            />
            <FormControlLabel
              value="STORIES"
              control={<Radio size="small" />}
              label={
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <AddIcon sx={{ fontSize: 20 }} />
                  <span style={{ fontWeight: 600 }}>Story</span>
                </Box>
              }
              sx={{ m: 0 }}
            />
          </RadioGroup>
        </Box>
      )}

      {/* Media Preview Modal */}
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
          sx={{ p: 0, "&.MuiDialogContent-root": { overflow: "hidden" } }}
        >
          {item.assetType === "video" && item.videoUrl ? (
            <video
              src={item.videoUrl}
              controls
              autoPlay
              style={{
                width: "100%",
                maxHeight: "80vh",
                display: "block",
              }}
            />
          ) : item.assetType === "image" && item.imageUrl ? (
            <Box
              component="img"
              src={item.imageUrl}
              alt="Generated content"
              sx={{
                width: "100%",
                maxHeight: "80vh",
                objectFit: "contain",
                display: "block",
              }}
            />
          ) : null}
        </DialogContent>
        {hasMedia && (
          <DialogActions sx={{ px: 2, py: 1.5, flexWrap: "wrap", gap: 2, alignItems: "center" }}>
            {mediaType != null && onMediaTypeChange && (
              <RadioGroup
                row
                value={mediaType}
                onChange={(e) => onMediaTypeChange(e.target.value as "REELS" | "STORIES")}
                sx={{ gap: 2, mr: 1 }}
              >
                <FormControlLabel
                  value="REELS"
                  control={<Radio size="small" />}
                  label={
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                      <Image
                        src="/icons/reels-logo.png"
                        alt="Reels"
                        width={18}
                        height={18}
                      />
                      <span style={{ fontWeight: 600 }}>Reel</span>
                    </Box>
                  }
                  sx={{ m: 0 }}
                />
                <FormControlLabel
                  value="STORIES"
                  control={<Radio size="small" />}
                  label={
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                      <AddIcon sx={{ fontSize: 18 }} />
                      <span style={{ fontWeight: 600 }}>Story</span>
                    </Box>
                  }
                  sx={{ m: 0 }}
                />
              </RadioGroup>
            )}
            <Button
              startIcon={downloading ? <CircularProgress size={18} /> : <DownloadIcon />}
              onClick={handleDownload}
              disabled={downloading}
              variant="outlined"
              sx={{ textTransform: "none", fontWeight: 700 }}
            >
              {downloading ? "Downloading…" : `Download ${item.assetType === "video" ? "video" : "image"}`}
            </Button>
          </DialogActions>
        )}
      </Dialog>
    </Card>
  );
}
