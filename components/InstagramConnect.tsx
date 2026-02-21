"use client";

import React from "react";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Stack,
  Typography,
} from "@mui/material";
import InstagramIcon from "@mui/icons-material/Instagram";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import LinkOffIcon from "@mui/icons-material/LinkOff";
import type { InstagramAccount } from "@/lib/types";
import {
  getActiveInstagramAccount,
  initInstagramAuth,
  disconnectInstagramAccount,
} from "@/lib/instagram";

export interface InstagramConnectProps {
  userId: string;
  onAccountChange?: (account: InstagramAccount | null) => void;
}

export default function InstagramConnect({
  userId,
  onAccountChange,
}: InstagramConnectProps) {
  const [account, setAccount] = React.useState<InstagramAccount | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [connecting, setConnecting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [disconnectDialogOpen, setDisconnectDialogOpen] = React.useState(false);

  // Load active account on mount
  React.useEffect(() => {
    loadAccount();
  }, [userId]);

  const loadAccount = async () => {
    try {
      setLoading(true);
      setError(null);
      const activeAccount = await getActiveInstagramAccount(userId);
      setAccount(activeAccount);
      onAccountChange?.(activeAccount);
    } catch (err: unknown) {
      console.error("Failed to load Instagram account:", err);
      setError(err instanceof Error ? err.message : "Failed to load Instagram account");
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    try {
      setConnecting(true);
      setError(null);

      // Initialize OAuth flow
      const { authorization_url, state } = await initInstagramAuth();

      // Save state to localStorage for callback verification
      localStorage.setItem("instagram_oauth_state", state);

      // Open OAuth popup
      const width = 600;
      const height = 700;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;

      const popup = window.open(
        authorization_url,
        "Instagram Login",
        `width=${width},height=${height},left=${left},top=${top}`
      );

      // Poll for popup closure
      const pollTimer = setInterval(() => {
        if (popup?.closed) {
          clearInterval(pollTimer);
          setConnecting(false);
          // Reload account after popup closes
          loadAccount();
        }
      }, 500);
    } catch (err: unknown) {
      console.error("Failed to connect Instagram:", err);
      setError(err instanceof Error ? err.message : "Failed to connect Instagram");
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!account) return;

    try {
      setLoading(true);
      await disconnectInstagramAccount(account.id);
      setAccount(null);
      onAccountChange?.(null);
      setDisconnectDialogOpen(false);
    } catch (err: unknown) {
      console.error("Failed to disconnect Instagram:", err);
      setError(err instanceof Error ? err.message : "Failed to disconnect Instagram");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card variant="outlined" sx={{ borderRadius: 3 }}>
        <CardContent>
          <Stack alignItems="center" spacing={2} sx={{ py: 2 }}>
            <CircularProgress size={32} />
            <Typography color="text.secondary">
              Loading Instagram connection...
            </Typography>
          </Stack>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card variant="outlined" sx={{ borderRadius: 3, borderColor: "divider" }}>
        <CardContent>
          <Stack spacing={2}>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <InstagramIcon sx={{ fontSize: 32, color: "#E4405F" }} />
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 800 }}>
                  Instagram Connection
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Connect your Instagram Business account to schedule posts
                </Typography>
              </Box>
            </Stack>

            {error && (
              <Alert severity="error" onClose={() => setError(null)}>
                {error}
              </Alert>
            )}

            <Divider />

            {account ? (
              <Stack spacing={2}>
                <Stack direction="row" spacing={2} alignItems="center">
                  <Avatar
                    src={account.profile_picture_url}
                    alt={account.instagram_username}
                    sx={{ width: 56, height: 56 }}
                  >
                    {account.instagram_username.charAt(0).toUpperCase()}
                  </Avatar>
                  <Box sx={{ flex: 1 }}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                        @{account.instagram_username}
                      </Typography>
                      <CheckCircleIcon
                        sx={{ fontSize: 18, color: "success.main" }}
                      />
                    </Stack>
                    <Typography variant="body2" color="text.secondary">
                      {account.followers_count.toLocaleString()} followers •{" "}
                      {account.account_type}
                    </Typography>
                  </Box>
                </Stack>

                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<LinkOffIcon />}
                  onClick={() => setDisconnectDialogOpen(true)}
                  sx={{ textTransform: "none", borderRadius: 999 }}
                >
                  Disconnect Account
                </Button>
              </Stack>
            ) : (
              <Button
                variant="contained"
                startIcon={<InstagramIcon />}
                onClick={handleConnect}
                disabled={connecting}
                sx={{
                  textTransform: "none",
                  borderRadius: 999,
                  fontWeight: 800,
                  bgcolor: "#E4405F",
                  "&:hover": {
                    bgcolor: "#C13584",
                  },
                }}
              >
                {connecting ? "Connecting..." : "Connect Instagram Account"}
              </Button>
            )}
          </Stack>
        </CardContent>
      </Card>

      {/* Disconnect Confirmation Dialog */}
      <Dialog
        open={disconnectDialogOpen}
        onClose={() => setDisconnectDialogOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Disconnect Instagram Account?</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to disconnect @{account?.instagram_username}?
            You won&apos;t be able to schedule or publish posts until you reconnect.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setDisconnectDialogOpen(false)}
            sx={{ textTransform: "none" }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleDisconnect}
            color="error"
            variant="contained"
            sx={{ textTransform: "none" }}
          >
            Disconnect
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
