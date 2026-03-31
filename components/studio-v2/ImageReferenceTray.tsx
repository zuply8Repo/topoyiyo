"use client";

import React, { useMemo, useRef } from "react";
import {
  Box,
  IconButton,
  Tooltip,
  Typography,
  alpha,
  useTheme,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";
import type { StudioV2FieldSchema, StudioV2ImageInput } from "@/lib/api";

interface ImageReferenceTrayProps {
  field: StudioV2FieldSchema;
  value: StudioV2ImageInput[];
  onChange: (next: StudioV2ImageInput[]) => void;
  onError: (message: string | null) => void;
}

function bytesToDataUrl(item: StudioV2ImageInput): string {
  return `data:${item.mime_type};base64,${item.bytes_base64}`;
}

function fileToImageInput(file: File): Promise<StudioV2ImageInput> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const bytes = result.includes(",") ? result.split(",")[1] : result;
      resolve({
        bytes_base64: bytes ?? "",
        mime_type: file.type,
        file_name: file.name,
      });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function ImageReferenceTray({
  field,
  value,
  onChange,
  onError,
}: ImageReferenceTrayProps) {
  const theme = useTheme();
  const inputRef = useRef<HTMLInputElement>(null);
  const items = useMemo(() => (Array.isArray(value) ? value : []), [value]);
  const maxItems = field.max_items ?? 14;
  const acceptedMimeTypes = field.accepted_mime_types ?? ["image/*"];
  const maxFileSizeBytes = Math.round((field.max_file_size_mb ?? 7) * 1024 * 1024);

  const handleAdd = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";

    if (files.length === 0) return;

    const remainingSlots = maxItems - items.length;
    if (remainingSlots <= 0) {
      onError(`You can attach up to ${maxItems} images.`);
      return;
    }

    const nextFiles = files.slice(0, remainingSlots);
    for (const file of nextFiles) {
      if (!acceptedMimeTypes.includes(file.type)) {
        onError("Unsupported format. Allowed: PNG, JPEG, WebP, HEIC, HEIF.");
        return;
      }
      if (file.size > maxFileSizeBytes) {
        onError(`Each image must be ${field.max_file_size_mb ?? 7} MB or smaller.`);
        return;
      }
    }

    try {
      const uploaded = await Promise.all(nextFiles.map(fileToImageInput));
      onChange([...items, ...uploaded]);
      onError(null);
    } catch {
      onError("Failed to read one of the selected images.");
    }
  };

  const handleRemove = (index: number) => {
    const next = [...items];
    next.splice(index, 1);
    onChange(next);
    onError(null);
  };

  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, flexWrap: "wrap" }}>
      <input
        ref={inputRef}
        accept={acceptedMimeTypes.join(",")}
        type="file"
        hidden
        multiple
        onChange={handleAdd}
      />

      <Tooltip title={field.help_text ?? field.label}>
        <IconButton
          size="small"
          onClick={() => inputRef.current?.click()}
          sx={{
            color: "text.disabled",
            p: 0.5,
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 1.5,
            bgcolor: alpha(theme.palette.action.hover, 0.03),
          }}
        >
          <AddIcon fontSize="small" />
        </IconButton>
      </Tooltip>

      {items.map((item, index) => (
        <Box
          key={`${item.file_name ?? "ref"}-${index}`}
          sx={{
            position: "relative",
            width: 28,
            height: 28,
            borderRadius: 1,
            overflow: "hidden",
            border: "1px solid",
            borderColor: "divider",
            flexShrink: 0,
          }}
        >
          <Box
            component="img"
            src={bytesToDataUrl(item)}
            alt={item.file_name ?? `Reference ${index + 1}`}
            sx={{ width: "100%", height: "100%", objectFit: "cover" }}
            onError={(event) => {
              (event.target as HTMLImageElement).style.display = "none";
            }}
          />
          <Box
            onClick={() => handleRemove(index)}
            sx={{
              position: "absolute",
              top: 0,
              right: 0,
              width: 14,
              height: 14,
              borderRadius: "0 0 0 8px",
              bgcolor: "rgba(0,0,0,0.65)",
              color: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <CloseIcon sx={{ fontSize: 9 }} />
          </Box>
        </Box>
      ))}

      {items.length > 0 && (
        <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11 }}>
          {items.length}/{maxItems}
        </Typography>
      )}
    </Box>
  );
}
