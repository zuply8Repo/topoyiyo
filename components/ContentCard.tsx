"use client";

import type { ContentItem } from "@/lib/types";
import {
  Box,
  Card,
  CardActionArea,
  CardContent,
  CardMedia,
  IconButton,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import EditIcon from "@mui/icons-material/Edit";
import SaveIcon from "@mui/icons-material/Save";
import CloseIcon from "@mui/icons-material/Close";
import React from "react";

export type ContentCardProps = {
  item: ContentItem;
  onOpen: (item: ContentItem) => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onSaveCaption: (id: string, caption: string) => void;
};

export default function ContentCard({
  item,
  onOpen,
  onApprove,
  onReject,
  onSaveCaption,
}: ContentCardProps) {
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(item.caption);

  React.useEffect(() => setDraft(item.caption), [item.caption]);

  return (
    <Card
      variant="outlined"
      sx={{
        borderRadius: 4,
        overflow: "hidden",
        borderColor: "divider",
        height: "100%",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <CardActionArea onClick={() => onOpen(item)} sx={{ flexGrow: 1 }}>
        <CardMedia
          component="img"
          height={220}
          image={item.imageUrl}
          alt="Generated post"
          sx={{ objectFit: "cover" }}
        />
        <CardContent>
          <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 0.75 }}>
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
              minRows={4}
              fullWidth
              size="small"
            />
          )}
        </CardContent>
      </CardActionArea>

      <Box sx={{ px: 1.25, pb: 1.25 }}>
        <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
          <Stack direction="row" spacing={0.5}>
            <Tooltip title="Approve">
              <IconButton
                aria-label="Approve"
                color="success"
                onClick={() => onApprove(item.id)}
              >
                <CheckCircleIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Reject (one click)">
              <IconButton aria-label="Reject" color="error" onClick={() => onReject(item.id)}>
                <CancelIcon />
              </IconButton>
            </Tooltip>
          </Stack>

          {!editing ? (
            <Tooltip title="Edit caption">
              <IconButton aria-label="Edit" onClick={() => setEditing(true)}>
                <EditIcon />
              </IconButton>
            </Tooltip>
          ) : (
            <Stack direction="row" spacing={0.5}>
              <Tooltip title="Save">
                <IconButton
                  aria-label="Save"
                  color="primary"
                  onClick={() => {
                    onSaveCaption(item.id, draft.trim());
                    setEditing(false);
                  }}
                >
                  <SaveIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="Cancel">
                <IconButton
                  aria-label="Cancel editing"
                  onClick={() => {
                    setDraft(item.caption);
                    setEditing(false);
                  }}
                >
                  <CloseIcon />
                </IconButton>
              </Tooltip>
            </Stack>
          )}
        </Stack>
      </Box>
    </Card>
  );
}


