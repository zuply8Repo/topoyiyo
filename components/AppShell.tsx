"use client";

import { resetAllDemoData } from "@/lib/store";
import { useAuth, useClerk, useUser } from "@clerk/nextjs";
import {
  AppBar,
  Avatar,
  Box,
  Button,
  Container,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack,
  Toolbar,
  Typography,
} from "@mui/material";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import LogoutIcon from "@mui/icons-material/Logout";
import MenuIcon from "@mui/icons-material/Menu";
import CampaignIcon from "@mui/icons-material/Campaign";
import RateReviewIcon from "@mui/icons-material/RateReview";
import CreditCardIcon from "@mui/icons-material/CreditCard";
import VideoLibraryIcon from "@mui/icons-material/VideoLibrary";
import ImageOutlinedIcon from "@mui/icons-material/ImageOutlined";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import { usePathname, useRouter } from "next/navigation";
import React from "react";

const nav = [
  { label: "New Campaign", href: "/prompt", icon: CampaignIcon },
  { label: "Video", href: "/studio-v2", icon: VideoLibraryIcon },
  { label: "Image", href: "/image", icon: ImageOutlinedIcon },
  { label: "Review", href: "/review", icon: RateReviewIcon },
  { label: "Billing", href: "/billing", icon: CreditCardIcon },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { userId, isLoaded } = useAuth();
  const { user } = useUser();
  const { signOut } = useClerk();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const roleValue = (user?.publicMetadata as Record<string, unknown> | undefined)?.role;
  const rolesValue = (user?.publicMetadata as Record<string, unknown> | undefined)?.roles;
  const normalizedRoles = new Set(
    [
      typeof roleValue === "string" ? roleValue : null,
      ...(Array.isArray(rolesValue) ? rolesValue.map((item) => String(item)) : []),
    ]
      .filter(Boolean)
      .map((item) => String(item).trim().toLowerCase())
  );
  const isAdminUser =
    normalizedRoles.has("admin") ||
    normalizedRoles.has("developer") ||
    pathname.startsWith("/admin");
  const navigation = isAdminUser
    ? [...nav, { label: "Admin", href: "/admin/billing", icon: AdminPanelSettingsIcon }]
    : nav;

  const handleSignOut = async () => {
    await signOut({ redirectUrl: "/sign-in" });
  };

  const handleReset = () => {
    if (userId) {
      resetAllDemoData(userId);
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
                <IconButton
                  aria-label="Open navigation menu"
                  onClick={() => setMobileMenuOpen(true)}
                  sx={{ display: { xs: "flex", sm: "none" }, mr: 0.5 }}
                >
                  <MenuIcon />
                </IconButton>
                <Box
                  component="img"
                  src="/logo/yiyo_logo.png"
                  alt="Yiyo"
                  sx={{
                    height: 32,
                    width: "auto",
                    objectFit: "contain",
                  }}
                />
                <Stack
                  direction="row"
                  spacing={1}
                  sx={{ display: { xs: "none", sm: "flex" } }}
                >
                  {navigation.map((n) => (
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

              <Stack direction="row" spacing={1.5} alignItems="center">
                {isLoaded && user && (
                  <>
                    <Avatar
                      src={user.imageUrl || undefined}
                      alt={user.fullName || "User"}
                      sx={{
                        width: 32,
                        height: 32,
                        display: { xs: "none", sm: "block" },
                      }}
                    />
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: 600,
                        display: { xs: "none", md: "block" },
                      }}
                    >
                      {user.fullName || user.primaryEmailAddress?.emailAddress}
                    </Typography>
                  </>
                )}
                <IconButton aria-label="Reset demo data" onClick={handleReset}>
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

      <Drawer
        anchor="left"
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        sx={{
          display: { xs: "block", sm: "none" },
          "& .MuiDrawer-paper": {
            width: 280,
            borderRight: "1px solid",
            borderColor: "divider",
          },
        }}
      >
        <List sx={{ pt: 2 }}>
          {navigation.map((n) => {
            const Icon = n.icon;
            const isActive = pathname === n.href;
            return (
              <ListItemButton
                key={n.href}
                selected={isActive}
                onClick={() => {
                  router.push(n.href);
                  setMobileMenuOpen(false);
                }}
                sx={{
                  mx: 1,
                  borderRadius: 2,
                  "&.Mui-selected": {
                    bgcolor: "primary.main",
                    color: "primary.contrastText",
                    "&:hover": { bgcolor: "primary.dark" },
                    "& .MuiListItemIcon-root": { color: "inherit" },
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: 40 }}>
                  <Icon />
                </ListItemIcon>
                <ListItemText
                  primary={n.label}
                  primaryTypographyProps={{ fontWeight: 600 }}
                />
              </ListItemButton>
            );
          })}
        </List>
      </Drawer>

      <Container maxWidth="lg" sx={{ py: 3, px: { xs: 2, sm: 3 } }}>
        {children}
      </Container>
    </Box>
  );
}
