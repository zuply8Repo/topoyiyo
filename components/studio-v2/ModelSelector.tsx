"use client";

import React from "react";
import { Box, Card, CardActionArea, CardContent, Stack, Typography } from "@mui/material";
import type { StudioV2ModelSummary } from "@/lib/api";

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
  if (models.length === 0) {
    return (
      <Typography color="text.secondary">No models available.</Typography>
    );
  }

  return (
    <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
      {models.map((m) => (
        <Card
          key={m.model_id}
          variant="outlined"
          sx={{
            minWidth: 160,
            maxWidth: 200,
            borderWidth: 2,
            borderColor:
              selectedModelId === m.model_id ? "primary.main" : "divider",
            bgcolor:
              selectedModelId === m.model_id ? "action.selected" : "background.paper",
          }}
        >
          <CardActionArea onClick={() => onSelect(m.model_id)}>
            <CardContent sx={{ p: 2 }}>
              <Typography variant="subtitle1" fontWeight={700}>
                {m.label}
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ textTransform: "capitalize" }}
              >
                {m.media_type}
              </Typography>
              {m.description && (
                <Typography
                  variant="caption"
                  display="block"
                  sx={{ mt: 1, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}
                >
                  {m.description}
                </Typography>
              )}
            </CardContent>
          </CardActionArea>
        </Card>
      ))}
    </Stack>
  );
}
