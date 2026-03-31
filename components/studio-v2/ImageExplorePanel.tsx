"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Box,
  CircularProgress,
  FormControl,
  MenuItem,
  Select,
  TextField,
  Typography,
  alpha,
  useTheme,
} from "@mui/material";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import ImageOutlinedIcon from "@mui/icons-material/ImageOutlined";
import {
  generateStudioV2Image,
  getStudioV2ModelSchema,
  getStudioV2Models,
  type StudioV2FieldSchema,
  type StudioV2ImageGenerateRequest,
  type StudioV2ImageInput,
  type StudioV2ModelSchema,
  type StudioV2ModelSummary,
} from "@/lib/api";
import ImageGallery, { type GeneratedImageItem } from "./ImageGallery";
import ImageReferenceTray from "./ImageReferenceTray";

interface ImageExplorePanelProps {
  images: GeneratedImageItem[];
  onImagesChange: (images: GeneratedImageItem[]) => void;
  getToken: () => Promise<string | null>;
}

function buildDefaultFormState(schema: StudioV2ModelSchema): Record<string, unknown> {
  const state: Record<string, unknown> = {};
  for (const field of schema.fields) {
    if (field.id === "reference_images") {
      state[field.id] = [];
      continue;
    }
    state[field.id] = field.default ?? (field.type === "boolean" ? false : "");
  }
  return state;
}

export default function ImageExplorePanel({
  images,
  onImagesChange,
  getToken,
}: ImageExplorePanelProps) {
  const theme = useTheme();
  const textareaRef = useRef<HTMLInputElement>(null);
  const [models, setModels] = useState<StudioV2ModelSummary[]>([]);
  const [selectedModelId, setSelectedModelId] = useState<string>("");
  const [schema, setSchema] = useState<StudioV2ModelSchema | null>(null);
  const [formState, setFormState] = useState<Record<string, unknown>>({});
  const [sampleCount, setSampleCount] = useState(4);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoadingSchema, setIsLoadingSchema] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = await getToken();
        const res = await getStudioV2Models(token ?? undefined);
        const imageModels = res.filter((model) => model.media_type === "image");
        if (!cancelled) {
          setModels(imageModels);
          const ids = new Set(imageModels.map((m) => m.model_id));
          setSelectedModelId((current) => {
            if (current && ids.has(current)) return current;
            return (
              imageModels.find((m) => m.model_id === "imagen-4")?.model_id ??
              imageModels[0]?.model_id ??
              ""
            );
          });
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load image models");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [getToken]);

  useEffect(() => {
    if (!selectedModelId) return;
    let cancelled = false;
    setIsLoadingSchema(true);
    (async () => {
      try {
        const token = await getToken();
        const res = await getStudioV2ModelSchema(selectedModelId, token ?? undefined);
        if (!cancelled) {
          setSchema(res);
          setFormState(buildDefaultFormState(res));
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load model schema");
        }
      } finally {
        if (!cancelled) {
          setIsLoadingSchema(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedModelId, getToken]);

  const handleFieldChange = useCallback((fieldId: string, value: unknown) => {
    setFormState((prev) => ({ ...prev, [fieldId]: value }));
  }, []);

  const referenceField = useMemo(
    () => schema?.fields.find((field) => field.id === "reference_images") ?? null,
    [schema]
  );
  const aspectRatioField = useMemo(
    () => schema?.fields.find((field) => field.id === "aspect_ratio") ?? null,
    [schema]
  );
  const imageSizeField = useMemo(
    () => schema?.fields.find((field) => field.id === "image_size") ?? null,
    [schema]
  );

  const referenceImages = (formState.reference_images as StudioV2ImageInput[] | undefined) ?? [];
  const prompt = String(formState.prompt ?? "");
  const aspectRatio = String(formState.aspect_ratio ?? aspectRatioField?.default ?? "1:1");
  const imageSize = String(formState.image_size ?? imageSizeField?.default ?? "2K");

  const handleGenerate = useCallback(async () => {
    const trimmed = prompt.trim();
    if (!trimmed) {
      textareaRef.current?.focus();
      setError("Prompt is required");
      return;
    }
    if (!selectedModelId) {
      setError("No image model is available");
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const token = await getToken();
      const req: StudioV2ImageGenerateRequest = {
        prompt: trimmed,
        aspect_ratio: aspectRatio as "1:1" | "3:4" | "4:3" | "16:9" | "9:16",
        image_size: imageSize as "1K" | "2K" | "4K",
        sample_count: sampleCount,
        reference_images: referenceImages,
      };
      const res = await generateStudioV2Image(selectedModelId, req, token ?? undefined);

      const modelLabel =
        models.find((model) => model.model_id === selectedModelId)?.label ?? selectedModelId;
      const newImages: GeneratedImageItem[] = res.images.map((img, index) => ({
        id: `${Date.now()}-${index}`,
        bytesBase64: img.bytes_base64_encoded,
        mimeType: img.mime_type,
        prompt: trimmed,
        modelVariant: modelLabel,
        aspectRatio,
        timestamp: new Date().toISOString(),
      }));

      onImagesChange([...newImages, ...images]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setIsGenerating(false);
    }
  }, [
    prompt,
    selectedModelId,
    aspectRatio,
    imageSize,
    sampleCount,
    referenceImages,
    getToken,
    models,
    onImagesChange,
    images,
  ]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleGenerate();
    }
  };

  return (
    <Box
      sx={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        position: "relative",
      }}
    >
      <Box sx={{ flex: 1, overflowY: "auto" }}>
        {(isGenerating || isLoadingSchema) && images.length === 0 ? (
          <Box
            sx={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 2,
              py: 10,
            }}
          >
            <CircularProgress size={36} thickness={3} />
            <Typography variant="body2" color="text.secondary">
              {isLoadingSchema ? "Loading image model…" : "Generating images…"}
            </Typography>
          </Box>
        ) : (
          <ImageGallery
            images={images}
            emptyLabel="Describe an image below and attach references if you want to edit from them"
          />
        )}

        {isGenerating && images.length > 0 && (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 1.5,
              py: 2,
            }}
          >
            <CircularProgress size={16} thickness={4} />
            <Typography variant="caption" color="text.secondary">
              Generating…
            </Typography>
          </Box>
        )}
      </Box>

      <Box
        sx={{
          flexShrink: 0,
          borderTop: "1px solid",
          borderColor: "divider",
          bgcolor: "background.paper",
          p: 1.5,
        }}
      >
        {error && (
          <Alert
            severity="error"
            onClose={() => setError(null)}
            sx={{ mb: 1, py: 0.25 }}
          >
            {error}
          </Alert>
        )}

        <Box
          sx={{
            display: "flex",
            alignItems: "flex-end",
            gap: 1,
            borderRadius: 3,
            border: "1px solid",
            borderColor: "divider",
            bgcolor: alpha(theme.palette.action.hover, 0.04),
            p: "6px 8px 6px 12px",
            transition: "border-color 0.2s",
            "&:focus-within": {
              borderColor: "primary.main",
            },
          }}
        >
          <Box sx={{ flex: 1, display: "flex", alignItems: "center", gap: 1 }}>
            {referenceField && (
              <ImageReferenceTray
                field={referenceField}
                value={referenceImages}
                onChange={(next) => handleFieldChange("reference_images", next)}
                onError={setError}
              />
            )}
            <TextField
              inputRef={textareaRef}
              value={prompt}
              onChange={(e) => handleFieldChange("prompt", e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Describe what to generate, or how to transform the attached images"
              multiline
              maxRows={4}
              variant="standard"
              fullWidth
              InputProps={{ disableUnderline: true }}
              sx={{
                "& .MuiInputBase-input": {
                  fontSize: 14,
                  lineHeight: 1.5,
                  "&::placeholder": { color: "text.disabled", opacity: 1 },
                },
              }}
            />
          </Box>

          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 0.75,
              flexShrink: 0,
              flexWrap: "wrap",
              justifyContent: "flex-end",
            }}
          >
            <FormControl size="small">
              <Select
                value={selectedModelId}
                onChange={(e) => setSelectedModelId(e.target.value)}
                variant="standard"
                disableUnderline
                renderValue={(value) => {
                  const model = models.find((item) => item.model_id === value);
                  return (
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                      <ImageOutlinedIcon sx={{ fontSize: 13, color: "text.secondary" }} />
                      <Typography variant="caption" fontWeight={600} sx={{ fontSize: 12 }}>
                        {model?.label ?? value}
                      </Typography>
                    </Box>
                  );
                }}
                sx={{
                  "& .MuiSelect-select": { py: 0, pr: "20px !important" },
                  minWidth: 132,
                }}
              >
                {models.map((model) => (
                  <MenuItem key={model.model_id} value={model.model_id} dense>
                    <Typography variant="caption" fontWeight={600}>
                      {model.label}
                    </Typography>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {aspectRatioField && (
              <FormControl size="small">
                <Select
                  value={aspectRatio}
                  onChange={(e) => handleFieldChange("aspect_ratio", e.target.value)}
                  variant="standard"
                  disableUnderline
                  renderValue={(value) => (
                    <Typography variant="caption" fontWeight={600} sx={{ fontSize: 12 }}>
                      {value}
                    </Typography>
                  )}
                  sx={{ "& .MuiSelect-select": { py: 0, pr: "20px !important" }, minWidth: 52 }}
                >
                  {(aspectRatioField.options ?? []).map((option) => (
                    <MenuItem key={option.value} value={option.value} dense>
                      <Typography variant="caption">{option.label}</Typography>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            {imageSizeField && (
              <FormControl size="small">
                <Select
                  value={imageSize}
                  onChange={(e) => handleFieldChange("image_size", e.target.value)}
                  variant="standard"
                  disableUnderline
                  renderValue={(value) => (
                    <Typography variant="caption" fontWeight={700} sx={{ fontSize: 12 }}>
                      {value}
                    </Typography>
                  )}
                  sx={{ "& .MuiSelect-select": { py: 0, pr: "20px !important" }, minWidth: 44 }}
                >
                  {(imageSizeField.options ?? []).map((option) => (
                    <MenuItem key={option.value} value={option.value} dense>
                      <Typography variant="caption">{option.label}</Typography>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            {/* Sample count pill — click cycles 1 → 2 → 3 → 4 → 1 */}
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 0.25,
                bgcolor: alpha(theme.palette.primary.main, 0.1),
                borderRadius: 1,
                px: 0.75,
                py: 0.25,
                cursor: "pointer",
                userSelect: "none",
              }}
              onClick={() => setSampleCount((n) => (n % 4) + 1)}
            >
              <Typography
                variant="caption"
                fontWeight={700}
                color="primary.main"
                sx={{ fontSize: 12 }}
              >
                {sampleCount}/4
              </Typography>
            </Box>

            <Box
              onClick={!isGenerating ? handleGenerate : undefined}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 0.5,
                bgcolor: isGenerating ? "action.disabled" : "primary.main",
                color: "primary.contrastText",
                borderRadius: 2,
                px: 1.5,
                py: 0.75,
                cursor: isGenerating ? "default" : "pointer",
                fontWeight: 700,
                fontSize: 13,
                userSelect: "none",
                transition: "background-color 0.2s",
                "&:hover": !isGenerating ? { bgcolor: "primary.dark" } : {},
              }}
            >
              {isGenerating ? (
                <CircularProgress size={12} thickness={4} sx={{ color: "inherit" }} />
              ) : (
                <AutoAwesomeIcon sx={{ fontSize: 14 }} />
              )}
              <Typography
                component="span"
                sx={{ fontSize: 13, fontWeight: 700, lineHeight: 1 }}
              >
                {isGenerating ? "Generating…" : "Generate"}
              </Typography>
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
