"use client";

import React, { useRef } from "react";
import { Box, Tooltip, Typography, alpha, useTheme } from "@mui/material";
import AddPhotoAlternateOutlinedIcon from "@mui/icons-material/AddPhotoAlternateOutlined";
import VideoFileOutlinedIcon from "@mui/icons-material/VideoFileOutlined";
import CloseIcon from "@mui/icons-material/Close";
import type { StudioV2FieldSchema } from "@/lib/api";

function isFieldVisible(
  field: StudioV2FieldSchema,
  formState: Record<string, unknown>,
): boolean {
  if (!field.visible_when) return true;
  return Object.entries(field.visible_when).every(
    ([key, val]) => formState[key] === val,
  );
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.includes(",") ? result.split(",")[1] : result;
      resolve(base64 ?? "");
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

interface UploadCardProps {
  field: StudioV2FieldSchema;
  value: unknown;
  onChange: (fieldId: string, value: unknown) => void;
  error?: string;
}

function SingleUploadCard({ field, value, onChange, error }: UploadCardProps) {
  const theme = useTheme();
  const inputRef = useRef<HTMLInputElement>(null);
  const hasImage = typeof value === "string" && Boolean(value);
  const shortLabel = field.label.split(" ")[0];

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const b64 = await fileToBase64(file);
      onChange(field.id, b64);
    } catch {
      // ignore
    }
    e.target.value = "";
  };

  return (
    <Tooltip title={field.label} placement="top">
      <Box
        sx={{
          flex: 1,
          height: 88,
          position: "relative",
          borderRadius: 2,
          border: "1.5px dashed",
          borderColor: error
            ? "error.main"
            : hasImage
              ? "primary.main"
              : "divider",
          bgcolor: hasImage
            ? "transparent"
            : alpha(theme.palette.action.hover, 0.03),
          cursor: "pointer",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          transition: "border-color 0.2s, background-color 0.2s",
          "&:hover": {
            borderColor: "primary.main",
            bgcolor: alpha(theme.palette.primary.main, 0.04),
          },
        }}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          accept="image/*"
          type="file"
          hidden
          onChange={handleFileChange}
        />

        {hasImage ? (
          <>
            <Box
              component="img"
              src={`data:image/png;base64,${value}`}
              alt={field.label}
              sx={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                objectFit: "cover",
                borderRadius: 1.5,
              }}
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
            <Box
              onClick={(e) => {
                e.stopPropagation();
                onChange(field.id, "");
              }}
              sx={{
                position: "absolute",
                top: 4,
                right: 4,
                width: 20,
                height: 20,
                borderRadius: "50%",
                bgcolor: "rgba(0,0,0,0.55)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                zIndex: 1,
                "&:hover": { bgcolor: "rgba(0,0,0,0.8)" },
              }}
            >
              <CloseIcon sx={{ fontSize: 12, color: "white" }} />
            </Box>
          </>
        ) : (
          <>
            <AddPhotoAlternateOutlinedIcon
              sx={{ fontSize: 22, color: "text.disabled", mb: 0.5 }}
            />
            <Typography
              variant="caption"
              color="text.disabled"
              sx={{ fontSize: 10, lineHeight: 1.2, userSelect: "none" }}
            >
              {shortLabel}
            </Typography>
          </>
        )}
      </Box>
    </Tooltip>
  );
}

function ImageArrayCard({ field, value, onChange, error }: UploadCardProps) {
  const theme = useTheme();
  const inputRef = useRef<HTMLInputElement>(null);
  const arr = (Array.isArray(value) ? value : []) as string[];
  const maxItems = field.max_items ?? 3;
  const count = arr.filter(Boolean).length;

  const handleAdd = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const b64 = await fileToBase64(file);
      onChange(field.id, [...arr, b64]);
    } catch {
      // ignore
    }
    e.target.value = "";
  };

  const handleRemove = (i: number) => {
    const next = [...arr];
    next.splice(i, 1);
    onChange(field.id, next);
  };

  return (
    <Tooltip title={`${field.label} (${count}/${maxItems})`} placement="top">
      <Box
        sx={{
          flex: 1,
          height: 88,
          position: "relative",
          borderRadius: 2,
          border: "1.5px dashed",
          borderColor: error ? "error.main" : count > 0 ? "primary.main" : "divider",
          bgcolor: count > 0 ? "transparent" : alpha(theme.palette.action.hover, 0.03),
          cursor: count < maxItems ? "pointer" : "default",
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 0.5,
          p: 0.5,
          "&:hover": count < maxItems
            ? {
                borderColor: "primary.main",
                bgcolor: alpha(theme.palette.primary.main, 0.04),
              }
            : {},
        }}
        onClick={() => count < maxItems && inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          accept="image/*"
          type="file"
          hidden
          onChange={handleAdd}
        />

        {arr.map((item, i) => (
          <Box
            key={i}
            sx={{
              position: "relative",
              width: 28,
              height: 28,
              flexShrink: 0,
            }}
          >
            <Box
              component="img"
              src={`data:image/png;base64,${item}`}
              alt={`Ref ${i + 1}`}
              sx={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                borderRadius: 1,
                border: "1px solid",
                borderColor: "divider",
              }}
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
            <Box
              onClick={(e) => {
                e.stopPropagation();
                handleRemove(i);
              }}
              sx={{
                position: "absolute",
                top: -4,
                right: -4,
                width: 14,
                height: 14,
                borderRadius: "50%",
                bgcolor: "rgba(0,0,0,0.55)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                "&:hover": { bgcolor: "rgba(0,0,0,0.8)" },
              }}
            >
              <CloseIcon sx={{ fontSize: 9, color: "white" }} />
            </Box>
          </Box>
        ))}

        {count < maxItems && (
          <Box
            sx={{
              width: 28,
              height: 28,
              borderRadius: 1,
              border: "1px dashed",
              borderColor: "text.disabled",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <AddPhotoAlternateOutlinedIcon
              sx={{ fontSize: 14, color: "text.disabled" }}
            />
          </Box>
        )}

        {count === 0 && (
          <Box
            sx={{
              position: "absolute",
              bottom: 6,
              left: 0,
              right: 0,
              textAlign: "center",
            }}
          >
            <Typography
              variant="caption"
              color="text.disabled"
              sx={{ fontSize: 10, userSelect: "none" }}
            >
              {field.label.split(" ")[0]}
            </Typography>
          </Box>
        )}
      </Box>
    </Tooltip>
  );
}

function fileToBase64Video(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.includes(",") ? result.split(",")[1] : result;
      resolve(base64 ?? "");
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function VideoUploadCard({ field, value, onChange, error }: UploadCardProps) {
  const theme = useTheme();
  const inputRef = useRef<HTMLInputElement>(null);
  const hasVideo = typeof value === "string" && Boolean(value);
  const shortLabel = field.label.split(" ")[0];

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const b64 = await fileToBase64Video(file);
      onChange(field.id, b64);
    } catch {
      // ignore
    }
    e.target.value = "";
  };

  return (
    <Tooltip title={field.label} placement="top">
      <Box
        sx={{
          flex: 1,
          height: 88,
          position: "relative",
          borderRadius: 2,
          border: "1.5px dashed",
          borderColor: error
            ? "error.main"
            : hasVideo
              ? "secondary.main"
              : "divider",
          bgcolor: hasVideo
            ? alpha(theme.palette.secondary.main, 0.06)
            : alpha(theme.palette.action.hover, 0.03),
          cursor: "pointer",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          transition: "border-color 0.2s, background-color 0.2s",
          "&:hover": {
            borderColor: "secondary.main",
            bgcolor: alpha(theme.palette.secondary.main, 0.08),
          },
        }}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          accept="video/*"
          type="file"
          hidden
          onChange={handleFileChange}
        />

        {hasVideo ? (
          <>
            <VideoFileOutlinedIcon
              sx={{ fontSize: 22, color: "secondary.main", mb: 0.5 }}
            />
            <Typography
              variant="caption"
              color="secondary.main"
              sx={{ fontSize: 10, lineHeight: 1.2, userSelect: "none" }}
            >
              Loaded
            </Typography>
            <Box
              onClick={(e) => {
                e.stopPropagation();
                onChange(field.id, "");
              }}
              sx={{
                position: "absolute",
                top: 4,
                right: 4,
                width: 20,
                height: 20,
                borderRadius: "50%",
                bgcolor: "rgba(0,0,0,0.55)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                zIndex: 1,
                "&:hover": { bgcolor: "rgba(0,0,0,0.8)" },
              }}
            >
              <CloseIcon sx={{ fontSize: 12, color: "white" }} />
            </Box>
          </>
        ) : (
          <>
            <VideoFileOutlinedIcon
              sx={{ fontSize: 22, color: "text.disabled", mb: 0.5 }}
            />
            <Typography
              variant="caption"
              color="text.disabled"
              sx={{ fontSize: 10, lineHeight: 1.2, userSelect: "none" }}
            >
              {shortLabel}
            </Typography>
          </>
        )}
      </Box>
    </Tooltip>
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
    .filter((f) => f.id !== "reference_images") // handled via Elements panel
    .filter((f) => isFieldVisible(f, formState));

  if (mediaFields.length === 0) return null;

  return (
    <Box sx={{ display: "flex", gap: 1 }}>
      {mediaFields.map((field) =>
        field.type === "image_array" ? (
          <ImageArrayCard
            key={field.id}
            field={field}
            value={formState[field.id]}
            onChange={onFieldChange}
            error={errors[field.id]}
          />
        ) : field.type === "video_upload" ? (
          <VideoUploadCard
            key={field.id}
            field={field}
            value={formState[field.id]}
            onChange={onFieldChange}
            error={errors[field.id]}
          />
        ) : (
          <SingleUploadCard
            key={field.id}
            field={field}
            value={formState[field.id]}
            onChange={onFieldChange}
            error={errors[field.id]}
          />
        ),
      )}
    </Box>
  );
}
