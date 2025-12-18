"use client";

import { getSpecPrompt, saveSpecPrompt } from "@/lib/store";
import { useSession } from "next-auth/react";
import SendIcon from "@mui/icons-material/Send";
import VerifiedIcon from "@mui/icons-material/Verified";
import {
  Box,
  Button,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useRouter } from "next/navigation";
import React from "react";

type Msg = { id: string; role: "user" | "assistant"; text: string };

export default function PromptPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const userId = session?.user?.id;

  const [input, setInput] = React.useState("");
  const msgId = React.useRef(1);
  const [messages, setMessages] = React.useState<Msg[]>([
    {
      id: "m0",
      role: "assistant",
      text: "Describe what you want to generate. Use Send to iterate, then Validate to lock the spec.",
    },
  ]);

  React.useEffect(() => {
    const existing = getSpecPrompt(userId);
    if (existing) setInput(existing);
  }, [userId]);

  const send = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    const nextId = () => `m${msgId.current++}`;
    setMessages((m) => [
      ...m,
      { id: nextId(), role: "user", text: trimmed },
      {
        id: nextId(),
        role: "assistant",
        text: "Looks good. When you're ready, click Validate to save the spec and generate a review queue (stub).",
      },
    ]);
  };

  const validate = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    saveSpecPrompt(trimmed, userId);
    router.push("/loading");
  };

  return (
    <Stack spacing={2.5}>
      <Stack spacing={0.25}>
        <Typography variant="h5" sx={{ fontWeight: 900 }}>
          Prompt
        </Typography>
        <Typography color="text.secondary">
          Chat-style prompt drafting. <b>Validate</b> saves the spec (stub) and moves to review.
        </Typography>
      </Stack>

      <Paper
        variant="outlined"
        sx={{
          borderRadius: 4,
          overflow: "hidden",
          borderColor: "divider",
          display: "flex",
          flexDirection: "column",
          minHeight: { xs: 520, sm: 560 },
        }}
      >
        <Box sx={{ flex: 1, p: 2, overflowY: "auto" }}>
          <Stack spacing={1.5}>
            {messages.map((m) => (
              <Box
                key={m.id}
                sx={{
                  alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                  maxWidth: "92%",
                }}
              >
                <Paper
                  variant="outlined"
                  sx={{
                    borderRadius: 4,
                    px: 2,
                    py: 1.25,
                    borderColor: "divider",
                    bgcolor: m.role === "user" ? "grey.900" : "background.paper",
                    color: m.role === "user" ? "common.white" : "text.primary",
                  }}
                >
                  <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
                    {m.text}
                  </Typography>
                </Paper>
              </Box>
            ))}
          </Stack>
        </Box>

        <Box sx={{ p: 2, borderTop: "1px solid", borderColor: "divider" }}>
          <Stack spacing={1.5}>
            <TextField
              label="Specification prompt"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Example: Generate 6 IG posts for founders, with a motivational tone, 1:1 images, and captions under 2200 chars..."
              multiline
              minRows={4}
              fullWidth
            />
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25} justifyContent="flex-end">
              <Button
                onClick={send}
                startIcon={<SendIcon />}
                variant="outlined"
                sx={{ textTransform: "none", borderRadius: 999 }}
              >
                Send
              </Button>
              <Button
                onClick={validate}
                startIcon={<VerifiedIcon />}
                variant="contained"
                sx={{ textTransform: "none", borderRadius: 999, fontWeight: 800 }}
              >
                Validate
              </Button>
            </Stack>
          </Stack>
        </Box>
      </Paper>
    </Stack>
  );
}


