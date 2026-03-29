"use client";

import React from "react";
import { Box, Typography } from "@mui/material";
import { useAuth } from "@clerk/nextjs";
import ImageStudioPanel from "@/components/studio-v2/ImageStudioPanel";

export default function ImagePage() {
  const { userId, isLoaded, getToken } = useAuth();

  if (!isLoaded || !userId) {
    return (
      <Box sx={{ minHeight: "60vh", display: "grid", placeItems: "center" }}>
        <Typography>Loading...</Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: "flex",
        height: { xs: "calc(100vh - 56px)", sm: "calc(100vh - 64px)" },
        mt: -3,
        mx: { xs: -2, sm: -3 },
        overflow: "hidden",
      }}
    >
      <ImageStudioPanel userId={userId} getToken={getToken} />
    </Box>
  );
}
