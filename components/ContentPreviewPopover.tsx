"use client";

import type { ContentItem } from "@/lib/types";
import type { InstagramMediaType } from "@/lib/types";
import {
  Box,
  Chip,
  Paper,
  Popover,
  Stack,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import CollectionsIcon from "@mui/icons-material/Collections";
import Image from "next/image";
import React from "react";

export type ContentPreviewPopoverProps = {
  open: boolean;
  anchorEl: HTMLElement | null;
  onClose: () => void;
  /** Single item for video/story; multiple for carousel */
  items: ContentItem[];
  /** Inferred or selected: REELS, STORIES, or CAROUSEL */
  mediaType: InstagramMediaType;
};

const REELS_LOGO_PATH = "/icons/reels-logo.png";

function MediaTypeBadge({ mediaType }: { mediaType: InstagramMediaType }) {
  if (mediaType === "REELS") {
    return (
      <Chip
        icon={
          <Image src={REELS_LOGO_PATH} alt="Reel" width={16} height={16} />
        }
        label="Reel"
        size="small"
        sx={{ fontWeight: 700, "& .MuiChip-icon": { ml: 0.5 } }}
      />
    );
  }
  if (mediaType === "STORIES") {
    return (
      <Chip
        icon={<AddIcon sx={{ fontSize: 16 }} />}
        label="Story"
        size="small"
        sx={{ fontWeight: 700, "& .MuiChip-icon": { ml: 0.5 } }}
      />
    );
  }
  return (
    <Chip
      icon={<CollectionsIcon sx={{ fontSize: 16 }} />}
      label="Carousel"
      size="small"
      sx={{ fontWeight: 700, "& .MuiChip-icon": { ml: 0.5 } }}
    />
  );
}

export default function ContentPreviewPopover({
  open,
  anchorEl,
  onClose,
  items,
  mediaType,
}: ContentPreviewPopoverProps) {
  const isCarousel = items.length > 1;
  const first = items[0];
  const isVideo = first?.assetType === "video";

  return (
    <Popover
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      transformOrigin={{ vertical: "top", horizontal: "center" }}
      slotProps={{
        paper: {
          sx: {
            borderRadius: 3,
            overflow: "hidden",
            maxWidth: 360,
            boxShadow: 4,
          },
        },
      }}
    >
      <Paper variant="outlined" sx={{ overflow: "hidden", border: "none" }}>
        <Stack>
          {/* Type badge */}
          <Box sx={{ px: 1.5, pt: 1, pb: 0.5 }}>
            <MediaTypeBadge mediaType={mediaType} />
          </Box>

          {/* Media area */}
          <Box
            sx={{
              position: "relative",
              width: 320,
              height: isCarousel ? 120 : 200,
              bgcolor: "grey.900",
            }}
          >
            {isCarousel ? (
              <Stack direction="row" sx={{ height: "100%" }}>
                {items.map((item) => (
                  <Box
                    key={item.id}
                    sx={{
                      flex: 1,
                      minWidth: 0,
                      borderRight: 1,
                      borderColor: "divider",
                    }}
                  >
                    {item.imageUrl && (
                      <Box
                        component="img"
                        src={item.imageUrl}
                        alt=""
                        sx={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                        }}
                      />
                    )}
                  </Box>
                ))}
              </Stack>
            ) : isVideo && first?.videoUrl ? (
              <video
                src={first.videoUrl}
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
            ) : first?.imageUrl ? (
              <Box
                component="img"
                src={first.imageUrl}
                alt=""
                sx={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                }}
              />
            ) : null}
          </Box>

          {/* Title/caption */}
          <Box sx={{ px: 1.5, py: 1 }}>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{
                overflow: "hidden",
                textOverflow: "ellipsis",
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
              }}
            >
              {isCarousel
                ? (() => {
                    const raw = items[0]?.caption ?? "";
                    const withoutPrefix = raw.replace(/^Carousel image -\s*carousel_post_\d+_img_\d+\s*/i, "").trim();
                    return withoutPrefix || "Carousel post";
                  })()
                : first?.caption || "No caption"}
            </Typography>
          </Box>
        </Stack>
      </Paper>
    </Popover>
  );
}
