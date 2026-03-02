"use client";

import type { ContentItem, ScheduleAssignment } from "@/lib/types";
import {
  Box,
  Button,
  Drawer,
  IconButton,
  Stack,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import React from "react";

export type MobileDayScheduleDrawerProps = {
  open: boolean;
  onClose: () => void;
  dateISO: string | null;
  assignments: ScheduleAssignment[];
  itemsById: Map<string, ContentItem>;
  onRemove: (itemId: string) => void;
};

function formatDateISO(dateISO: string): string {
  const [y, m, d] = dateISO.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export default function MobileDayScheduleDrawer({
  open,
  onClose,
  dateISO,
  assignments,
  itemsById,
  onRemove,
}: MobileDayScheduleDrawerProps) {
  return (
    <Drawer
      anchor="bottom"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          px: 2,
          pb: 4,
          pt: 1.5,
          maxHeight: "75vh",
          overflow: "auto",
        },
      }}
    >
      {/* Drag handle */}
      <Box sx={{ display: "flex", justifyContent: "center", mb: 1 }}>
        <Box sx={{ width: 40, height: 4, borderRadius: 2, bgcolor: "grey.300" }} />
      </Box>

      {/* Header */}
      <Stack direction="row" alignItems="center" sx={{ mb: 2.5 }}>
        <Box sx={{ flex: 1 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 900 }}>
            {dateISO ? formatDateISO(dateISO) : "Scheduled Content"}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {assignments.length} item{assignments.length !== 1 ? "s" : ""} scheduled
          </Typography>
        </Box>
        <IconButton size="small" onClick={onClose} edge="end">
          <CloseIcon />
        </IconButton>
      </Stack>

      {assignments.length === 0 ? (
        <Typography
          color="text.secondary"
          variant="body2"
          sx={{ textAlign: "center", py: 4 }}
        >
          No content scheduled for this day.
        </Typography>
      ) : (
        <Stack spacing={1.5}>
          {assignments.map((a) => {
            const item = itemsById.get(a.itemId);
            const isVideo = item?.assetType === "video";
            const mediaUrl = isVideo ? item?.videoUrl : item?.imageUrl;
            const caption = item?.caption ?? a.itemId;

            return (
              <Stack
                key={a.itemId}
                direction="row"
                spacing={1.5}
                alignItems="center"
                sx={{
                  p: 1.25,
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: 3,
                  bgcolor: "background.paper",
                }}
              >
                {/* Thumbnail */}
                <Box
                  sx={{
                    position: "relative",
                    width: 52,
                    height: 52,
                    borderRadius: 2,
                    overflow: "hidden",
                    flex: "0 0 auto",
                    bgcolor: "grey.200",
                  }}
                >
                  {isVideo && mediaUrl ? (
                    <>
                      <video
                        src={mediaUrl}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                      <Box
                        sx={{
                          position: "absolute",
                          inset: 0,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          bgcolor: "rgba(0,0,0,0.3)",
                        }}
                      >
                        <PlayArrowIcon sx={{ color: "white", fontSize: 20 }} />
                      </Box>
                    </>
                  ) : mediaUrl ? (
                    <Box
                      component="img"
                      src={mediaUrl}
                      alt=""
                      sx={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  ) : null}
                </Box>

                {/* Info */}
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mb: 0.25 }}>
                    <AccessTimeIcon sx={{ fontSize: 13, color: "text.secondary" }} />
                    <Typography variant="body2" sx={{ fontWeight: 800 }}>
                      {a.time}
                    </Typography>
                  </Stack>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {caption}
                  </Typography>
                </Box>

                {/* Remove button */}
                <Button
                  size="small"
                  variant="outlined"
                  color="error"
                  startIcon={<DeleteOutlineIcon sx={{ fontSize: 16 }} />}
                  onClick={() => onRemove(a.itemId)}
                  sx={{
                    textTransform: "none",
                    borderRadius: 999,
                    flex: "0 0 auto",
                    fontSize: "0.72rem",
                    whiteSpace: "nowrap",
                  }}
                >
                  Remove
                </Button>
              </Stack>
            );
          })}
        </Stack>
      )}
    </Drawer>
  );
}
