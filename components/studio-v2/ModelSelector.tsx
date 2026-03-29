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
}

export default function ModelSelector({
  models,
  selectedModelId,
  onSelect,
}: ModelSelectorProps) {
  if (models.length === 0) return null;

  return (
    <FormControl size="small" fullWidth>
      <Select
        value={selectedModelId ?? ""}
        onChange={(e) => e.target.value && onSelect(e.target.value as string)}
        displayEmpty
        renderValue={(v) => {
          const model = models.find((m) => m.model_id === v);
          if (!model) return <Typography variant="caption" color="text.disabled">Select model</Typography>;
          return (
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
              <MediaIcon mediaType={model.media_type} />
              <Typography variant="caption" fontWeight={700} sx={{ lineHeight: 1 }}>
                {model.label}
              </Typography>
            </Box>
          );
        }}
        sx={{ "& .MuiSelect-select": { py: 0.75 } }}
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
