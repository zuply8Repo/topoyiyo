"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Divider,
  Grid,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import ContentCard from "@/components/ContentCard";
import PromptCard from "@/components/PromptCard";
import {
  contentCardExamples,
  imageGalleryExamples,
  modelSelectorExamples,
  outputsPanelExamples,
  playgroundPromptSchema,
  promptCardExamples,
  promptFieldExamples,
} from "@/components/_examples/studioV2States";
import PromptField from "@/components/studio-v2/PromptField";
import ImageGallery from "@/components/studio-v2/ImageGallery";
import ModelSelector from "@/components/studio-v2/ModelSelector";
import OutputsPanel from "@/components/studio-v2/OutputsPanel";
import type { StudioElement } from "@/components/studio-v2/ElementsPanel";

function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <Paper variant="outlined" sx={{ borderRadius: 4, overflow: "hidden" }}>
      <Stack spacing={1.5} sx={{ p: 3 }}>
        <Typography variant="h6" fontWeight={800}>
          {title}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {description}
        </Typography>
      </Stack>
      <Divider />
      <Box sx={{ p: 3 }}>{children}</Box>
    </Paper>
  );
}

function ExamplePicker({
  options,
  value,
  onChange,
}: {
  options: readonly { id: string; label: string }[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
      {options.map((option) => (
        <Button
          key={option.id}
          variant={value === option.id ? "contained" : "outlined"}
          size="small"
          onClick={() => onChange(option.id)}
          sx={{ textTransform: "none", borderRadius: 999, fontWeight: 700 }}
        >
          {option.label}
        </Button>
      ))}
    </Stack>
  );
}

export default function UiPlayground() {
  const [modelExampleId, setModelExampleId] = useState(modelSelectorExamples[0].id);
  const [promptExampleId, setPromptExampleId] = useState(promptFieldExamples[0].id);
  const [galleryExampleId, setGalleryExampleId] = useState(imageGalleryExamples[0].id);
  const [outputsExampleId, setOutputsExampleId] = useState(outputsPanelExamples[0].id);
  const [promptCardExampleId, setPromptCardExampleId] = useState(promptCardExamples[0].id);
  const [contentCardExampleId, setContentCardExampleId] = useState(contentCardExamples[0].id);

  const modelExample = useMemo(
    () =>
      modelSelectorExamples.find((example) => example.id === modelExampleId) ??
      modelSelectorExamples[0],
    [modelExampleId]
  );

  const promptExample = useMemo(
    () =>
      promptFieldExamples.find((example) => example.id === promptExampleId) ??
      promptFieldExamples[0],
    [promptExampleId]
  );
  const galleryExample = useMemo(
    () =>
      imageGalleryExamples.find((example) => example.id === galleryExampleId) ??
      imageGalleryExamples[0],
    [galleryExampleId]
  );
  const outputsExample = useMemo(
    () =>
      outputsPanelExamples.find((example) => example.id === outputsExampleId) ??
      outputsPanelExamples[0],
    [outputsExampleId]
  );
  const promptCardExample = useMemo(
    () =>
      promptCardExamples.find((example) => example.id === promptCardExampleId) ??
      promptCardExamples[0],
    [promptCardExampleId]
  );
  const contentCardExample = useMemo(
    () =>
      contentCardExamples.find((example) => example.id === contentCardExampleId) ??
      contentCardExamples[0],
    [contentCardExampleId]
  );

  const [selectedModelId, setSelectedModelId] = useState<string | null>(
    modelExample.selectedModelId
  );
  const [promptValue, setPromptValue] = useState(promptExample.value);
  const [promptEnhance, setPromptEnhance] = useState(promptExample.enhancePrompt);
  const [promptElements, setPromptElements] = useState<StudioElement[]>([
    ...promptExample.elements,
  ]);

  const [savedJobs, setSavedJobs] = useState([...outputsExample.savedJobs]);
  const [activeResolvedVideoUrl, setActiveResolvedVideoUrl] = useState<string | null>(
    outputsExample.activeResolvedVideoUrl
  );
  const [contentMediaType, setContentMediaType] = useState<"REELS" | "STORIES">(
    contentCardExample.mediaType
  );

  useEffect(() => {
    setSelectedModelId(modelExample.selectedModelId);
  }, [modelExample]);

  useEffect(() => {
    setPromptValue(promptExample.value);
    setPromptEnhance(promptExample.enhancePrompt);
    setPromptElements([...promptExample.elements]);
  }, [promptExample]);

  useEffect(() => {
    setSavedJobs([...outputsExample.savedJobs]);
    setActiveResolvedVideoUrl(outputsExample.activeResolvedVideoUrl);
  }, [outputsExample]);

  useEffect(() => {
    setContentMediaType(contentCardExample.mediaType);
  }, [contentCardExample]);

  return (
    <Box sx={{ bgcolor: "background.default", minHeight: "100vh" }}>
      <Box
        sx={{
          maxWidth: 1440,
          mx: "auto",
          px: { xs: 2, md: 4 },
          py: { xs: 3, md: 5 },
        }}
      >
        <Stack spacing={1.5} sx={{ mb: 4 }}>
          <Typography variant="overline" color="primary.main" sx={{ fontWeight: 800 }}>
            UI Playground
          </Typography>
          <Typography variant="h3" sx={{ fontWeight: 900, letterSpacing: "-0.03em" }}>
            Isolated component design space
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 860 }}>
            Use this route to iterate on visuals, spacing, copy, and component states with fake data.
            Keep business logic, auth wiring, and backend dependencies out of this surface.
          </Typography>
        </Stack>

        <Stack spacing={3}>
          <SectionCard
            title="ModelSelector"
            description="Preview real model labels and icon states with mock model families instead of loading them from the API."
          >
            <Stack spacing={2}>
              <ExamplePicker
                options={modelSelectorExamples}
                value={modelExampleId}
                onChange={setModelExampleId}
              />
              <Paper variant="outlined" sx={{ borderRadius: 3, p: 2, maxWidth: 420 }}>
                <ModelSelector
                  models={[...modelExample.models]}
                  selectedModelId={selectedModelId}
                  onSelect={setSelectedModelId}
                />
              </Paper>
              <Typography variant="caption" color="text.secondary">
                This uses the production selector and icon mapping. Video models share
                the video icon, while image models use the image icon.
              </Typography>
            </Stack>
          </SectionCard>

          <SectionCard
            title="PromptField"
            description="Design the prompt input in isolation, including helper text, validation, and mentioned-element chips."
          >
            <Stack spacing={2}>
              <ExamplePicker
                options={promptFieldExamples}
                value={promptExampleId}
                onChange={setPromptExampleId}
              />
              <PromptField
                field={playgroundPromptSchema}
                value={promptValue}
                onChange={setPromptValue}
                error={promptExample.error}
                enhancePrompt={promptEnhance}
                onEnhanceChange={setPromptEnhance}
                elements={promptElements}
                onElementsChange={setPromptElements}
              />
            </Stack>
          </SectionCard>

          <SectionCard
            title="ImageGallery"
            description="Review empty and populated gallery states without running image generation or loading real model schemas."
          >
            <Stack spacing={2}>
              <ExamplePicker
                options={imageGalleryExamples}
                value={galleryExampleId}
                onChange={setGalleryExampleId}
              />
              <Paper
                variant="outlined"
                sx={{ borderRadius: 3, minHeight: 360, bgcolor: "background.paper" }}
              >
                <ImageGallery
                  images={[...galleryExample.images]}
                  emptyLabel={galleryExample.emptyLabel}
                />
              </Paper>
            </Stack>
          </SectionCard>

          <SectionCard
            title="OutputsPanel"
            description="Exercise empty, generating, and completed states while keeping generation APIs out of the design workflow."
          >
            <Stack spacing={2}>
              <ExamplePicker
                options={outputsPanelExamples}
                value={outputsExampleId}
                onChange={setOutputsExampleId}
              />
              <Paper
                variant="outlined"
                sx={{ borderRadius: 3, overflow: "hidden", height: 540, bgcolor: "background.paper" }}
              >
                <OutputsPanel
                  savedJobs={savedJobs}
                  activeJobId={outputsExample.activeJobId}
                  activeJobStatus={outputsExample.activeJobStatus}
                  activeJobProgress={outputsExample.activeJobProgress}
                  activeResolvedVideoUrl={activeResolvedVideoUrl}
                  isDownloadingVideo={outputsExample.isDownloadingVideo}
                  getToken={async () => null}
                  onBlobUrlLoaded={(jobId, blobUrl) => {
                    setSavedJobs((current) =>
                      current.map((job) =>
                        job.job_id === jobId ? { ...job, blobUrl } : job
                      )
                    );
                    if (jobId === outputsExample.activeJobId) {
                      setActiveResolvedVideoUrl(blobUrl);
                    }
                  }}
                />
              </Paper>
            </Stack>
          </SectionCard>

          <SectionCard
            title="Cards"
            description="Preview reusable card patterns and their key visual states without depending on review, approval, or content flows."
          >
            <Stack spacing={3}>
              <Stack spacing={2}>
                <Typography variant="subtitle1" fontWeight={800}>
                  PromptCard
                </Typography>
                <ExamplePicker
                  options={promptCardExamples}
                  value={promptCardExampleId}
                  onChange={setPromptCardExampleId}
                />
                <Box sx={{ maxWidth: 560 }}>
                  <PromptCard
                    {...promptCardExample.card}
                    onApprove={() => {}}
                    onEdit={() => {}}
                    onReview={() => {}}
                  />
                </Box>
              </Stack>

              <Divider />

              <Stack spacing={2}>
                <Typography variant="subtitle1" fontWeight={800}>
                  ContentCard
                </Typography>
                <ExamplePicker
                  options={contentCardExamples}
                  value={contentCardExampleId}
                  onChange={setContentCardExampleId}
                />
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <ContentCard
                      item={contentCardExample.card}
                      campaignName={contentCardExample.campaignName}
                      onDelete={() => {}}
                      mediaType={contentMediaType}
                      onMediaTypeChange={setContentMediaType}
                    />
                  </Grid>
                </Grid>
              </Stack>
            </Stack>
          </SectionCard>
        </Stack>
      </Box>
    </Box>
  );
}
