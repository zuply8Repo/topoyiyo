"use client";

import React, { useEffect, useState } from "react";
import { Box, Typography, alpha, useTheme } from "@mui/material";
import ImageExplorePanel from "./ImageExplorePanel";
import ImageGallery, { type GeneratedImageItem } from "./ImageGallery";

const LS_KEY_PREFIX = "studio-v2-imagen-images";

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

  // Load persisted images from localStorage
  useEffect(() => {
    if (!userId) return;
    try {
      const raw = localStorage.getItem(`${LS_KEY_PREFIX}-${userId}`);
      if (raw) {
        const parsed = JSON.parse(raw) as GeneratedImageItem[];
        setImages(parsed);
      }
    } catch {
      // ignore parse errors
    }
  }, [userId]);

  const handleImagesChange = (updated: GeneratedImageItem[]) => {
    setImages(updated);
    try {
      localStorage.setItem(`${LS_KEY_PREFIX}-${userId}`, JSON.stringify(updated));
    } catch {
      // ignore storage errors
    }
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
