"use client";

import React from "react";
import { Box, Paper, Stack, Typography } from "@mui/material";
import SchemaFieldRenderer from "./SchemaFieldRenderer";
import type { StudioV2FieldSchema } from "@/lib/api";

/** Returns true if the field should be visible given the current form state. */
function isFieldVisible(
  field: StudioV2FieldSchema,
  formState: Record<string, unknown>
): boolean {
  if (!field.visible_when) return true;
  return Object.entries(field.visible_when).every(
    ([key, val]) => formState[key] === val
  );
}

interface MediaInputPanelProps {
  fields: StudioV2FieldSchema[];
  formState: Record<string, unknown>;
  onFieldChange: (fieldId: string, value: unknown) => void;
  errors?: Record<string, string>;
}

export default function MediaInputPanel({
  fields,
  formState,
  onFieldChange,
  errors = {},
}: MediaInputPanelProps) {
  const mediaFields = fields
    .filter((f) => f.group === "media")
    .filter((f) => isFieldVisible(f, formState));

  if (mediaFields.length === 0) return null;

  return (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
      <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>
        Media inputs
      </Typography>
      <Stack spacing={2}>
        {mediaFields.map((field) => (
          <Box key={field.id}>
            <SchemaFieldRenderer
              field={field}
              value={formState[field.id]}
              onChange={onFieldChange}
              error={errors[field.id]}
            />
          </Box>
        ))}
      </Stack>
    </Paper>
  );
}
