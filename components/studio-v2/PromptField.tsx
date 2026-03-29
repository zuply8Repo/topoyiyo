"use client";

import React, { useRef, useState } from "react";
import {
  Box,
  FormHelperText,
  IconButton,
  TextField,
  Tooltip,
  Typography,
  alpha,
  useTheme,
} from "@mui/material";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import AppsOutlinedIcon from "@mui/icons-material/AppsOutlined";
import type { StudioV2FieldSchema } from "@/lib/api";
import ElementsPanel, { type StudioElement } from "./ElementsPanel";

interface PromptFieldProps {
  field: StudioV2FieldSchema;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  enhancePrompt: boolean;
  onEnhanceChange: (v: boolean) => void;
  elements: StudioElement[];
  onElementsChange: (elements: StudioElement[]) => void;
}

export default function PromptField({
  field,
  value,
  onChange,
  error,
  enhancePrompt,
  onEnhanceChange,
  elements,
  onElementsChange,
}: PromptFieldProps) {
  const theme = useTheme();
  const [elementsOpen, setElementsOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const cursorPosRef = useRef({ start: 0, end: 0 });

  const saveCursor = () => {
    if (textareaRef.current) {
      cursorPosRef.current = {
        start: textareaRef.current.selectionStart,
        end: textareaRef.current.selectionEnd,
      };
    }
  };

  const handleInsertElement = (element: StudioElement) => {
    const { start, end } = cursorPosRef.current;
    const current = value ?? "";
    const mention = `@${element.name} `;
    const next = current.slice(0, start) + mention + current.slice(end);
    onChange(next);
    setTimeout(() => {
      if (textareaRef.current) {
        const newPos = start + mention.length;
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(newPos, newPos);
        cursorPosRef.current = { start: newPos, end: newPos };
      }
    }, 50);
  };

  const hasHelperText = Boolean(error ?? field.help_text);

  return (
    <Box sx={{ position: "relative" }}>
      <TextField
        id={`field-${field.id}`}
        label={field.label}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        onSelect={saveCursor}
        onClick={saveCursor}
        onKeyUp={saveCursor}
        multiline
        minRows={3}
        maxRows={8}
        fullWidth
        required={field.required ?? false}
        error={Boolean(error)}
        placeholder={field.placeholder}
        size="small"
        inputRef={textareaRef}
        InputProps={{
          sx: {
            // Reserve room at the bottom-right for the floating buttons
            "& textarea": { paddingBottom: "32px" },
          },
        }}
      />

      {/* Floating toolbar pinned to bottom-right inside the field */}
      <Box
        sx={{
          position: "absolute",
          bottom: hasHelperText ? 26 : 8,
          right: 8,
          display: "flex",
          alignItems: "center",
          gap: 0.5,
          pointerEvents: "auto",
        }}
      >
        {/* Enhance toggle */}
        <Tooltip title={enhancePrompt ? "Enhance: on" : "Enhance: off"}>
          <IconButton
            size="small"
            onClick={() => onEnhanceChange(!enhancePrompt)}
            sx={{
              p: 0.4,
              borderRadius: 1.5,
              border: "1px solid",
              borderColor: enhancePrompt ? "primary.main" : alpha(theme.palette.divider, 0.8),
              bgcolor: enhancePrompt
                ? alpha(theme.palette.primary.main, 0.15)
                : alpha(theme.palette.background.paper, 0.85),
              color: enhancePrompt ? "primary.main" : "text.disabled",
              backdropFilter: "blur(4px)",
              transition: "all 0.2s",
              "&:hover": {
                borderColor: "primary.main",
                bgcolor: enhancePrompt
                  ? alpha(theme.palette.primary.main, 0.25)
                  : alpha(theme.palette.primary.main, 0.08),
                color: "primary.main",
              },
            }}
          >
            <AutoAwesomeIcon sx={{ fontSize: 13 }} />
          </IconButton>
        </Tooltip>

        {/* Elements picker */}
        <Tooltip title="Elements (@mention)">
          <IconButton
            size="small"
            onClick={() => {
              saveCursor();
              setElementsOpen(true);
            }}
            sx={{
              p: 0.4,
              borderRadius: 1.5,
              border: "1px solid",
              borderColor: alpha(theme.palette.divider, 0.8),
              bgcolor: alpha(theme.palette.background.paper, 0.85),
              color: "text.secondary",
              backdropFilter: "blur(4px)",
              transition: "all 0.2s",
              "&:hover": {
                borderColor: "primary.main",
                color: "primary.main",
                bgcolor: alpha(theme.palette.primary.main, 0.08),
              },
            }}
          >
            <AppsOutlinedIcon sx={{ fontSize: 13 }} />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Inline @mention chips preview row */}
      {(() => {
        const mentions = [...new Set((value ?? "").match(/@[\w_]+/g) ?? [])];
        const referenced = (
          mentions
            .map((m) => elements.find((el) => el.name === m.slice(1)))
            .filter(Boolean) as StudioElement[]
        ).slice(0, 3); // mirrors the Veo 3.1 max-3 limit
        if (referenced.length === 0) return null;
        return (
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mt: 0.5 }}>
            {referenced.map((el) => (
              <Box
                key={el.id}
                sx={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 0.5,
                  px: 0.75,
                  py: 0.25,
                  borderRadius: 10,
                  bgcolor: alpha(theme.palette.action.selected, 0.5),
                  border: "1px solid",
                  borderColor: "divider",
                }}
              >
                {el.imageBase64 && (
                  <Box
                    component="img"
                    src={`data:image/png;base64,${el.imageBase64}`}
                    sx={{
                      width: 16,
                      height: 16,
                      borderRadius: "50%",
                      objectFit: "cover",
                      flexShrink: 0,
                    }}
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                )}
                <Typography variant="caption" fontWeight={600} sx={{ fontSize: 11 }}>
                  {el.name}
                </Typography>
              </Box>
            ))}
          </Box>
        );
      })()}

      {(error ?? field.help_text) && (
        <FormHelperText error={Boolean(error)} sx={{ mx: "14px" }}>
          {error ?? field.help_text}
        </FormHelperText>
      )}

      <ElementsPanel
        open={elementsOpen}
        onClose={() => setElementsOpen(false)}
        elements={elements}
        onChange={onElementsChange}
        onInsert={handleInsertElement}
      />
    </Box>
  );
}
