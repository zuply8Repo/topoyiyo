"use client";

import { useAuth, useClerk } from "@clerk/nextjs";
import AttachMoneyOutlinedIcon from "@mui/icons-material/AttachMoneyOutlined";
import AutoAwesomeOutlinedIcon from "@mui/icons-material/AutoAwesomeOutlined";
import BlurOnOutlinedIcon from "@mui/icons-material/BlurOnOutlined";
import BrushOutlinedIcon from "@mui/icons-material/BrushOutlined";
import CampaignOutlinedIcon from "@mui/icons-material/CampaignOutlined";
import ChevronLeftOutlinedIcon from "@mui/icons-material/ChevronLeftOutlined";
import CollectionsOutlinedIcon from "@mui/icons-material/CollectionsOutlined";
import EditOffOutlinedIcon from "@mui/icons-material/EditOffOutlined";
import EmojiEmotionsOutlinedIcon from "@mui/icons-material/EmojiEmotionsOutlined";
import FacebookOutlinedIcon from "@mui/icons-material/FacebookOutlined";
import FiberManualRecordOutlinedIcon from "@mui/icons-material/FiberManualRecordOutlined";
import ForumOutlinedIcon from "@mui/icons-material/ForumOutlined";
import HourglassBottomOutlinedIcon from "@mui/icons-material/HourglassBottomOutlined";
import InstagramIcon from "@mui/icons-material/Instagram";
import KeyboardVoiceOutlinedIcon from "@mui/icons-material/KeyboardVoiceOutlined";
import LinkedInIcon from "@mui/icons-material/LinkedIn";
import MenuBookOutlinedIcon from "@mui/icons-material/MenuBookOutlined";
import MoreHorizOutlinedIcon from "@mui/icons-material/MoreHorizOutlined";
import MovieCreationOutlinedIcon from "@mui/icons-material/MovieCreationOutlined";
import MusicNoteOutlinedIcon from "@mui/icons-material/MusicNoteOutlined";
import OpenInFullOutlinedIcon from "@mui/icons-material/OpenInFullOutlined";
import PersonAddAlt1OutlinedIcon from "@mui/icons-material/PersonAddAlt1Outlined";
import PsychologyAltOutlinedIcon from "@mui/icons-material/PsychologyAltOutlined";
import RedditIcon from "@mui/icons-material/Reddit";
import SchoolOutlinedIcon from "@mui/icons-material/SchoolOutlined";
import SearchOutlinedIcon from "@mui/icons-material/SearchOutlined";
import SentimentDissatisfiedOutlinedIcon from "@mui/icons-material/SentimentDissatisfiedOutlined";
import SmartDisplayOutlinedIcon from "@mui/icons-material/SmartDisplayOutlined";
import TuneOutlinedIcon from "@mui/icons-material/TuneOutlined";
import VideoCameraBackOutlinedIcon from "@mui/icons-material/VideoCameraBackOutlined";
import WorkOutlineOutlinedIcon from "@mui/icons-material/WorkOutlineOutlined";
import HubOutlinedIcon from "@mui/icons-material/HubOutlined";
import XIcon from "@mui/icons-material/X";
import YouTubeIcon from "@mui/icons-material/YouTube";
import {
  Alert,
  alpha,
  Box,
  Button,
  Container,
  Grid,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useRouter, useSearchParams } from "next/navigation";
import React, { Suspense } from "react";
import { ONBOARDING_STEP_OPTIONS, OnboardingAnswers } from "@/lib/onboarding";

type OptionItem = {
  id: string;
  label: string;
  description?: string;
  icon: React.ReactNode;
};

const PRIMARY_USE_OPTIONS: OptionItem[] = [
  {
    id: "education_learning",
    label: "Education & Learning",
    description: "Learn AI video tools by creating",
    icon: <SchoolOutlinedIcon />,
  },
  {
    id: "filmmaking_art",
    label: "Filmmaking & Art",
    description: "Create cinematic stories with full control",
    icon: <MovieCreationOutlinedIcon />,
  },
  {
    id: "freelance_projects",
    label: "Freelance Projects",
    description: "Deliver high-quality videos with better margins",
    icon: <WorkOutlineOutlinedIcon />,
  },
  {
    id: "marketing_ads",
    label: "Marketing & Ads",
    description: "Create ads that convert without studio costs",
    icon: <CampaignOutlinedIcon />,
  },
  {
    id: "personal_use",
    label: "Personal Use",
    description: "Experiment, create, and share for fun",
    icon: <AutoAwesomeOutlinedIcon />,
  },
  {
    id: "social_media_growth",
    label: "Social Media Growth",
    description: "Create viral TikTok and Reels daily",
    icon: <SmartDisplayOutlinedIcon />,
  },
];

const AI_EXPERIENCE_OPTIONS: OptionItem[] = [
  {
    id: "beginner",
    label: "Beginner",
    description: "Simple interface with ready-made templates",
    icon: <FiberManualRecordOutlinedIcon />,
  },
  {
    id: "intermediate",
    label: "Intermediate",
    description: "Fast workflows for viral, trend-ready content",
    icon: <BlurOnOutlinedIcon />,
  },
  {
    id: "advanced",
    label: "Advanced",
    description: "Consistent, brand-safe assets for client work",
    icon: <HubOutlinedIcon />,
  },
  {
    id: "expert",
    label: "Expert",
    description: "Full creative control with director tools",
    icon: <HubOutlinedIcon />,
  },
];

const CONTENT_GOAL_OPTIONS: OptionItem[] = [
  {
    id: "commercial_ad_videos",
    label: "Commercial & Ad Videos",
    icon: <WorkOutlineOutlinedIcon />,
  },
  {
    id: "video_generations",
    label: "Video Generations",
    icon: <VideoCameraBackOutlinedIcon />,
  },
  {
    id: "realistic_ai_avatars",
    label: "Realistic AI Avatars",
    icon: <PersonAddAlt1OutlinedIcon />,
  },
  {
    id: "cinematic_visuals",
    label: "Cinematic Visuals",
    icon: <CollectionsOutlinedIcon />,
  },
  { id: "storyboarding", label: "Storyboarding", icon: <MenuBookOutlinedIcon /> },
  { id: "upscale", label: "Upscale", icon: <OpenInFullOutlinedIcon /> },
  {
    id: "viral_social_media_content",
    label: "Viral Social Media Content",
    icon: <EmojiEmotionsOutlinedIcon />,
  },
  {
    id: "lipsync_talking_avatars",
    label: "Lipsync & Talking Avatars",
    icon: <KeyboardVoiceOutlinedIcon />,
  },
  {
    id: "image_editing_inpaint",
    label: "Image Editing & Inpaint",
    icon: <BrushOutlinedIcon />,
  },
];

const DISCOVERY_SOURCE_OPTIONS: OptionItem[] = [
  { id: "facebook", label: "Facebook", icon: <FacebookOutlinedIcon /> },
  { id: "youtube", label: "YouTube", icon: <YouTubeIcon /> },
  { id: "tiktok", label: "TikTok", icon: <MusicNoteOutlinedIcon /> },
  { id: "word_of_mouth", label: "Word of mouth", icon: <ForumOutlinedIcon /> },
  { id: "google_search", label: "Google search", icon: <SearchOutlinedIcon /> },
  { id: "news_articles", label: "News / Articles", icon: <SchoolOutlinedIcon /> },
  { id: "twitter_x", label: "Twitter / X", icon: <XIcon /> },
  { id: "reddit", label: "Reddit", icon: <RedditIcon /> },
  { id: "linkedin", label: "LinkedIn", icon: <LinkedInIcon /> },
  { id: "chatgpt", label: "ChatGPT", icon: <PsychologyAltOutlinedIcon /> },
  { id: "instagram", label: "Instagram", icon: <InstagramIcon /> },
  { id: "other", label: "Other", icon: <MoreHorizOutlinedIcon /> },
];

const FRUSTRATION_OPTIONS: OptionItem[] = [
  {
    id: "ai_confusing",
    label: "AI is confusing to me",
    icon: <SentimentDissatisfiedOutlinedIcon />,
  },
  {
    id: "limited_generations",
    label: "Limited generations",
    icon: <HourglassBottomOutlinedIcon />,
  },
  {
    id: "high_cost",
    label: "High cost of top models",
    icon: <AttachMoneyOutlinedIcon />,
  },
  {
    id: "inconsistent_results",
    label: "Inconsistent results",
    icon: <TuneOutlinedIcon />,
  },
  {
    id: "not_production_ready",
    label: "Not production-ready outputs",
    icon: <EditOffOutlinedIcon />,
  },
  { id: "other", label: "Other", icon: <MoreHorizOutlinedIcon /> },
];

function isAllowed(value: string, options: readonly string[]) {
  return options.includes(value);
}

function OnboardingPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/prompt";
  const { userId, isLoaded } = useAuth();
  const clerk = useClerk();

  const [step, setStep] = React.useState(0);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [answers, setAnswers] = React.useState<OnboardingAnswers>({
    primaryUse: "",
    aiExperience: "",
    contentGoals: [],
    discoverySource: "",
    discoverySourceOtherText: "",
    frustration: "",
    frustrationOtherText: "",
  });

  const totalSteps = 5;

  const isStepValid = React.useMemo(() => {
    if (step === 0) {
      return isAllowed(answers.primaryUse, ONBOARDING_STEP_OPTIONS.primaryUse);
    }
    if (step === 1) {
      return isAllowed(
        answers.aiExperience,
        ONBOARDING_STEP_OPTIONS.aiExperience
      );
    }
    if (step === 2) return answers.contentGoals.length > 0;
    if (step === 3) {
      if (!isAllowed(answers.discoverySource, ONBOARDING_STEP_OPTIONS.discoverySource)) {
        return false;
      }
      return answers.discoverySource !== "other"
        ? true
        : Boolean(answers.discoverySourceOtherText?.trim());
    }
    if (step === 4) {
      if (!isAllowed(answers.frustration, ONBOARDING_STEP_OPTIONS.frustration)) {
        return false;
      }
      return answers.frustration !== "other"
        ? true
        : Boolean(answers.frustrationOtherText?.trim());
    }
    return false;
  }, [answers, step]);

  const cardSx = (selected: boolean) => ({
    borderRadius: 3,
    border: "1px solid",
    borderColor: selected ? "primary.main" : alpha("#ffffff", 0.12),
    bgcolor: alpha("#ffffff", selected ? 0.12 : 0.06),
    p: 2.5,
    minHeight: 146,
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    textAlign: "center",
    gap: 1.25,
    cursor: "pointer",
    transition: "all 140ms ease",
    "&:hover": {
      borderColor: selected ? "primary.main" : alpha("#ffffff", 0.28),
      bgcolor: alpha("#ffffff", selected ? 0.16 : 0.1),
    },
  });

  const submitOnboarding = async () => {
    setError(null);
    if (!isLoaded) return;
    if (!userId) {
      setError("Please sign in to continue.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "Failed to save onboarding profile.");
      }

      try {
        await clerk.session?.reload();
      } catch {
        // best-effort
      }

      window.location.assign(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  const goNext = async () => {
    if (!isStepValid || submitting) return;
    if (step === totalSteps - 1) {
      await submitOnboarding();
      return;
    }
    setStep((prev) => prev + 1);
  };

  const toggleGoal = (goalId: string) => {
    setAnswers((prev) => {
      const exists = prev.contentGoals.includes(goalId);
      return {
        ...prev,
        contentGoals: exists
          ? prev.contentGoals.filter((g) => g !== goalId)
          : [...prev.contentGoals, goalId],
      };
    });
  };

  const renderSingleChoice = (
    options: OptionItem[],
    selected: string,
    onSelect: (id: string) => void
  ) => (
    <Grid container spacing={2}>
      {options.map((option) => {
        const isSelected = selected === option.id;
        return (
          <Grid key={option.id} size={{ xs: 12, sm: 6, md: 4 }}>
            <Box onClick={() => onSelect(option.id)} sx={cardSx(isSelected)}>
              <Box sx={{ fontSize: 28, color: alpha("#ffffff", 0.9) }}>{option.icon}</Box>
              <Typography sx={{ fontWeight: 800, fontSize: "1.25rem" }}>
                {option.label}
              </Typography>
              {option.description && (
                <Typography sx={{ color: alpha("#ffffff", 0.62), fontSize: ".95rem" }}>
                  {option.description}
                </Typography>
              )}
            </Box>
          </Grid>
        );
      })}
    </Grid>
  );

  const renderMultiChoice = () => (
    <Grid container spacing={2}>
      {CONTENT_GOAL_OPTIONS.map((option) => {
        const isSelected = answers.contentGoals.includes(option.id);
        return (
          <Grid key={option.id} size={{ xs: 12, sm: 6, md: 4 }}>
            <Box onClick={() => toggleGoal(option.id)} sx={cardSx(isSelected)}>
              <Box sx={{ fontSize: 28, color: alpha("#ffffff", 0.9) }}>{option.icon}</Box>
              <Typography sx={{ fontWeight: 800, fontSize: "1.25rem" }}>
                {option.label}
              </Typography>
            </Box>
          </Grid>
        );
      })}
    </Grid>
  );

  const stepContent = [
    {
      title: "How do you plan to use Yiyo Studio?",
      subtitle: "We'll tailor features and AI tools to your goals",
      content: renderSingleChoice(
        PRIMARY_USE_OPTIONS,
        answers.primaryUse,
        (id) => setAnswers((prev) => ({ ...prev, primaryUse: id }))
      ),
    },
    {
      title: "How experienced are you with AI?",
      subtitle: "We'll adapt the interface complexity to match your expertise level",
      content: renderSingleChoice(
        AI_EXPERIENCE_OPTIONS,
        answers.aiExperience,
        (id) => setAnswers((prev) => ({ ...prev, aiExperience: id }))
      ),
    },
    {
      title: "What do you want to create?",
      subtitle: "Choose as many options as you want",
      content: renderMultiChoice(),
    },
    {
      title: "How did you hear about us?",
      subtitle: "This helps us improve our product",
      content: (
        <Stack spacing={2}>
          {renderSingleChoice(
            DISCOVERY_SOURCE_OPTIONS,
            answers.discoverySource,
            (id) => setAnswers((prev) => ({ ...prev, discoverySource: id }))
          )}
          {answers.discoverySource === "other" && (
            <TextField
              placeholder="Tell us where you found us"
              value={answers.discoverySourceOtherText || ""}
              onChange={(e) =>
                setAnswers((prev) => ({
                  ...prev,
                  discoverySourceOtherText: e.target.value,
                }))
              }
              fullWidth
              sx={{
                "& .MuiInputBase-root": {
                  bgcolor: alpha("#ffffff", 0.08),
                  color: "#fff",
                  borderRadius: 2,
                },
              }}
            />
          )}
        </Stack>
      ),
    },
    {
      title: "Last question. What frustrates you most about AI content generation?",
      subtitle: "We'll focus on delivering what matters most to you",
      content: (
        <Stack spacing={2}>
          {renderSingleChoice(FRUSTRATION_OPTIONS, answers.frustration, (id) =>
            setAnswers((prev) => ({ ...prev, frustration: id }))
          )}
          {answers.frustration === "other" && (
            <TextField
              placeholder="Tell us your main frustration"
              value={answers.frustrationOtherText || ""}
              onChange={(e) =>
                setAnswers((prev) => ({
                  ...prev,
                  frustrationOtherText: e.target.value,
                }))
              }
              fullWidth
              sx={{
                "& .MuiInputBase-root": {
                  bgcolor: alpha("#ffffff", 0.08),
                  color: "#fff",
                  borderRadius: 2,
                },
              }}
            />
          )}
        </Stack>
      ),
    },
  ];

  const currentStep = stepContent[step];

  return (
    <Container
      maxWidth="lg"
      sx={{ py: { xs: 3, sm: 5 }, minHeight: "100vh", bgcolor: "#000" }}
    >
      <Paper
        variant="outlined"
        sx={{
          borderRadius: 4,
          p: { xs: 2.5, sm: 4 },
          bgcolor: "#000",
          borderColor: alpha("#ffffff", 0.08),
          color: "#fff",
        }}
      >
        <Stack spacing={3}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Button
              startIcon={<ChevronLeftOutlinedIcon />}
              onClick={() => {
                if (step > 0) setStep((prev) => prev - 1);
                else router.push("/sign-in");
              }}
              sx={{ textTransform: "none", color: alpha("#ffffff", 0.7), p: 0, minWidth: 0 }}
            >
              Back
            </Button>
            <Typography sx={{ color: alpha("#ffffff", 0.7) }}>
              {step + 1} of {totalSteps}
            </Typography>
          </Stack>

          <Stack spacing={1}>
            <Typography
              sx={{
                fontWeight: 900,
                fontSize: { xs: "2rem", sm: "2.8rem" },
                letterSpacing: "-0.03em",
              }}
            >
              {currentStep.title}
            </Typography>
            <Typography sx={{ color: alpha("#ffffff", 0.6), fontSize: "1.1rem" }}>
              {currentStep.subtitle}
            </Typography>
          </Stack>

          {error && (
            <Alert severity="error" sx={{ borderRadius: 2 }}>
              {error}
            </Alert>
          )}

          {currentStep.content}

          <Stack direction="row" justifyContent="center" sx={{ pt: 1 }}>
            <Button
              variant="contained"
              disabled={!isStepValid || submitting || !isLoaded}
              onClick={goNext}
              sx={{ minWidth: 180, borderRadius: 2.5, textTransform: "none", fontWeight: 800 }}
            >
              {submitting ? "Saving..." : step === totalSteps - 1 ? "Finish" : "Continue"}
            </Button>
          </Stack>
        </Stack>
      </Paper>
    </Container>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense>
      <OnboardingPageContent />
    </Suspense>
  );
}
