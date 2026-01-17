"use client";

import React from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Alert,
  Box,
  CircularProgress,
  Container,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import InstagramIcon from "@mui/icons-material/Instagram";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";
import { completeInstagramAuth } from "@/lib/instagram";

export default function InstagramCallbackPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { data: session } = useSession();
  const userId = session?.user?.id;

  const [status, setStatus] = React.useState<"loading" | "success" | "error">("loading");
  const [error, setError] = React.useState<string | null>(null);
  const [accountUsername, setAccountUsername] = React.useState<string>("");

  React.useEffect(() => {
    if (!userId) {
      setStatus("error");
      setError("Not authenticated. Please log in first.");
      return;
    }

    handleCallback();
  }, [userId, searchParams]);

  const handleCallback = async () => {
    try {
      // Get OAuth parameters from URL
      const code = searchParams.get("code");
      const state = searchParams.get("state");
      const errorParam = searchParams.get("error");
      const errorDescription = searchParams.get("error_description");

      // Check for OAuth errors
      if (errorParam) {
        throw new Error(
          errorDescription || `OAuth error: ${errorParam}`
        );
      }

      if (!code || !state) {
        throw new Error("Missing authorization code or state");
      }

      // Verify state token (CSRF protection)
      const savedState = localStorage.getItem("instagram_oauth_state");
      if (state !== savedState) {
        throw new Error("Invalid state parameter. Possible CSRF attack.");
      }

      // Complete OAuth flow
      const response = await completeInstagramAuth(code, state, userId!);
      
      setAccountUsername(response.instagram_username);
      setStatus("success");

      // Clean up
      localStorage.removeItem("instagram_oauth_state");
      const returnTo = localStorage.getItem("instagram_oauth_return");
      localStorage.removeItem("instagram_oauth_return");

      // Redirect back to dashboard after success
      setTimeout(() => {
        if (returnTo === "schedule_dialog") {
          // Return to dashboard which will reopen the dialog
          router.push("/dashboard?instagram_connected=true");
        } else {
          router.push("/dashboard");
        }
      }, 2000);
    } catch (err: any) {
      console.error("Instagram OAuth callback error:", err);
      setError(err.message || "Failed to connect Instagram account");
      setStatus("error");

      // Redirect to dashboard after error
      setTimeout(() => {
        router.push("/dashboard?instagram_error=true");
      }, 3000);
    }
  };

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Paper
          elevation={3}
          sx={{
            p: 4,
            borderRadius: 4,
            width: "100%",
          }}
        >
          <Stack spacing={3} alignItems="center">
            <InstagramIcon
              sx={{
                fontSize: 64,
                color: status === "success" ? "success.main" : status === "error" ? "error.main" : "#E4405F",
              }}
            />

            {status === "loading" && (
              <>
                <CircularProgress size={48} sx={{ color: "#E4405F" }} />
                <Typography variant="h6" align="center" sx={{ fontWeight: 800 }}>
                  Connecting Instagram Account
                </Typography>
                <Typography color="text.secondary" align="center">
                  Please wait while we complete the authorization...
                </Typography>
              </>
            )}

            {status === "success" && (
              <>
                <CheckCircleIcon sx={{ fontSize: 64, color: "success.main" }} />
                <Typography variant="h6" align="center" sx={{ fontWeight: 800 }}>
                  Instagram Connected Successfully!
                </Typography>
                <Typography color="text.secondary" align="center">
                  @{accountUsername} is now connected.
                </Typography>
                <Typography variant="body2" color="text.secondary" align="center">
                  Redirecting back to dashboard...
                </Typography>
              </>
            )}

            {status === "error" && (
              <>
                <ErrorIcon sx={{ fontSize: 64, color: "error.main" }} />
                <Typography variant="h6" align="center" sx={{ fontWeight: 800 }}>
                  Connection Failed
                </Typography>
                <Alert severity="error" sx={{ width: "100%" }}>
                  {error || "Failed to connect Instagram account"}
                </Alert>
                <Typography variant="body2" color="text.secondary" align="center">
                  Redirecting back to dashboard...
                </Typography>
              </>
            )}
          </Stack>
        </Paper>
      </Box>
    </Container>
  );
}
