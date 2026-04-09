"use client";

import React, { useState } from "react";
import {
  Alert,
  Box,
  Collapse,
  Divider,
  FormControl,
  IconButton,
  Menu,
  MenuItem,
  Select,
  SelectChangeEvent,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from "@mui/material";
import CropPortraitIcon from "@mui/icons-material/CropPortrait";
import CropLandscapeIcon from "@mui/icons-material/CropLandscape";
import CropSquareIcon from "@mui/icons-material/CropSquare";
import TimerOutlinedIcon from "@mui/icons-material/TimerOutlined";
import VolumeUpOutlinedIcon from "@mui/icons-material/VolumeUpOutlined";
import VolumeOffOutlinedIcon from "@mui/icons-material/VolumeOffOutlined";
import PersonOutlinedIcon from "@mui/icons-material/PersonOutlined";
import TuneOutlinedIcon from "@mui/icons-material/TuneOutlined";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import MovieOutlinedIcon from "@mui/icons-material/MovieOutlined";
import DirectionsRunIcon from "@mui/icons-material/DirectionsRun";
import type { StudioV2FieldSchema } from "@/lib/api";

function isFieldVisible(
  field: StudioV2FieldSchema,
  formState: Record<string, unknown>
): boolean {
  if (!field.visible_when) return true;
  return Object.entries(field.visible_when).every(
    ([key, val]) => formState[key] === val
  );
}

const PERSON_GEN_LABELS: Record<string, string> = {
  allow_all: "All",
  allow_adult: "Adult",
  disallow: "None",
};

interface GenerationSettingsPanelProps {
  fields: StudioV2FieldSchema[];
  formState: Record<string, unknown>;
  onFieldChange: (fieldId: string, value: unknown) => void;
  errors?: Record<string, string>;
  constraintMessage?: string;
}

export default function GenerationSettingsPanel({
  fields,
  formState,
  onFieldChange,
  errors = {},
  constraintMessage,
}: GenerationSettingsPanelProps) {
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [personAnchor, setPersonAnchor] = useState<null | HTMLElement>(null);

  const settingsFields = fields
    .filter((f) => f.group === "settings")
    .filter((f) => isFieldVisible(f, formState));

  if (settingsFields.length === 0) return null;

  const get = (id: string) => settingsFields.find((f) => f.id === id);

  const generationModeField = get("generation_mode");
  const aspectField = get("aspect_ratio");
  const durationField = get("duration_seconds");
  const resolutionField = get("resolution");
  const modeField = get("mode");
  const audioField = get("generate_audio");
  const personField = get("person_generation");

  const primaryIds = [
    "generation_mode",
    "aspect_ratio",
    "duration_seconds",
    "resolution",
    "mode",
    "generate_audio",
    "person_generation",
  ];
  const advancedFields = settingsFields.filter((f) => !primaryIds.includes(f.id));

  const durationOptions = durationField?.options ?? [
    { value: "4", label: "4s" },
    { value: "6", label: "6s" },
    { value: "8", label: "8s" },
  ];

  const resolutionOptions = resolutionField?.options ?? [
    { value: "720p", label: "720p" },
    { value: "1080p", label: "HD" },
    { value: "4k", label: "4K" },
  ];

  const resolutionShort = (val: string) => {
    if (val === "1080p") return "HD";
    if (val === "4k") return "4K";
    return "720";
  };

  const personGenCurrent = String(formState.person_generation ?? "allow_all");

  return (
    <Box>
      {constraintMessage && (
        <Alert
          severity="info"
          icon={<InfoOutlinedIcon sx={{ fontSize: 14 }} />}
          variant="outlined"
          sx={{ mb: 1, py: 0.25, px: 1, fontSize: 11, "& .MuiAlert-message": { fontSize: 11 } }}
        >
          {constraintMessage}
        </Alert>
      )}

      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          width: "100%",
          columnGap: { xs: 0.5, md: 1 },
          rowGap: 0.5,
          flexWrap: "wrap",
          justifyContent: { xs: "flex-start", md: "space-between" },
        }}
      >
        {/* Generation mode (Kling only) */}
        {generationModeField && (
          <>
            <ToggleButtonGroup
              value={formState.generation_mode as string}
              exclusive
              onChange={(_, val) => val && onFieldChange("generation_mode", val)}
              size="small"
              sx={chipGroupSx}
            >
              <Tooltip title="Scene — text or image to video (auto-detected)">
                <ToggleButton value="scene" sx={chipSx}>
                  <MovieOutlinedIcon sx={{ fontSize: 14, mr: 0.25 }} />
                  <Typography variant="caption" fontWeight={700} sx={{ fontSize: 11, lineHeight: 1 }}>
                    Scene
                  </Typography>
                </ToggleButton>
              </Tooltip>
              <Tooltip title="Motion Transfer — animate a character from a reference video">
                <ToggleButton value="motion_transfer" sx={chipSx}>
                  <DirectionsRunIcon sx={{ fontSize: 14, mr: 0.25 }} />
                  <Typography variant="caption" fontWeight={700} sx={{ fontSize: 11, lineHeight: 1 }}>
                    Motion
                  </Typography>
                </ToggleButton>
              </Tooltip>
            </ToggleButtonGroup>
            <Divider orientation="vertical" flexItem sx={dividerSx} />
          </>
        )}

        {/* Aspect ratio */}
        {aspectField && (
          <ToggleButtonGroup
            value={formState.aspect_ratio as string}
            exclusive
            onChange={(_, val) => val && onFieldChange("aspect_ratio", val)}
            size="small"
            sx={chipGroupSx}
          >
            <Tooltip title="Portrait 9:16">
              <ToggleButton value="9:16" sx={chipSx}>
                <CropPortraitIcon sx={{ fontSize: 16 }} />
              </ToggleButton>
            </Tooltip>
            <Tooltip title="Landscape 16:9">
              <ToggleButton value="16:9" sx={chipSx}>
                <CropLandscapeIcon sx={{ fontSize: 16 }} />
              </ToggleButton>
            </Tooltip>
            {aspectField.options?.some((o) => o.value === "1:1") && (
              <Tooltip title="Square 1:1">
                <ToggleButton value="1:1" sx={chipSx}>
                  <CropSquareIcon sx={{ fontSize: 16 }} />
                </ToggleButton>
              </Tooltip>
            )}
          </ToggleButtonGroup>
        )}

        {aspectField && durationField && <Divider orientation="vertical" flexItem sx={dividerSx} />}

        {/* Duration */}
        {durationField && (
          <ToggleButtonGroup
            value={Number(formState.duration_seconds)}
            exclusive
            onChange={(_, val) => val !== null && onFieldChange("duration_seconds", val)}
            size="small"
            sx={chipGroupSx}
          >
            {durationOptions.map((opt) => (
              <Tooltip key={opt.value} title={`${opt.value} seconds`}>
                <ToggleButton value={Number(opt.value)} sx={chipSx}>
                  <TimerOutlinedIcon sx={{ fontSize: 12, mr: 0.25 }} />
                  <Typography variant="caption" fontWeight={700} sx={{ fontSize: 11, lineHeight: 1 }}>
                    {opt.value}s
                  </Typography>
                </ToggleButton>
              </Tooltip>
            ))}
          </ToggleButtonGroup>
        )}

        {durationField && resolutionField && <Divider orientation="vertical" flexItem sx={dividerSx} />}

        {/* Resolution */}
        {resolutionField && (
          <ToggleButtonGroup
            value={formState.resolution as string}
            exclusive
            onChange={(_, val) => val && onFieldChange("resolution", val)}
            size="small"
            sx={chipGroupSx}
          >
            {resolutionOptions.map((opt) => (
              <Tooltip key={opt.value} title={opt.label ?? opt.value}>
                <ToggleButton value={opt.value} sx={chipSx}>
                  <Typography variant="caption" fontWeight={700} sx={{ fontSize: 11, lineHeight: 1 }}>
                    {resolutionShort(String(opt.value))}
                  </Typography>
                </ToggleButton>
              </Tooltip>
            ))}
          </ToggleButtonGroup>
        )}

        {resolutionField && (modeField || audioField || personField) && (
          <Divider orientation="vertical" flexItem sx={dividerSx} />
        )}

        {/* Quality mode (Kling: std/pro) */}
        {modeField && (
          <ToggleButtonGroup
            value={formState.mode as string}
            exclusive
            onChange={(_, val) => val && onFieldChange("mode", val)}
            size="small"
            sx={chipGroupSx}
          >
            <Tooltip title="Standard quality (720p)">
              <ToggleButton value="std" sx={chipSx}>
                <Typography variant="caption" fontWeight={700} sx={{ fontSize: 11, lineHeight: 1 }}>
                  Std
                </Typography>
              </ToggleButton>
            </Tooltip>
            <Tooltip title="Professional quality (1080p)">
              <ToggleButton value="pro" sx={chipSx}>
                <Typography variant="caption" fontWeight={700} sx={{ fontSize: 11, lineHeight: 1 }}>
                  Pro
                </Typography>
              </ToggleButton>
            </Tooltip>
          </ToggleButtonGroup>
        )}

        {modeField && (audioField || personField) && (
          <Divider orientation="vertical" flexItem sx={dividerSx} />
        )}

        {/* Audio toggle */}
        {audioField && (
          <Tooltip title={formState.generate_audio ? "Audio on" : "Audio off"}>
            <ToggleButton
              value="audio"
              selected={Boolean(formState.generate_audio)}
              onChange={() => onFieldChange("generate_audio", !formState.generate_audio)}
              size="small"
              sx={{ ...chipSx, border: "1px solid", borderColor: "divider", borderRadius: 1 }}
            >
              {formState.generate_audio ? (
                <VolumeUpOutlinedIcon sx={{ fontSize: 16 }} />
              ) : (
                <VolumeOffOutlinedIcon sx={{ fontSize: 16, color: "text.disabled" }} />
              )}
            </ToggleButton>
          </Tooltip>
        )}

        {/* Person generation */}
        {personField && (
          <>
            <Tooltip title={`Person: ${PERSON_GEN_LABELS[personGenCurrent] ?? personGenCurrent}`}>
              <Box
                component="button"
                onClick={(e) => setPersonAnchor(e.currentTarget)}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 0.25,
                  px: 1,
                  py: 0.5,
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: 1,
                  bgcolor: "transparent",
                  cursor: "pointer",
                  color: "text.primary",
                  "&:hover": { borderColor: "primary.main", bgcolor: "action.hover" },
                }}
              >
                <PersonOutlinedIcon sx={{ fontSize: 15 }} />
                <Typography variant="caption" fontWeight={700} sx={{ fontSize: 11 }}>
                  {PERSON_GEN_LABELS[personGenCurrent] ?? personGenCurrent}
                </Typography>
              </Box>
            </Tooltip>
            <Menu
              anchorEl={personAnchor}
              open={Boolean(personAnchor)}
              onClose={() => setPersonAnchor(null)}
              slotProps={{ paper: { sx: { minWidth: 120 } } }}
            >
              {(personField.options ?? [
                { value: "allow_all", label: "All" },
                { value: "allow_adult", label: "Adults only" },
                { value: "disallow", label: "No people" },
              ]).map((opt) => (
                <MenuItem
                  key={opt.value}
                  selected={personGenCurrent === opt.value}
                  onClick={() => {
                    onFieldChange("person_generation", opt.value);
                    setPersonAnchor(null);
                  }}
                  dense
                >
                  <Typography variant="caption">{opt.label}</Typography>
                </MenuItem>
              ))}
            </Menu>
          </>
        )}

        {/* Advanced settings toggle */}
        {advancedFields.length > 0 && (
          <>
            <Divider orientation="vertical" flexItem sx={dividerSx} />
            <Tooltip title="Advanced settings">
              <IconButton
                size="small"
                onClick={() => setAdvancedOpen((v) => !v)}
                color={advancedOpen ? "primary" : "default"}
                sx={{ p: 0.5 }}
              >
                <TuneOutlinedIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>
          </>
        )}
      </Box>

      {/* Advanced fields (seed, sample_count, etc.) */}
      <Collapse in={advancedOpen}>
        <Box sx={{ display: "flex", gap: 1, mt: 1.5, flexWrap: "wrap" }}>
          {advancedFields.map((field) => {
            if (field.type === "select") {
              return (
                <FormControl key={field.id} size="small" sx={{ minWidth: 120 }} error={Boolean(errors[field.id])}>
                  <Select
                    value={String(formState[field.id] ?? field.default ?? "")}
                    onChange={(e: SelectChangeEvent<string>) => onFieldChange(field.id, e.target.value)}
                    displayEmpty
                    renderValue={(v) => (
                      <Typography variant="caption">{field.options?.find((o) => o.value === v)?.label ?? v}</Typography>
                    )}
                  >
                    {field.options?.map((opt) => (
                      <MenuItem key={opt.value} value={opt.value} dense>
                        <Typography variant="caption">{opt.label}</Typography>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              );
            }
            return (
              <TextField
                key={field.id}
                label={field.label}
                type={field.type === "number" ? "number" : "text"}
                size="small"
                value={formState[field.id] ?? field.default ?? ""}
                onChange={(e) => {
                  const v = e.target.value;
                  onFieldChange(field.id, v === "" ? undefined : field.type === "number" ? parseInt(v, 10) : v);
                }}
                error={Boolean(errors[field.id])}
                helperText={errors[field.id]}
                sx={{ maxWidth: 140 }}
                inputProps={{ min: field.min, max: field.max }}
              />
            );
          })}
        </Box>
      </Collapse>
    </Box>
  );
}

const chipGroupSx = {
  "& .MuiToggleButtonGroup-grouped": {
    border: "1px solid",
    borderColor: "divider",
    "&:not(:first-of-type)": { borderLeft: "1px solid", borderColor: "divider" },
  },
};

const dividerSx = {
  my: 0.25,
  display: { xs: "flex", md: "none" },
};

const chipSx = {
  px: 1,
  py: 0.5,
  minWidth: 32,
  display: "flex",
  alignItems: "center",
  gap: 0.25,
  lineHeight: 1,
};
