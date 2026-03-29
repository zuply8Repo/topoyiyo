"use client";

import React, { useRef, useState } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  TextField,
  Tooltip,
  Typography,
  alpha,
  useTheme,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import SearchIcon from "@mui/icons-material/Search";
import AddIcon from "@mui/icons-material/Add";
import PushPinOutlinedIcon from "@mui/icons-material/PushPinOutlined";
import PersonOutlinedIcon from "@mui/icons-material/PersonOutlined";
import LocationOnOutlinedIcon from "@mui/icons-material/LocationOnOutlined";
import CategoryOutlinedIcon from "@mui/icons-material/CategoryOutlined";
import GridViewOutlinedIcon from "@mui/icons-material/GridViewOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import AddPhotoAlternateOutlinedIcon from "@mui/icons-material/AddPhotoAlternateOutlined";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";

// ── Types ─────────────────────────────────────────────────────────────────

export interface StudioElement {
  id: string;
  name: string;
  category: "character" | "location" | "prop";
  imageBase64: string;
  pinned: boolean;
}

type ActiveCategory = "all" | "pinned" | "character" | "location" | "prop";

const SIDEBAR_ITEMS: {
  id: ActiveCategory;
  label: string;
  Icon: React.ComponentType<{ sx?: object }>;
}[] = [
  { id: "all", label: "All", Icon: GridViewOutlinedIcon },
  { id: "pinned", label: "Pinned", Icon: PushPinOutlinedIcon },
  { id: "character", label: "Characters", Icon: PersonOutlinedIcon },
  { id: "location", label: "Locations", Icon: LocationOnOutlinedIcon },
  { id: "prop", label: "Props", Icon: CategoryOutlinedIcon },
];

// ── Helpers ───────────────────────────────────────────────────────────────

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.includes(",") ? result.split(",")[1] : result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ── ElementCard ───────────────────────────────────────────────────────────

function ElementCard({
  element,
  onInsert,
  onPin,
  onDelete,
}: {
  element: StudioElement;
  onInsert: () => void;
  onPin: () => void;
  onDelete: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <Box
      onClick={onInsert}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      sx={{
        height: 130,
        borderRadius: 2,
        overflow: "hidden",
        position: "relative",
        cursor: "pointer",
        border: "1.5px solid",
        borderColor: "divider",
        bgcolor: "action.hover",
        transition: "border-color 0.15s",
        "&:hover": { borderColor: "primary.main" },
      }}
    >
      {element.imageBase64 ? (
        <Box
          component="img"
          src={`data:image/png;base64,${element.imageBase64}`}
          sx={{ width: "100%", height: "100%", objectFit: "cover" }}
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />
      ) : (
        <Box
          sx={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <AddPhotoAlternateOutlinedIcon sx={{ color: "text.disabled", fontSize: 28 }} />
        </Box>
      )}

      {/* Gradient name label */}
      <Box
        sx={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          px: 0.75,
          py: 0.5,
          background: "linear-gradient(transparent, rgba(0,0,0,0.8))",
        }}
      >
        <Typography
          variant="caption"
          sx={{ color: "white", fontWeight: 600, fontSize: 11, display: "block" }}
          noWrap
        >
          {element.name}
        </Typography>
      </Box>

      {/* Hover action buttons */}
      {hovered && (
        <Box
          sx={{ position: "absolute", top: 4, right: 4, display: "flex", gap: 0.25 }}
          onClick={(e) => e.stopPropagation()}
        >
          <Tooltip title={element.pinned ? "Unpin" : "Pin"}>
            <IconButton
              size="small"
              onClick={onPin}
              sx={{
                bgcolor: "rgba(0,0,0,0.6)",
                color: element.pinned ? "warning.light" : "white",
                p: 0.25,
                "&:hover": { bgcolor: "rgba(0,0,0,0.85)" },
              }}
            >
              <PushPinOutlinedIcon sx={{ fontSize: 12 }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete">
            <IconButton
              size="small"
              onClick={onDelete}
              sx={{
                bgcolor: "rgba(0,0,0,0.6)",
                color: "white",
                p: 0.25,
                "&:hover": { bgcolor: "error.main" },
              }}
            >
              <DeleteOutlineIcon sx={{ fontSize: 12 }} />
            </IconButton>
          </Tooltip>
        </Box>
      )}
    </Box>
  );
}

// ── ElementsPanel ─────────────────────────────────────────────────────────

interface ElementsPanelProps {
  open: boolean;
  onClose: () => void;
  elements: StudioElement[];
  onChange: (elements: StudioElement[]) => void;
  onInsert: (element: StudioElement) => void;
}

export default function ElementsPanel({
  open,
  onClose,
  elements,
  onChange,
  onInsert,
}: ElementsPanelProps) {
  const theme = useTheme();
  const imageInputRef = useRef<HTMLInputElement>(null);

  const [activeCategory, setActiveCategory] = useState<ActiveCategory>("all");
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState<"character" | "location" | "prop">("character");
  const [newImage, setNewImage] = useState("");

  const filtered = elements.filter((el) => {
    if (activeCategory === "pinned" && !el.pinned) return false;
    if (
      activeCategory !== "all" &&
      activeCategory !== "pinned" &&
      el.category !== activeCategory
    )
      return false;
    if (search && !el.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const handleCreate = () => {
    if (!newName.trim()) return;
    const slug = newName.trim().toLowerCase().replace(/\s+/g, "_");
    const el: StudioElement = {
      id: `${Date.now()}`,
      name: slug,
      category: newCategory,
      imageBase64: newImage,
      pinned: false,
    };
    onChange([...elements, el]);
    resetCreateForm();
  };

  const resetCreateForm = () => {
    setCreating(false);
    setNewName("");
    setNewImage("");
    setNewCategory("character");
  };

  const handleImageFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setNewImage(await fileToBase64(file));
    } catch {
      // ignore
    }
    e.target.value = "";
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            borderRadius: 3,
            overflow: "hidden",
          },
        },
      }}
    >
      {/* Header */}
      <DialogTitle
        sx={{
          p: 1.5,
          display: "flex",
          alignItems: "center",
          gap: 1,
          borderBottom: "1px solid",
          borderColor: "divider",
        }}
      >
        {creating && (
          <IconButton size="small" onClick={resetCreateForm} sx={{ mr: 0.25 }}>
            <ArrowBackIcon fontSize="small" />
          </IconButton>
        )}
        <Typography fontWeight={700} sx={{ flex: 1 }}>
          {creating ? "New element" : "Elements"}
        </Typography>
        {!creating && (
          <TextField
            size="small"
            placeholder="Search…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ fontSize: 16 }} />
                </InputAdornment>
              ),
            }}
            sx={{ width: 180 }}
          />
        )}
        <IconButton size="small" onClick={onClose}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 0, display: "flex", minHeight: 400, maxHeight: "70vh" }}>
        {creating ? (
          // ── Create form ──────────────────────────────────────────────────
          <Box sx={{ flex: 1, p: 2.5 }}>
            <Box sx={{ display: "flex", gap: 2, mb: 2.5 }}>
              {/* Image upload */}
              <Box
                onClick={() => imageInputRef.current?.click()}
                sx={{
                  width: 108,
                  height: 108,
                  flexShrink: 0,
                  borderRadius: 2.5,
                  border: "1.5px dashed",
                  borderColor: newImage ? "primary.main" : "divider",
                  overflow: "hidden",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  bgcolor: alpha(theme.palette.action.hover, 0.04),
                  "&:hover": { borderColor: "primary.main" },
                }}
              >
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={handleImageFile}
                />
                {newImage ? (
                  <Box
                    component="img"
                    src={`data:image/png;base64,${newImage}`}
                    sx={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : (
                  <Box sx={{ textAlign: "center" }}>
                    <AddPhotoAlternateOutlinedIcon sx={{ color: "text.disabled", fontSize: 30 }} />
                    <Typography variant="caption" color="text.disabled" display="block" sx={{ fontSize: 10 }}>
                      Upload image
                    </Typography>
                  </Box>
                )}
              </Box>

              {/* Name + category */}
              <Box sx={{ flex: 1, display: "flex", flexDirection: "column", gap: 1.5 }}>
                <TextField
                  label="Name"
                  size="small"
                  fullWidth
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. office"
                  helperText={newName ? `Used as @${newName.toLowerCase().replace(/\s+/g, "_")} in prompt` : "Used as @name in prompt"}
                  onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                  autoFocus
                />
                {/* Category buttons */}
                <Box sx={{ display: "flex", gap: 0.75 }}>
                  {(["character", "location", "prop"] as const).map((cat) => (
                    <Box
                      key={cat}
                      component="button"
                      onClick={() => setNewCategory(cat)}
                      sx={{
                        flex: 1,
                        py: 0.5,
                        px: 0.75,
                        borderRadius: 1.5,
                        border: "1.5px solid",
                        borderColor:
                          newCategory === cat ? "primary.main" : "divider",
                        bgcolor:
                          newCategory === cat
                            ? alpha(theme.palette.primary.main, 0.1)
                            : "transparent",
                        cursor: "pointer",
                        color: newCategory === cat ? "primary.main" : "text.secondary",
                        fontWeight: 600,
                        fontSize: 11,
                        textTransform: "capitalize",
                        transition: "all 0.15s",
                      }}
                    >
                      {cat}
                    </Box>
                  ))}
                </Box>
              </Box>
            </Box>

            <Box sx={{ display: "flex", gap: 1, justifyContent: "flex-end" }}>
              <Button variant="outlined" size="small" onClick={resetCreateForm}>
                Cancel
              </Button>
              <Button
                variant="contained"
                size="small"
                onClick={handleCreate}
                disabled={!newName.trim()}
              >
                Create
              </Button>
            </Box>
          </Box>
        ) : (
          // ── Browse view ──────────────────────────────────────────────────
          <>
            {/* Sidebar */}
            <List
              sx={{
                width: 152,
                flexShrink: 0,
                borderRight: "1px solid",
                borderColor: "divider",
                py: 1,
              }}
            >
              {SIDEBAR_ITEMS.map(({ id, label, Icon }) => (
                <ListItem key={id} disablePadding>
                  <ListItemButton
                    selected={activeCategory === id}
                    onClick={() => setActiveCategory(id)}
                    sx={{ borderRadius: 2, mx: 0.5, py: 0.5, mb: 0.25 }}
                  >
                    <ListItemIcon sx={{ minWidth: 28 }}>
                      <Icon sx={{ fontSize: 17 }} />
                    </ListItemIcon>
                    <ListItemText
                      primary={label}
                      primaryTypographyProps={{
                        variant: "body2",
                        fontWeight: activeCategory === id ? 700 : 400,
                        fontSize: 13,
                      }}
                    />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>

            {/* Grid */}
            <Box sx={{ flex: 1, p: 1.5, overflowY: "auto" }}>
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(105px, 1fr))",
                  gap: 1,
                }}
              >
                {/* Create new card */}
                <Box
                  onClick={() => setCreating(true)}
                  sx={{
                    height: 130,
                    borderRadius: 2,
                    border: "1.5px dashed",
                    borderColor: "divider",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    gap: 0.5,
                    transition: "all 0.15s",
                    "&:hover": {
                      borderColor: "primary.main",
                      bgcolor: alpha(theme.palette.primary.main, 0.04),
                    },
                  }}
                >
                  <AddIcon sx={{ fontSize: 26, color: "text.disabled" }} />
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11 }}>
                    Create new
                  </Typography>
                </Box>

                {filtered.map((el) => (
                  <ElementCard
                    key={el.id}
                    element={el}
                    onInsert={() => {
                      onInsert(el);
                      onClose();
                    }}
                    onPin={() =>
                      onChange(
                        elements.map((e) =>
                          e.id === el.id ? { ...e, pinned: !e.pinned } : e,
                        ),
                      )
                    }
                    onDelete={() => onChange(elements.filter((e) => e.id !== el.id))}
                  />
                ))}
              </Box>
            </Box>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
