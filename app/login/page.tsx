"use client";

import { signIn, useSession } from "next-auth/react";
import GoogleIcon from "@mui/icons-material/Google";
import {
  Avatar,
  Box,
  Button,
  Container,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import { useRouter } from "next/navigation";
import React from "react";

export default function LoginPage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  React.useEffect(() => {
    if (status === "authenticated") {
      router.replace("/prompt");
    }
  }, [status, router]);

  const handleSignIn = async () => {
    await signIn("google", { callbackUrl: "/prompt" });
  };

  if (status === "loading") {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          bgcolor: "background.default",
        }}
      >
        <Typography>Loading...</Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        bgcolor: "background.default",
        px: 2,
      }}
    >
      <Container maxWidth="sm">
        <Paper
          variant="outlined"
          sx={{
            borderRadius: 4,
            p: { xs: 3, sm: 4 },
            borderColor: "divider",
          }}
        >
          <Stack spacing={2.5} alignItems="center" textAlign="center">
            <Avatar sx={{ bgcolor: "primary.main", width: 56, height: 56 }}>
              <GoogleIcon />
            </Avatar>
            <Stack spacing={0.5}>
              <Typography variant="h4" sx={{ fontWeight: 900 }}>
                Sign in
              </Typography>
              <Typography color="text.secondary">
                UI-only Google-style sign-in placeholder.
              </Typography>
            </Stack>

            <Button
              fullWidth
              size="large"
              variant="contained"
              startIcon={<GoogleIcon />}
              onClick={handleSignIn}
              sx={{
                textTransform: "none",
                borderRadius: 999,
                py: 1.25,
                fontWeight: 800,
              }}
            >
              Sign in with Google
            </Button>

            <Typography variant="caption" color="text.secondary">
              Secure authentication with Google OAuth 2.0
            </Typography>
          </Stack>
        </Paper>
      </Container>
    </Box>
  );
}


