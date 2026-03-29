"use client";

import React, { useCallback, useRef, useState } from "react";
import {
  Alert,
  Box,
  CircularProgress,
  FormControl,
  IconButton,
  MenuItem,
  Select,
  TextField,
  Tooltip,
  Typography,
  alpha,
  useTheme,
} from "@mui/material";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import AddIcon from "@mui/icons-material/Add";
import ImageOutlinedIcon from "@mui/icons-material/ImageOutlined";
import { generateImagenImage, type ImagenGenerateRequest } from "@/lib/api";
import ImageGallery, { type GeneratedImageItem } from "./ImageGallery";

const IMAGEN_MODELS = [
  { id: "imagen-4.0-generate-001", label: "Imagen 4" },
  { id: "imagen-4.0-fast-generate-001", label: "Imagen 4 Fast" },
  { id: "imagen-4.0-ultra-generate-001", label: "Imagen 4 Ultra" },
] as const;

const ASPECT_RATIOS = [
  { value: "1:1", label: "1:1" },
  { value: "3:4", label: "3:4" },
  { value: "4:3", label: "4:3" },
  { value: "16:9", label: "16:9" },
  { value: "9:16", label: "9:16" },
] as const;

type AspectRatio = "1:1" | "3:4" | "4:3" | "16:9" | "9:16";

interface ImageExplorePanelProps {
  images: GeneratedImageItem[];
  onImagesChange: (images: GeneratedImageItem[]) => void;
  getToken: () => Promise<string | null>;
}

export default function ImageExplorePanel({
  images,
  onImagesChange,
  getToken,
}: ImageExplorePanelProps) {
  const theme = useTheme();
  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState<string>("imagen-4.0-generate-001");
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("1:1");
  const [sampleCount, setSampleCount] = useState(4);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLInputElement>(null);

  const handleGenerate = useCallback(async () => {
    const trimmed = prompt.trim();
    if (!trimmed) {
      textareaRef.current?.focus();
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const token = await getToken();
      const req: ImagenGenerateRequest = {
        prompt: trimmed,
        model_variant: model,
        aspect_ratio: aspectRatio,
        sample_count: sampleCount,
        enhance_prompt: true,
        person_generation: "allow_adult",
      };
      const res = await generateImagenImage(req, token);

      const newImages: GeneratedImageItem[] = res.images.map((img, i) => ({
        id: `${Date.now()}-${i}`,
        bytesBase64: img.bytes_base64_encoded,
        mimeType: img.mime_type,
        prompt: trimmed,
        modelVariant: model,
        aspectRatio,
        timestamp: new Date().toISOString(),
      }));

      onImagesChange([...newImages, ...images]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setIsGenerating(false);
    }
  }, [prompt, model, aspectRatio, sampleCount, images, onImagesChange, getToken]);

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
      {/* Scrollable image grid */}
      <Box sx={{ flex: 1, overflowY: "auto" }}>
        {isGenerating && images.length === 0 ? (
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
              Generating images…
            </Typography>
          </Box>
        ) : (
          <ImageGallery
            images={images}
            emptyLabel="Describe an image below and hit Generate"
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

      {/* Sticky bottom toolbar — matches reference design */}
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
          {/* Prompt input */}
          <Box sx={{ flex: 1, display: "flex", alignItems: "center", gap: 1 }}>
            <Tooltip title="Add attachment">
              <IconButton size="small" sx={{ color: "text.disabled", p: 0.5 }}>
                <AddIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <TextField
              inputRef={textareaRef}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Describe the scene you imagine"
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

          {/* Controls row */}
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
            {/* Model selector */}
            <FormControl size="small">
              <Select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                variant="standard"
                disableUnderline
                renderValue={(v) => {
                  const m = IMAGEN_MODELS.find((m) => m.id === v);
                  return (
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                      <ImageOutlinedIcon sx={{ fontSize: 13, color: "text.secondary" }} />
                      <Typography variant="caption" fontWeight={600} sx={{ fontSize: 12 }}>
                        {m?.label ?? v}
                      </Typography>
                    </Box>
                  );
                }}
                sx={{
                  "& .MuiSelect-select": { py: 0, pr: "20px !important" },
                  minWidth: 100,
                }}
              >
                {IMAGEN_MODELS.map((m) => (
                  <MenuItem key={m.id} value={m.id} dense>
                    <Typography variant="caption" fontWeight={600}>
                      {m.label}
                    </Typography>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Aspect ratio */}
            <FormControl size="small">
              <Select
                value={aspectRatio}
                onChange={(e) => setAspectRatio(e.target.value as AspectRatio)}
                variant="standard"
                disableUnderline
                renderValue={(v) => (
                  <Typography variant="caption" fontWeight={600} sx={{ fontSize: 12 }}>
                    {v}
                  </Typography>
                )}
                sx={{ "& .MuiSelect-select": { py: 0, pr: "20px !important" }, minWidth: 48 }}
              >
                {ASPECT_RATIOS.map((r) => (
                  <MenuItem key={r.value} value={r.value} dense>
                    <Typography variant="caption">{r.label}</Typography>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Sample count pill */}
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

            {/* Generate button */}
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
                "&:hover": !isGenerating
                  ? { bgcolor: "primary.dark" }
                  : {},
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
