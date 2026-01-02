"use client";

import ContentCard from "@/components/ContentCard";
import { fetchCampaignContent, updateContentCaption, deleteContentItem } from "@/lib/api";
import type { ContentItem } from "@/lib/types";
import { useSession } from "next-auth/react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Grid,
  Snackbar,
  Stack,
  Typography,
} from "@mui/material";
import { useRouter, useSearchParams } from "next/navigation";
import React from "react";

export default function ReviewPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const campaignId = searchParams.get("campaignId");
  
  const { data: session } = useSession();
  const userId = session?.user?.id;

  const [items, setItems] = React.useState<ContentItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [toast, setToast] = React.useState<{ 
    msg: string; 
    severity: "success" | "info" | "error" 
  } | null>(null);

  const loadContent = React.useCallback(async () => {
    if (!campaignId || !userId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const content = await fetchCampaignContent(campaignId, userId);
      setItems(content);
    } catch (error) {
      console.error("Failed to load campaign content:", error);
      setToast({ 
        msg: "Failed to load content. Please try again.", 
        severity: "error" 
      });
    } finally {
      setLoading(false);
    }
  }, [campaignId, userId]);

  React.useEffect(() => {
    loadContent();
  }, [loadContent]);

  const handleSaveCaption = async (id: string, caption: string) => {
    if (!userId) return;

    try {
      await updateContentCaption(id, userId, caption);
      
      // Update local state
      setItems(prev => 
        prev.map(item => 
          item.id === id ? { ...item, caption } : item
        )
      );
      
      setToast({ msg: "Caption saved successfully!", severity: "success" });
    } catch (error) {
      console.error("Failed to save caption:", error);
      setToast({ msg: "Failed to save caption. Please try again.", severity: "error" });
    }
  };

  const handleDelete = async (id: string) => {
    if (!userId) return;

    // Confirm deletion
    if (!window.confirm("Are you sure you want to delete this content item?")) {
      return;
    }

    try {
      await deleteContentItem(id, userId);
      
      // Remove from local state
      setItems(prev => prev.filter(item => item.id !== id));
      
      setToast({ msg: "Content deleted successfully!", severity: "success" });
    } catch (error) {
      console.error("Failed to delete content:", error);
      setToast({ msg: "Failed to delete content. Please try again.", severity: "error" });
    }
  };

  if (loading) {
    return (
      <Stack spacing={2.5} alignItems="center" justifyContent="center" sx={{ minHeight: 400 }}>
        <CircularProgress />
        <Typography color="text.secondary">Loading campaign content...</Typography>
      </Stack>
    );
  }

  if (!campaignId) {
    return (
      <Stack spacing={2.5}>
        <Stack spacing={0.25}>
          <Typography variant="h5" sx={{ fontWeight: 900 }}>
            Review
          </Typography>
          <Typography color="text.secondary">
            View and edit your generated campaign content.
          </Typography>
        </Stack>
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
              No campaign selected
            </Typography>
            <Typography color="text.secondary">
              Please select a campaign to review its content.
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
      </Stack>
    );
  }

  return (
    <Stack spacing={2.5}>
      <Stack spacing={0.25}>
        <Typography variant="h5" sx={{ fontWeight: 900 }}>
          Review Campaign Content
        </Typography>
        <Typography color="text.secondary">
          Edit captions or delete items you don't want to keep.
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
              No content items
            </Typography>
            <Typography color="text.secondary">
              This campaign doesn't have any generated content yet.
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
                onSaveCaption={handleSaveCaption}
                onDelete={handleDelete}
              />
            </Grid>
          ))}
        </Grid>
      )}

      <Snackbar
        open={Boolean(toast)}
        autoHideDuration={3000}
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
