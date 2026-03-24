"use client";

import React from "react";
import { Alert, Box, Paper, Stack, Typography } from "@mui/material";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
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

interface GenerationSettingsPanelProps {
  fields: StudioV2FieldSchema[];
  formState: Record<string, unknown>;
  onFieldChange: (fieldId: string, value: unknown) => void;
  errors?: Record<string, string>;
  /** Shown as an info banner when cross-field constraints have been auto-applied. */
  constraintMessage?: string;
}

export default function GenerationSettingsPanel({
  fields,
  formState,
  onFieldChange,
  errors = {},
  constraintMessage,
}: GenerationSettingsPanelProps) {
  const settingsFields = fields
    .filter((f) => f.group === "settings")
    .filter((f) => isFieldVisible(f, formState));

  if (settingsFields.length === 0) return null;

  return (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
      <Typography variant="subtitle1" fontWeight={700} sx={{ mb: constraintMessage ? 1 : 2 }}>
        Generation settings
      </Typography>

      {constraintMessage && (
        <Alert
          severity="info"
          icon={<InfoOutlinedIcon fontSize="small" />}
          variant="outlined"
          sx={{ mb: 2, py: 0.5 }}
        >
          {constraintMessage}
        </Alert>
      )}

      <Stack spacing={2} direction={{ xs: "column", sm: "row" }} flexWrap="wrap">
        {settingsFields.map((field) => (
          <Box key={field.id} sx={{ minWidth: 160, maxWidth: 280 }}>
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
