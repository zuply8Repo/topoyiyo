"use client";

import React, { useEffect, useState } from "react";
import { Box, Typography, alpha, useTheme } from "@mui/material";
import ImageExplorePanel from "./ImageExplorePanel";
import ImageGallery, { type GeneratedImageItem } from "./ImageGallery";

type ImageTab = "explore" | "your-own";

interface ImageStudioPanelProps {
  userId: string;
  getToken: () => Promise<string | null>;
}

function TabButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  const theme = useTheme();
  return (
    <Box
      onClick={onClick}
      sx={{
        px: 2,
        py: 0.6,
        borderRadius: "8px 8px 0 0",
        cursor: "pointer",
        bgcolor: active
          ? "background.paper"
          : alpha(theme.palette.action.hover, 0.05),
        borderTop: "1.5px solid",
        borderLeft: "1.5px solid",
        borderRight: "1.5px solid",
        borderBottom: active ? "1.5px solid" : "none",
        borderColor: active ? "divider" : "transparent",
        marginBottom: active ? "-1.5px" : "0px",
        transition: "all 0.15s",
        userSelect: "none",
        zIndex: active ? 1 : 0,
        position: "relative",
      }}
    >
      <Typography
        variant="caption"
        fontWeight={active ? 700 : 500}
        color={active ? "text.primary" : "text.secondary"}
        sx={{ fontSize: 12, lineHeight: 1 }}
      >
        {label}
      </Typography>
    </Box>
  );
}

export default function ImageStudioPanel({
  userId,
  getToken,
}: ImageStudioPanelProps) {
  const [activeTab, setActiveTab] = useState<ImageTab>("explore");
  const [images, setImages] = useState<GeneratedImageItem[]>([]);

  // Load persisted images from DB on mount
  useEffect(() => {
    if (!userId) return;

    const load = async () => {
      try {
        const res = await fetch("/api/studio-v2/images");
        if (!res.ok) throw new Error("Failed to fetch images");
        const { images: dbImages } = await res.json() as {
          images: Array<{
            id: string;
            imageUrl: string;
            mimeType: string;
            prompt: string;
            modelVariant: string;
            aspectRatio: string;
            timestamp: string;
          }>;
        };
        setImages(
          dbImages.map((img) => ({
            id: img.id,
            bytesBase64: "",          // not stored locally; use imageUrl for display
            imageUrl: img.imageUrl,
            mimeType: img.mimeType,
            prompt: img.prompt,
            modelVariant: img.modelVariant,
            aspectRatio: img.aspectRatio,
            timestamp: img.timestamp,
          }))
        );
      } catch (e) {
        console.warn("[image-studio] DB load failed, falling back to localStorage", e);
        // Fallback to localStorage for resilience
        try {
          const raw = localStorage.getItem(`studio-v2-imagen-images-${userId}`);
          if (raw) setImages(JSON.parse(raw));
        } catch { /* ignore */ }
      }
    };

    load();
  }, [userId]);

  /**
   * Called by ImageExplorePanel when new images are generated.
   * Saves each new image to the DB (and falls back to localStorage if needed).
   */
  const handleImagesChange = async (updated: GeneratedImageItem[]) => {
    // Detect newly added images (those without an imageUrl yet are brand-new base64 results)
    const newImages = updated.filter(
      (img) => !images.some((existing) => existing.id === img.id)
    );

    const savedImages: GeneratedImageItem[] = [];

    for (const img of newImages) {
      if (!img.bytesBase64) continue;
      try {
        const res = await fetch("/api/studio-v2/images", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            bytesBase64: img.bytesBase64,
            mimeType: img.mimeType,
            prompt: img.prompt,
            modelVariant: img.modelVariant,
            aspectRatio: img.aspectRatio,
          }),
        });

        if (res.ok) {
          const { image } = await res.json() as {
            image: {
              id: string;
              imageUrl: string;
              mimeType: string;
              prompt: string;
              modelVariant: string;
              aspectRatio: string;
              timestamp: string;
            };
          };
          savedImages.push({
            id: image.id,
            bytesBase64: "",           // no longer needed once saved to storage
            imageUrl: image.imageUrl,
            mimeType: image.mimeType,
            prompt: image.prompt,
            modelVariant: image.modelVariant,
            aspectRatio: image.aspectRatio,
            timestamp: image.timestamp,
          });
        } else {
          // DB save failed — keep original (with base64) so it still displays
          savedImages.push(img);
        }
      } catch {
        savedImages.push(img);
      }
    }

    // Merge: existing DB images first, then new ones prepended
    const existingIds = new Set(images.map((i) => i.id));
    const merged = [
      ...savedImages,
      ...updated.filter((i) => existingIds.has(i.id)),
    ];
    setImages(merged);
  };

  return (
    <Box
      sx={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Folder tabs */}
      <Box
        sx={{
          display: "flex",
          alignItems: "flex-end",
          px: 2,
          pt: 1.5,
          borderBottom: "1.5px solid",
          borderColor: "divider",
          gap: 0.5,
        }}
      >
        <TabButton
          label="Explore"
          active={activeTab === "explore"}
          onClick={() => setActiveTab("explore")}
        />
        <TabButton
          label="Your Own"
          active={activeTab === "your-own"}
          onClick={() => setActiveTab("your-own")}
        />
      </Box>

      {/* Tab content */}
      {activeTab === "explore" ? (
        <ImageExplorePanel
          images={images}
          onImagesChange={handleImagesChange}
          getToken={getToken}
        />
      ) : (
        <Box sx={{ flex: 1, overflow: "auto" }}>
          <ImageGallery
            images={images}
            emptyLabel="Your generated images will appear here"
          />
        </Box>
      )}
    </Box>
  );
}
