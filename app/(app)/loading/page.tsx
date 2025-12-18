"use client";

import { Box, LinearProgress, Paper, Stack, Typography } from "@mui/material";
import { useRouter } from "next/navigation";
import React from "react";

export default function LoadingPage() {
  const router = useRouter();
  const [progress, setProgress] = React.useState(12);

  React.useEffect(() => {
    const tick = window.setInterval(() => {
      setProgress((p) => Math.min(95, p + Math.random() * 18));
    }, 200);
    const t = window.setTimeout(() => {
      router.replace("/review");
    }, 1200);
    return () => {
      window.clearInterval(tick);
      window.clearTimeout(t);
    };
  }, [router]);

  return (
    <Box sx={{ display: "grid", placeItems: "center", minHeight: { xs: 420, sm: 520 } }}>
      <Paper
        variant="outlined"
        sx={{
          borderRadius: 4,
          borderColor: "divider",
          p: { xs: 3, sm: 4 },
          width: "100%",
          maxWidth: 520,
        }}
      >
        <Stack spacing={2}>
          <Stack spacing={0.5}>
            <Typography variant="h5" sx={{ fontWeight: 900 }}>
              Generating content…
            </Typography>
            <Typography color="text.secondary">
              Stubbed loading step (no real AI yet). Redirecting to review.
            </Typography>
          </Stack>
          <LinearProgress variant="determinate" value={progress} />
        </Stack>
      </Paper>
    </Box>
  );
}


