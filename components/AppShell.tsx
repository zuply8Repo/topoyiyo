"use client";

import { resetAllDemoData } from "@/lib/store";
import { signOut, useSession } from "next-auth/react";
import {
  AppBar,
  Avatar,
  Box,
  Button,
  Container,
  IconButton,
  Stack,
  Toolbar,
  Typography,
} from "@mui/material";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import LogoutIcon from "@mui/icons-material/Logout";
import { usePathname, useRouter } from "next/navigation";
import React from "react";

const nav = [
  { label: "Prompt", href: "/prompt" },
  { label: "Review", href: "/review" },
  { label: "Dashboard", href: "/dashboard" },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session, status } = useSession();

  const handleSignOut = async () => {
    await signOut({ callbackUrl: "/login" });
  };

  const handleReset = () => {
    if (session?.user?.id) {
      resetAllDemoData(session.user.id);
      router.push("/prompt");
    }
  };

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          bgcolor: "background.paper",
          color: "text.primary",
          borderBottom: "1px solid",
          borderColor: "divider",
          left: 0,
          right: 0,
          width: "100%",
        }}
      >
        {/* Important: keep the AppBar full-width; only constrain inner content. */}
        <Container
          maxWidth={false}
          disableGutters
          sx={{ px: { xs: 2, sm: 3 } }}
        >
          <Toolbar disableGutters sx={{ width: "100%" }}>
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              sx={{ width: "100%" }}
            >
              <Stack direction="row" alignItems="center" spacing={2}>
                <Typography variant="h6" sx={{ fontWeight: 800 }}>
                  Content Beaver
                </Typography>
                <Stack
                  direction="row"
                  spacing={1}
                  sx={{ display: { xs: "none", sm: "flex" } }}
                >
                  {nav.map((n) => (
                    <Button
                      key={n.href}
                      onClick={() => router.push(n.href)}
                      size="small"
                      variant={pathname === n.href ? "contained" : "text"}
                      sx={{
                        textTransform: "none",
                        fontWeight: 700,
                        borderRadius: 999,
                      }}
                    >
                      {n.label}
                    </Button>
                  ))}
                </Stack>
              </Stack>

              <Stack direction="row" spacing={1} alignItems="center">
                {session?.user && (
                  <>
                    <Avatar
                      src={session.user.image || undefined}
                      alt={session.user.name || "User"}
                      sx={{ width: 32, height: 32, display: { xs: "none", sm: "block" } }}
                    />
                    <Typography
                      variant="body2"
                      sx={{ fontWeight: 600, display: { xs: "none", md: "block" } }}
                    >
                      {session.user.name}
                    </Typography>
                  </>
                )}
                <IconButton
                  aria-label="Reset demo data"
                  onClick={handleReset}
                >
                  <RestartAltIcon />
                </IconButton>
                <Button
                  onClick={handleSignOut}
                  startIcon={<LogoutIcon />}
                  variant="outlined"
                  size="small"
                  sx={{ textTransform: "none", borderRadius: 999 }}
                >
                  Sign out
                </Button>
              </Stack>
            </Stack>
          </Toolbar>
        </Container>
      </AppBar>

      <Container maxWidth="lg" sx={{ py: 3, px: { xs: 2, sm: 3 } }}>
        {children}
      </Container>
    </Box>
  );
}
