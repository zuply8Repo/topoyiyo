"use client";

import type { ContentItem } from "@/lib/types";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import React from "react";

export type ContentModalProps = {
  open: boolean;
  item: ContentItem | null;
  onClose: () => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onSaveCaption: (id: string, caption: string) => void;
};

export default function ContentModal({
  open,
  item,
  onClose,
  onApprove,
  onReject,
  onSaveCaption,
}: ContentModalProps) {
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState("");

  React.useEffect(() => {
    if (!item) return;
    setDraft(item.caption);
    setEditing(false);
  }, [item]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      scroll="paper"
      PaperProps={{
        sx: {
          borderRadius: 4,
          width: "100%",
          maxWidth: { xs: "92vw", sm: 620 },
        },
      }}
    >
      <DialogTitle sx={{ fontWeight: 800 }}>Post preview</DialogTitle>
      <Divider />
      <DialogContent sx={{ pt: 2 }}>
        {item ? (
          <Stack spacing={2}>
            <Box
              component="img"
              src={item.imageUrl}
              alt="Generated post"
              sx={{
                width: "100%",
                height: "auto",
                borderRadius: 3,
                objectFit: "cover",
                aspectRatio: "1 / 1",
                bgcolor: "grey.100",
              }}
            />

            <Stack spacing={1}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                Caption
              </Typography>
              {!editing ? (
                <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: "pre-wrap" }}>
                  {item.caption}
                </Typography>
              ) : (
                <TextField
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  multiline
                  minRows={6}
                  fullWidth
                />
              )}
            </Stack>
          </Stack>
        ) : null}
      </DialogContent>
      <Divider />
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} variant="text" sx={{ textTransform: "none" }}>
          Close
        </Button>
        <Box sx={{ flex: 1 }} />

        {item ? (
          <>
            <Button
              color="error"
              variant="outlined"
              onClick={() => {
                onReject(item.id);
                onClose();
              }}
              sx={{ textTransform: "none", borderRadius: 999 }}
            >
              Reject
            </Button>
            <Button
              color="success"
              variant="contained"
              onClick={() => {
                onApprove(item.id);
                onClose();
              }}
              sx={{ textTransform: "none", borderRadius: 999 }}
            >
              Approve
            </Button>
            {!editing ? (
              <Button
                onClick={() => setEditing(true)}
                variant="outlined"
                sx={{ textTransform: "none", borderRadius: 999 }}
              >
                Edit caption
              </Button>
            ) : (
              <Button
                onClick={() => {
                  onSaveCaption(item.id, draft.trim());
                  setEditing(false);
                }}
                variant="contained"
                sx={{ textTransform: "none", borderRadius: 999 }}
              >
                Save
              </Button>
            )}
          </>
        ) : null}
      </DialogActions>
    </Dialog>
  );
}


