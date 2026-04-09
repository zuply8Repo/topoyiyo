"use client";

import React from "react";
import {
  Box,
  FormControl,
  MenuItem,
  Select,
  Typography,
} from "@mui/material";
import VideocamOutlinedIcon from "@mui/icons-material/VideocamOutlined";
import ImageOutlinedIcon from "@mui/icons-material/ImageOutlined";
import AudiotrackOutlinedIcon from "@mui/icons-material/AudiotrackOutlined";
import AutoAwesomeOutlinedIcon from "@mui/icons-material/AutoAwesomeOutlined";
import type { StudioV2ModelSummary } from "@/lib/api";

function MediaIcon({ mediaType }: { mediaType: string }) {
  const sx = { fontSize: 15, flexShrink: 0 };
  if (mediaType === "image") return <ImageOutlinedIcon sx={sx} />;
  if (mediaType === "audio") return <AudiotrackOutlinedIcon sx={sx} />;
  if (mediaType === "video") return <VideocamOutlinedIcon sx={sx} />;
  return <AutoAwesomeOutlinedIcon sx={sx} />;
}

interface ModelSelectorProps {
  models: StudioV2ModelSummary[];
  selectedModelId: string | null;
  onSelect: (modelId: string) => void;
  /** Compact control over video; top-right via parent `position: relative`. */
  variant?: "default" | "overlay";
}

export default function ModelSelector({
  models,
  selectedModelId,
  onSelect,
  variant = "default",
}: ModelSelectorProps) {
  if (models.length === 0) return null;

  const isOverlay = variant === "overlay";

  const formSx = isOverlay
    ? {
        position: "absolute" as const,
        top: 8,
        right: 8,
        zIndex: 1,
        width: "auto",
        maxWidth: "min(220px, calc(100% - 16px))",
        minWidth: 0,
      }
    : {};

  const selectSx = isOverlay
    ? {
        "& .MuiOutlinedInput-notchedOutline": {
          borderColor: "rgba(255,255,255,0.35)",
        },
        "&:hover .MuiOutlinedInput-notchedOutline": {
          borderColor: "rgba(255,255,255,0.55)",
        },
        "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
          borderColor: "rgba(255,255,255,0.75)",
        },
        bgcolor: "rgba(0,0,0,0.52)",
        backdropFilter: "blur(10px)",
        borderRadius: 1,
        "& .MuiSelect-select": {
          py: 0.45,
          pr: "28px !important",
          pl: 1,
          color: "common.white",
          display: "flex",
          alignItems: "center",
        },
        "& .MuiSelect-icon": { color: "rgba(255,255,255,0.9)" },
      }
    : { "& .MuiSelect-select": { py: 0.75 } };

  return (
    <FormControl size="small" fullWidth={!isOverlay} sx={formSx}>
      <Select
        value={selectedModelId ?? ""}
        onChange={(e) => e.target.value && onSelect(e.target.value as string)}
        displayEmpty
        renderValue={(v) => {
          const model = models.find((m) => m.model_id === v);
          if (!model) {
            return (
              <Typography
                variant="caption"
                color={isOverlay ? "grey.300" : "text.disabled"}
              >
                Select model
              </Typography>
            );
          }
          return (
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 0.75,
                color: isOverlay ? "common.white" : undefined,
                "& .MuiSvgIcon-root": isOverlay ? { color: "common.white" } : undefined,
              }}
            >
              <MediaIcon mediaType={model.media_type} />
              <Typography
                variant="caption"
                fontWeight={700}
                sx={{
                  lineHeight: 1,
                  color: isOverlay ? "common.white" : undefined,
                }}
              >
                {model.label}
              </Typography>
            </Box>
          );
        }}
        sx={selectSx}
      >
        {models.map((m) => (
          <MenuItem key={m.model_id} value={m.model_id} dense>
            <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1, py: 0.25 }}>
              <MediaIcon mediaType={m.media_type} />
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="body2" fontWeight={600} lineHeight={1.3}>
                  {m.label}
                </Typography>
                {m.description && (
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    display="block"
                    sx={{ fontSize: 11, mt: 0.25 }}
                  >
                    {m.description}
                  </Typography>
                )}
              </Box>
            </Box>
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}
