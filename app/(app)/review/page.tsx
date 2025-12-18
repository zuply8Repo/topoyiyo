"use client";

import ContentCard from "@/components/ContentCard";
import ContentModal from "@/components/ContentModal";
import { getPendingItems, updateItemCaption, updateItemStatus } from "@/lib/store";
import type { ContentItem } from "@/lib/types";
import { useSession } from "next-auth/react";
import {
  Alert,
  Box,
  Button,
  Grid,
  Snackbar,
  Stack,
  Typography,
} from "@mui/material";
import { useRouter } from "next/navigation";
import React from "react";

export default function ReviewPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const userId = session?.user?.id;

  const [items, setItems] = React.useState<ContentItem[]>([]);
  const [openItem, setOpenItem] = React.useState<ContentItem | null>(null);
  const [toast, setToast] = React.useState<{ msg: string; severity: "success" | "info" | "error" } | null>(
    null,
  );

  const refresh = React.useCallback(() => {
    setItems(getPendingItems(userId));
  }, [userId]);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  const approve = (id: string) => {
    updateItemStatus(id, "approved", { userId });
    setToast({ msg: "Approved. Moved to dashboard list (stub).", severity: "success" });
    refresh();
  };

  const reject = (id: string) => {
    updateItemStatus(id, "rejected", { regenerationRequested: true, userId });
    setToast({ msg: "Rejected. Regeneration requested (stub).", severity: "info" });
    refresh();
  };

  const saveCaption = (id: string, caption: string) => {
    updateItemCaption(id, caption, userId);
    setToast({ msg: "Caption saved (stub).", severity: "success" });
    refresh();
  };

  return (
    <Stack spacing={2.5}>
      <Stack spacing={0.25}>
        <Typography variant="h5" sx={{ fontWeight: 900 }}>
          Review
        </Typography>
        <Typography color="text.secondary">
          Approve, reject (one click), or edit captions. Click a card for an expanded modal view.
        </Typography>
      </Stack>

      {items.length === 0 ? (
        <Box
          sx={{
            border: "1px dashed",
            borderColor: "divider",
            borderRadius: 4,
            p: 4,
            textAlign: "center",
            bgcolor: "background.paper",
          }}
        >
          <Stack spacing={1.5} alignItems="center">
            <Typography variant="h6" sx={{ fontWeight: 900 }}>
              No pending items
            </Typography>
            <Typography color="text.secondary">
              You’ve approved or rejected everything in the review queue.
            </Typography>
            <Button
              variant="contained"
              onClick={() => router.push("/dashboard")}
              sx={{ textTransform: "none", borderRadius: 999, fontWeight: 800 }}
            >
              Go to Dashboard
            </Button>
          </Stack>
        </Box>
      ) : (
        <Grid container spacing={2}>
          {items.map((item) => (
            <Grid key={item.id} item xs={12} sm={6} md={4}>
              <ContentCard
                item={item}
                onOpen={(i) => setOpenItem(i)}
                onApprove={approve}
                onReject={reject}
                onSaveCaption={saveCaption}
              />
            </Grid>
          ))}
        </Grid>
      )}

      <ContentModal
        open={Boolean(openItem)}
        item={openItem}
        onClose={() => setOpenItem(null)}
        onApprove={approve}
        onReject={reject}
        onSaveCaption={saveCaption}
      />

      <Snackbar
        open={Boolean(toast)}
        autoHideDuration={2600}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        {toast ? (
          <Alert onClose={() => setToast(null)} severity={toast.severity} sx={{ width: "100%" }}>
            {toast.msg}
          </Alert>
        ) : null}
      </Snackbar>
    </Stack>
  );
}


