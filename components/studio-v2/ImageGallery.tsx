"use client";

import React, { useState } from "react";
import {
  Box,
  Dialog,
  DialogContent,
  IconButton,
  Tooltip,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import DownloadOutlinedIcon from "@mui/icons-material/DownloadOutlined";

export interface GeneratedImageItem {
  id: string;
  bytesBase64: string;
  /** Public URL from Supabase Storage. Preferred over bytesBase64 for display. */
  imageUrl?: string;
  mimeType: string;
  prompt: string;
  modelVariant: string;
  aspectRatio: string;
  timestamp: string;
}

interface ImageGalleryProps {
  images: GeneratedImageItem[];
  emptyLabel?: string;
}

function resolveImageSrc(image: GeneratedImageItem): string {
  if (image.imageUrl) return image.imageUrl;
  return `data:${image.mimeType};base64,${image.bytesBase64}`;
}

function downloadImage(image: GeneratedImageItem) {
  const link = document.createElement("a");
  link.href = resolveImageSrc(image);
  const ext = image.mimeType.includes("png") ? "png" : "jpg";
  link.download = `generated-image-${image.id}.${ext}`;
  link.click();
}

function ImageCard({
  image,
  onClick,
}: {
  image: GeneratedImageItem;
  onClick: () => void;
}) {
  return (
    <Box
      onClick={onClick}
      sx={{
        position: "relative",
        breakInside: "avoid",
        mb: 1,
        borderRadius: 2,
        overflow: "hidden",
        cursor: "pointer",
        display: "block",
        "&:hover .img-overlay": { opacity: 1 },
      }}
    >
      <Box
        component="img"
        src={resolveImageSrc(image)}
        alt={image.prompt}
        sx={{
          width: "100%",
          display: "block",
          borderRadius: 2,
          transition: "transform 0.2s",
          "&:hover": { transform: "scale(1.01)" },
        }}
        onError={(e) => {
          (e.target as HTMLImageElement).style.display = "none";
        }}
      />
      <Box
        className="img-overlay"
        sx={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 60%)",
          opacity: 0,
          transition: "opacity 0.2s",
          borderRadius: 2,
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          p: 1,
        }}
      >
        <Typography
          variant="caption"
          sx={{
            color: "white",
            fontSize: 11,
            lineHeight: 1.3,
            overflow: "hidden",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
          }}
        >
          {image.prompt}
        </Typography>
      </Box>
    </Box>
  );
}

export default function ImageGallery({
  images,
  emptyLabel = "No images yet",
}: ImageGalleryProps) {
  const [lightboxImage, setLightboxImage] = useState<GeneratedImageItem | null>(null);

  if (images.length === 0) {
    return (
      <Box
        sx={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 1,
          color: "text.disabled",
          py: 8,
        }}
      >
        <Typography variant="body2">{emptyLabel}</Typography>
      </Box>
    );
  }

  return (
    <>
      <Box
        sx={{
          columns: { xs: 2, sm: 3, md: 4 },
          columnGap: 1,
          p: 1,
        }}
      >
        {images.map((img) => (
          <ImageCard key={img.id} image={img} onClick={() => setLightboxImage(img)} />
        ))}
      </Box>

      <Dialog
        open={Boolean(lightboxImage)}
        onClose={() => setLightboxImage(null)}
        maxWidth="md"
        PaperProps={{
          sx: { bgcolor: "background.paper", borderRadius: 3, overflow: "hidden" },
        }}
      >
        {lightboxImage && (
          <DialogContent sx={{ p: 0, position: "relative" }}>
            <Box
              sx={{
                position: "absolute",
                top: 8,
                right: 8,
                zIndex: 1,
                display: "flex",
                gap: 0.5,
              }}
            >
              <Tooltip title="Download">
                <IconButton
                  size="small"
                  onClick={() => downloadImage(lightboxImage)}
                  sx={{ bgcolor: "rgba(0,0,0,0.5)", color: "white", "&:hover": { bgcolor: "rgba(0,0,0,0.75)" } }}
                >
                  <DownloadOutlinedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <IconButton
                size="small"
                onClick={() => setLightboxImage(null)}
                sx={{ bgcolor: "rgba(0,0,0,0.5)", color: "white", "&:hover": { bgcolor: "rgba(0,0,0,0.75)" } }}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            </Box>
            <Box
              component="img"
              src={resolveImageSrc(lightboxImage)}
              alt={lightboxImage.prompt}
              sx={{ width: "100%", display: "block", maxHeight: "80vh", objectFit: "contain" }}
            />
            <Box sx={{ px: 2, py: 1.5 }}>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: 12 }}>
                {lightboxImage.prompt}
              </Typography>
              <Typography variant="caption" color="text.disabled" sx={{ fontSize: 11 }}>
                {lightboxImage.modelVariant} · {lightboxImage.aspectRatio}
              </Typography>
            </Box>
          </DialogContent>
        )}
      </Dialog>
    </>
  );
}
