"use client";

import { clearSpecPrompt, saveSpecPrompt } from "@/lib/store";
import {
  ApiError,
  createCampaign,
  sendMarketingChatMessage,
  approveMarketingBrief,
  ChatMessage,
  VideoGenerationModel,
  quoteCredits,
} from "@/lib/api";
import { useAuth } from "@clerk/nextjs";
import SendIcon from "@mui/icons-material/Send";
import {
  Box,
  Button,
  Card,
  CardContent,
  Grid,
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
  const { userId, isLoaded, getToken } = useAuth();

  const [input, setInput] = React.useState("");
  const msgId = React.useRef(1);
  const [messages, setMessages] = React.useState<Msg[]>([
    {
      id: "m0",
      role: "assistant",
      text: "Hi! I'm here to help you create your marketing campaign brief. I'll ask you some questions to understand your needs. What are the goals for your campaign?",
    },
  ]);

  // Conversation state for the backend agent
  const [conversationId, setConversationId] = React.useState<string>();
  const [backendMessages, setBackendMessages] = React.useState<ChatMessage[]>(
    []
  );
  const [isSending, setIsSending] = React.useState(false);
  const [hasBrief, setHasBrief] = React.useState(false);
  const [briefContent, setBriefContent] = React.useState<string>();
  const [isProcessingBrief, setIsProcessingBrief] = React.useState(false);
  // Force VEO model for all campaigns
  const videoModel: VideoGenerationModel = "veo";

  // Clear any previously saved prompt when component mounts for a fresh start
  React.useEffect(() => {
    if (userId) clearSpecPrompt(userId);
  }, [userId]);

  const send = async () => {
    const trimmed = input.trim();
    if (!trimmed || isSending) return;

    setIsSending(true);
    const nextId = () => `m${msgId.current++}`;

    // Add user message to UI
    const userMsg: Msg = { id: nextId(), role: "user", text: trimmed };
    setMessages((m) => [...m, userMsg]);
    setInput(""); // Clear input field immediately

    try {
      const token = await getToken();
      const allText =
        backendMessages.map((m) => m.content).join(" ") + " " + trimmed;
      const approxInputTokens = Math.max(1, Math.ceil(allText.trim().length / 4));
      const quote = await quoteCredits(
        {
          action_type: "marketing_chat_turn",
          model_key: "marketing_text_model",
          dimensions: {
            input_tokens: approxInputTokens,
            output_tokens: 600,
          },
        },
        token ?? undefined
      );
      if (!quote.has_sufficient_credits) {
        router.push("/billing");
        setIsSending(false);
        return;
      }

      // Prepare messages for backend
      const userMessage: ChatMessage = {
        role: "user",
        content: trimmed,
      };

      const messagesToSend =
        backendMessages.length > 0
          ? [...backendMessages, userMessage]
          : [userMessage];

      // Call the marketing intake agent
      const response = await sendMarketingChatMessage(
        messagesToSend,
        conversationId,
        token ?? undefined
      );

      // Update conversation state
      setConversationId(response.conversation_id);
      setBackendMessages(response.messages);

      // Add assistant response to UI
      const assistantMsg: Msg = {
        id: nextId(),
        role: "assistant",
        text: response.assistant_message,
      };
      setMessages((m) => [...m, assistantMsg]);

      // Check if the brief was generated (backend sets this flag explicitly)
      if (response.brief_generated && response.brief_content) {
        setHasBrief(true);
        setBriefContent(response.brief_content);
      }

      // Check if the brief was generated via tool (preferred method)
      // The fallback detection happens in a separate useEffect
    } catch (error) {
      console.error("Failed to send message:", error);
      if (error instanceof ApiError && error.code === "INSUFFICIENT_CREDITS") {
        router.push("/billing");
        return;
      }

      // Show error message to user
      const errorMsg: Msg = {
        id: nextId(),
        role: "assistant",
        text: "Sorry, I encountered an error. Please try again.",
      };
      setMessages((m) => [...m, errorMsg]);
    } finally {
      setIsSending(false);
    }
  };

  // Helper to build a brief from the conversation when tool isn't called
  const buildBriefFromConversation = () => {
    // Extract key information from the conversation
    const conversationText = messages
      .map((m) => `${m.role}: ${m.text}`)
      .join("\n\n");

    // Create a formatted brief from the conversation
    const brief = `
=== MARKETING BRIEF GENERATED ===

📋 EXECUTIVE SUMMARY:
Campaign brief generated from conversation with the marketing team.

📄 FULL BRIEF:

# Marketing Campaign Brief

## Conversation Summary
${conversationText}

## Campaign Information
Based on the conversation above, this brief captures the key details discussed for the marketing campaign.

---
Generated: ${new Date().toLocaleDateString()}
`;

    return brief;
  };

  // Helper to extract marketing brief from stored content
  const extractBrief = () => {
    if (!briefContent) {
      return null;
    }

    // Extract executive summary (between the marker and FULL BRIEF)
    const summaryStart = briefContent.indexOf("📋 EXECUTIVE SUMMARY:");
    const fullBriefStart = briefContent.indexOf("📄 FULL BRIEF:");

    let summary = "";
    if (summaryStart !== -1 && fullBriefStart !== -1) {
      summary = briefContent
        .substring(
          summaryStart + "📋 EXECUTIVE SUMMARY:".length,
          fullBriefStart
        )
        .trim();
    }

    // Extract full brief (everything after "📄 FULL BRIEF:")
    let fullBrief = "";
    if (fullBriefStart !== -1) {
      fullBrief = briefContent
        .substring(fullBriefStart + "📄 FULL BRIEF:".length)
        .trim();
    }

    return {
      summary: summary || "Campaign brief generated",
      fullBrief: fullBrief || briefContent,
    };
  };

  // Auto-detect conversation completion and trigger brief creation
  React.useEffect(() => {
    // Only run if we don't already have a brief and aren't processing
    if (hasBrief || isProcessingBrief || isSending || messages.length < 10) {
      return;
    }

    // Check the last assistant message for completion signals
    const lastAssistantMsg = messages
      .slice()
      .reverse()
      .find((m) => m.role === "assistant");

    if (!lastAssistantMsg) return;

    const completionPhrases = [
      "here's the complete marketing",
      "complete marketing brief",
      "marketing campaign brief",
      "brief for your",
      "if you have any more questions",
      "feel free to ask",
      "need adjustments",
    ];

    const lowerText = lastAssistantMsg.text.toLowerCase();
    const seemsComplete = completionPhrases.some((phrase) =>
      lowerText.includes(phrase)
    );

    if (seemsComplete && !briefContent) {
      // Wait a moment then automatically generate
      const timer = setTimeout(() => {
        const conversationBrief = buildBriefFromConversation();
        if (conversationBrief) {
          setHasBrief(true);
          setBriefContent(conversationBrief);
        }
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [messages, hasBrief, isProcessingBrief, isSending, briefContent]);

  // Automatically process and save the brief when it's generated
  React.useEffect(() => {
    if (hasBrief && briefContent && !isProcessingBrief && userId) {
      const processBrief = async () => {
        setIsProcessingBrief(true);

        try {
          const brief = extractBrief();

          if (!brief) {
            console.error("Failed to extract brief content");
            setIsProcessingBrief(false);
            return;
          }

          const token = await getToken();
          // Save the marketing brief to database
          await approveMarketingBrief(
            brief.summary,
            brief.fullBrief,
            conversationId,
            token ?? undefined
          );

          // Save to localStorage as backup
          saveSpecPrompt(brief.fullBrief, userId);

          // Start campaign generation with the full brief and VEO model
          const response = await createCampaign(
            brief.fullBrief,
            videoModel,
            token ?? undefined
          );

          // Navigate to loading page with job_id and campaign_id
          // The loading page will redirect to approval page when prompts are ready
          router.push(
            `/loading?job_id=${response.job_id}&campaign_id=${response.campaign_id}`
          );
        } catch (error) {
          console.error("Failed to process and start campaign:", error);
          if (
            error instanceof ApiError &&
            error.code === "INSUFFICIENT_CREDITS"
          ) {
            router.push("/billing");
            return;
          }
          setIsProcessingBrief(false);

          // Show error to user
          const errorMsg: Msg = {
            id: `m${msgId.current++}`,
            role: "assistant",
            text: "Sorry, I encountered an error saving your brief. Please try refreshing the page.",
          };
          setMessages((m) => [...m, errorMsg]);
        }
      };

      processBrief();
    }
  }, [
    hasBrief,
    briefContent,
    isProcessingBrief,
    userId,
    conversationId,
    router,
  ]);

  return !isLoaded ? (
    <Box
      sx={{
        minHeight: "60vh",
        display: "grid",
        placeItems: "center",
        bgcolor: "background.default",
      }}
    >
      <Typography>Loading...</Typography>
    </Box>
  ) : !userId ? (
    <Box
      sx={{
        minHeight: "60vh",
        display: "grid",
        placeItems: "center",
        bgcolor: "background.default",
      }}
    >
      <Typography>Please sign in to continue.</Typography>
    </Box>
  ) : (
    <Stack spacing={2.5}>
      <Stack spacing={0.25}>
        <Typography variant="h5" sx={{ fontWeight: 900 }}>
          Prompt
        </Typography>
        <Typography color="text.secondary">
          Chat with our AI marketing specialist to build your campaign brief.
          Answer the questions and we&apos;ll automatically generate prompts for
          your review when ready.
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
                    bgcolor:
                      m.role === "user" ? "grey.900" : "background.paper",
                    color: m.role === "user" ? "common.white" : "text.primary",
                  }}
                >
                  <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
                    {m.text}
                  </Typography>
                </Paper>
              </Box>
            ))}
            {isProcessingBrief && (
              <Box sx={{ alignSelf: "center", maxWidth: "92%" }}>
                <Paper
                  variant="outlined"
                  sx={{
                    borderRadius: 4,
                    px: 3,
                    py: 2,
                    borderColor: "primary.main",
                    bgcolor: "primary.dark",
                    textAlign: "center",
                  }}
                >
                  <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                    🚀 Starting Your Campaign Generation
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Saving brief and preparing your content...
                  </Typography>
                </Paper>
              </Box>
            )}
          </Stack>
        </Box>

        <Box sx={{ p: 2, borderTop: "1px solid", borderColor: "divider" }}>
          <Stack spacing={1.5}>
            <TextField
              label="Specification prompt"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder="Example: Generate 6 IG posts for founders, with a motivational tone, 1:1 images, and captions under 2200 chars..."
              multiline
              minRows={4}
              fullWidth
              disabled={isProcessingBrief}
            />
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={1.25}
              justifyContent="flex-end"
            >
              <Button
                onClick={send}
                startIcon={<SendIcon />}
                variant="outlined"
                disabled={isSending || !input.trim() || isProcessingBrief}
                sx={{ textTransform: "none", borderRadius: 999 }}
              >
                {isSending ? "Thinking..." : "Send"}
              </Button>
              {messages.length > 5 && !hasBrief && !isProcessingBrief && (
                <Button
                  onClick={() => {
                    const brief = buildBriefFromConversation();
                    if (brief) {
                      setHasBrief(true);
                      setBriefContent(brief);
                    }
                  }}
                  variant="contained"
                  sx={{ textTransform: "none", borderRadius: 999 }}
                >
                  Complete & Generate
                </Button>
              )}
            </Stack>
          </Stack>
        </Box>
      </Paper>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card
            variant="outlined"
            sx={{ height: "100%", borderRadius: 2, borderColor: "divider" }}
          >
            <CardContent sx={{ p: 2 }}>
              <Typography
                variant="subtitle1"
                sx={{
                  fontWeight: 800,
                  mb: 1,
                  color: "primary.main",
                  letterSpacing: "-0.02em",
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                }}
              >
                <Box
                  component="span"
                  sx={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 24,
                    height: 24,
                    borderRadius: "50%",
                    bgcolor: "primary.main",
                    color: "primary.contrastText",
                    fontSize: "0.75rem",
                    fontWeight: 900,
                  }}
                >
                  1
                </Box>
                Your AI Marketing Expert
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Here is your AI marketing expert. It will walk you through with
                questions how to generate your prompts for your campaigns.
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card
            variant="outlined"
            sx={{ height: "100%", borderRadius: 2, borderColor: "divider" }}
          >
            <CardContent sx={{ p: 2 }}>
              <Typography
                variant="subtitle1"
                sx={{
                  fontWeight: 800,
                  mb: 1,
                  color: "primary.main",
                  letterSpacing: "-0.02em",
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                }}
              >
                <Box
                  component="span"
                  sx={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 24,
                    height: 24,
                    borderRadius: "50%",
                    bgcolor: "primary.main",
                    color: "primary.contrastText",
                    fontSize: "0.75rem",
                    fontWeight: 900,
                  }}
                >
                  2
                </Box>
                Automatic Prompt Generation
              </Typography>
              <Typography variant="body2" color="text.secondary">
                After your marketing expert gathers all important information,
                it will automatically generate your prompts for your video and
                images.
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card
            variant="outlined"
            sx={{ height: "100%", borderRadius: 2, borderColor: "divider" }}
          >
            <CardContent sx={{ p: 2 }}>
              <Typography
                variant="subtitle1"
                sx={{
                  fontWeight: 800,
                  mb: 1,
                  color: "primary.main",
                  letterSpacing: "-0.02em",
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                }}
              >
                <Box
                  component="span"
                  sx={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 24,
                    height: 24,
                    borderRadius: "50%",
                    bgcolor: "primary.main",
                    color: "primary.contrastText",
                    fontSize: "0.75rem",
                    fontWeight: 900,
                  }}
                >
                  3
                </Box>
                Final Review
              </Typography>
              <Typography variant="body2" color="text.secondary">
                You will have a final checkup before sending to the available
                video models on the review page.
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Stack>
  );
}
