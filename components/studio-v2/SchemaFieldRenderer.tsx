"use client";

import React, { useCallback } from "react";
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
  Typography,
} from "@mui/material";
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
          minRows={4}
          fullWidth
          required={required}
          error={Boolean(error)}
          helperText={error ?? helpText}
          placeholder={field.placeholder}
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
      return (
        <Box>
          <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
            {label}
            {required && " *"}
          </Typography>
          <input
            accept="image/*"
            type="file"
            onChange={handleImageChange}
            style={{ display: "block", marginBottom: 8 }}
          />
          {typeof value === "string" && value ? (
            <Box
              component="img"
              src={`data:image/png;base64,${value}`}
              alt="Preview"
              sx={{
                maxWidth: 200,
                maxHeight: 120,
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 1,
              }}
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          ) : null}
          {helpText && (
            <FormHelperText>{helpText}</FormHelperText>
          )}
        </Box>
      );

    case "image_array": {
      const arr = (Array.isArray(value) ? value : []) as string[];
      const maxItems = field.max_items ?? 3;
      return (
        <Box>
          <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
            {label}
            {helpText && (
              <FormHelperText sx={{ display: "block", mb: 1 }}>
                {helpText}
              </FormHelperText>
            )}
          </Typography>
          {arr.map((item, i) => (
            <Box key={i} sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
              <input
                accept="image/*"
                type="file"
                onChange={(e) => handleImageArrayChange(e, i)}
              />
              {item && (
                <>
                  <Box
                    component="img"
                    src={`data:image/png;base64,${item}`}
                    alt={`Ref ${i + 1}`}
                    sx={{
                      maxWidth: 80,
                      maxHeight: 60,
                      border: "1px solid",
                      borderColor: "divider",
                      borderRadius: 1,
                    }}
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                  <Typography
                    component="button"
                    type="button"
                    variant="caption"
                    onClick={() => handleRemoveImage(i)}
                    sx={{ color: "error.main", cursor: "pointer" }}
                  >
                    Remove
                  </Typography>
                </>
              )}
            </Box>
          ))}
          {arr.length < maxItems && (
            <input
              accept="image/*"
              type="file"
              onChange={(e) => handleImageArrayChange(e, arr.length)}
            />
          )}
        </Box>
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
