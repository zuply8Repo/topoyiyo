"use client";

import React, { useCallback, useRef } from "react";
import {
  Box,
  FormControl,
  FormControlLabel,
  FormHelperText,
  InputLabel,
  MenuItem,
  Select,
  SelectChangeEvent,
  Switch,
  TextField,
  Tooltip,
  Typography,
  alpha,
  useTheme,
} from "@mui/material";
import AddPhotoAlternateOutlinedIcon from "@mui/icons-material/AddPhotoAlternateOutlined";
import CloseIcon from "@mui/icons-material/Close";
import type { StudioV2FieldSchema } from "@/lib/api";

interface SchemaFieldRendererProps {
  field: StudioV2FieldSchema;
  value: unknown;
  onChange: (fieldId: string, value: unknown) => void;
  error?: string;
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

// ── Dropzone helpers ────────────────────────────────────────────────────────

function ImageDropzone({
  field,
  value,
  onChange,
  error,
}: {
  field: StudioV2FieldSchema;
  value: unknown;
  onChange: (v: unknown) => void;
  error?: string;
}) {
  const theme = useTheme();
  const inputRef = useRef<HTMLInputElement>(null);
  const hasImage = typeof value === "string" && Boolean(value);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const b64 = await fileToBase64(file);
      onChange(b64);
    } catch {
      // ignore
    }
    e.target.value = "";
  };

  return (
    <Box>
      <Box
        onClick={() => inputRef.current?.click()}
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          p: 1.25,
          borderRadius: 2,
          border: "1.5px dashed",
          borderColor: error ? "error.main" : hasImage ? "primary.main" : "divider",
          bgcolor: hasImage
            ? alpha(theme.palette.primary.main, 0.04)
            : alpha(theme.palette.action.hover, 0.03),
          cursor: "pointer",
          transition: "border-color 0.2s",
          "&:hover": { borderColor: "primary.main" },
        }}
      >
        <input ref={inputRef} accept="image/*" type="file" hidden onChange={handleFile} />
        {hasImage ? (
          <>
            <Box
              component="img"
              src={`data:image/png;base64,${value}`}
              alt="Preview"
              sx={{
                width: 48,
                height: 48,
                objectFit: "cover",
                borderRadius: 1,
                border: "1px solid",
                borderColor: "divider",
                flexShrink: 0,
              }}
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="caption" fontWeight={600} noWrap>
                {field.label}
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: 10 }}>
                Click to replace
              </Typography>
            </Box>
            <Tooltip title="Remove">
              <Box
                component="span"
                onClick={(e) => {
                  e.stopPropagation();
                  onChange("");
                }}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 20,
                  height: 20,
                  borderRadius: "50%",
                  bgcolor: "action.hover",
                  cursor: "pointer",
                  "&:hover": { bgcolor: "error.light", color: "white" },
                  flexShrink: 0,
                }}
              >
                <CloseIcon sx={{ fontSize: 12 }} />
              </Box>
            </Tooltip>
          </>
        ) : (
          <>
            <AddPhotoAlternateOutlinedIcon sx={{ fontSize: 24, color: "text.disabled", flexShrink: 0 }} />
            <Box>
              <Typography variant="caption" fontWeight={600} display="block">
                {field.label}
                {field.required && " *"}
              </Typography>
              {field.help_text && (
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10 }}>
                  {field.help_text}
                </Typography>
              )}
            </Box>
          </>
        )}
      </Box>
      {error && <FormHelperText error sx={{ ml: 1 }}>{error}</FormHelperText>}
    </Box>
  );
}

function ImageArrayDropzone({
  field,
  arr,
  maxItems,
  onAdd,
  onRemove,
  error,
}: {
  field: StudioV2FieldSchema;
  arr: string[];
  maxItems: number;
  onAdd: (b64: string) => void;
  onRemove: (i: number) => void;
  error?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const b64 = await fileToBase64(file);
      onAdd(b64);
    } catch {
      // ignore
    }
    e.target.value = "";
  };

  return (
    <Box>
      <Typography variant="caption" fontWeight={600} display="block" sx={{ mb: 0.75 }}>
        {field.label}
        {field.help_text && (
          <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 0.5, fontSize: 10 }}>
            {field.help_text}
          </Typography>
        )}
      </Typography>
      <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap", alignItems: "center" }}>
        {arr.map((item, i) => (
          <Box
            key={i}
            sx={{ position: "relative", width: 52, height: 52, flexShrink: 0 }}
          >
            <Box
              component="img"
              src={`data:image/png;base64,${item}`}
              alt={`Ref ${i + 1}`}
              sx={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                borderRadius: 1.5,
                border: "1px solid",
                borderColor: "divider",
              }}
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
            <Box
              onClick={() => onRemove(i)}
              sx={{
                position: "absolute",
                top: -5,
                right: -5,
                width: 16,
                height: 16,
                borderRadius: "50%",
                bgcolor: "rgba(0,0,0,0.6)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                "&:hover": { bgcolor: "error.main" },
              }}
            >
              <CloseIcon sx={{ fontSize: 10, color: "white" }} />
            </Box>
          </Box>
        ))}
        {arr.length < maxItems && (
          <Box
            onClick={() => inputRef.current?.click()}
            sx={{
              width: 52,
              height: 52,
              borderRadius: 1.5,
              border: "1.5px dashed",
              borderColor: "divider",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              "&:hover": { borderColor: "primary.main" },
            }}
          >
            <input ref={inputRef} accept="image/*" type="file" hidden onChange={handleFile} />
            <AddPhotoAlternateOutlinedIcon sx={{ fontSize: 20, color: "text.disabled" }} />
          </Box>
        )}
      </Box>
      {error && <FormHelperText error sx={{ mt: 0.5 }}>{error}</FormHelperText>}
    </Box>
  );
}

// ── Main renderer ────────────────────────────────────────────────────────────

export default function SchemaFieldRenderer({
  field,
  value,
  onChange,
  error,
}: SchemaFieldRendererProps) {
  const handleChange = useCallback(
    (newValue: unknown) => {
      onChange(field.id, newValue);
    },
    [field.id, onChange]
  );

  const handleSelectChange = (e: SelectChangeEvent<unknown>) => {
    const v = e.target.value;
    if (field.type === "number" && field.id === "duration_seconds") {
      handleChange(parseInt(String(v), 10));
    } else if (field.type === "number" && field.id === "sample_count") {
      handleChange(parseInt(String(v), 10));
    } else {
      handleChange(v);
    }
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const b64 = await fileToBase64(file);
      handleChange(b64);
    } catch (err) {
      console.error("Failed to read image:", err);
    }
  };

  const handleImageArrayChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
    index: number
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const arr = Array.isArray(value) ? [...value] : [];
    try {
      const b64 = await fileToBase64(file);
      arr[index] = b64;
      handleChange(arr);
    } catch (err) {
      console.error("Failed to read image:", err);
    }
  };

  const handleRemoveImage = (index: number) => {
    const arr = Array.isArray(value) ? [...value] : [];
    arr.splice(index, 1);
    handleChange(arr);
  };

  const id = `field-${field.id}`;
  const label = field.label;
  const helpText = field.help_text;
  const required = field.required ?? false;

  switch (field.type) {
    case "textarea":
      return (
        <TextField
          id={id}
          label={label}
          value={value ?? ""}
          onChange={(e) => handleChange(e.target.value)}
          multiline
          minRows={3}
          maxRows={10}
          fullWidth
          required={required}
          error={Boolean(error)}
          helperText={error ?? helpText}
          placeholder={field.placeholder}
          size="small"
        />
      );

    case "text":
      return (
        <TextField
          id={id}
          label={label}
          value={value ?? ""}
          onChange={(e) => handleChange(e.target.value)}
          fullWidth
          required={required}
          error={Boolean(error)}
          helperText={error ?? helpText}
          placeholder={field.placeholder}
        />
      );

    case "number":
      return (
        <TextField
          id={id}
          label={label}
          type="number"
          value={value ?? field.default ?? ""}
          onChange={(e) => {
            const v = e.target.value;
            handleChange(v === "" ? undefined : parseInt(v, 10));
          }}
          fullWidth
          required={required}
          error={Boolean(error)}
          helperText={error ?? helpText}
          inputProps={{
            min: field.min,
            max: field.max,
          }}
        />
      );

    case "select":
      return (
        <FormControl fullWidth error={Boolean(error)} required={required}>
          <InputLabel id={`${id}-label`}>{label}</InputLabel>
          <Select
            labelId={`${id}-label`}
            id={id}
            value={value ?? field.default ?? ""}
            label={label}
            onChange={handleSelectChange}
          >
            {field.options?.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>
                {opt.label}
              </MenuItem>
            ))}
          </Select>
          {(helpText || error) && (
            <FormHelperText>{error ?? helpText}</FormHelperText>
          )}
        </FormControl>
      );

    case "boolean":
      return (
        <Box>
          <FormControlLabel
            control={
              <Switch
                checked={Boolean(value ?? field.default ?? false)}
                onChange={(e) => handleChange(e.target.checked)}
              />
            }
            label={label}
          />
          {helpText && (
            <FormHelperText sx={{ ml: 0 }}>{helpText}</FormHelperText>
          )}
        </Box>
      );

    case "image":
      return <ImageDropzone field={field} value={value} onChange={handleChange} error={error} />;

    case "image_array": {
      const arr = (Array.isArray(value) ? value : []) as string[];
      const maxItems = field.max_items ?? 3;
      return (
        <ImageArrayDropzone
          field={field}
          arr={arr}
          maxItems={maxItems}
          onAdd={(b64) => handleChange([...arr, b64])}
          onRemove={(i) => {
            const next = [...arr];
            next.splice(i, 1);
            handleChange(next);
          }}
          error={error}
        />
      );
    }

    default:
      return (
        <TextField
          id={id}
          label={label}
          value={value ?? ""}
          onChange={(e) => handleChange(e.target.value)}
          fullWidth
          required={required}
          error={Boolean(error)}
          helperText={error ?? helpText}
          placeholder={field.placeholder}
        />
      );
  }
}
