"use client";

import React from "react";
import { Chip, Tooltip } from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ScheduleIcon from "@mui/icons-material/Schedule";
import PendingIcon from "@mui/icons-material/Pending";
import ErrorIcon from "@mui/icons-material/Error";
import CancelIcon from "@mui/icons-material/Cancel";
import PublishIcon from "@mui/icons-material/Publish";
import type { InstagramPublishStatus } from "@/lib/types";

export interface InstagramStatusBadgeProps {
  status: InstagramPublishStatus;
  permalink?: string;
  errorMessage?: string;
  size?: "small" | "medium";
}

const STATUS_CONFIG: Record<
  InstagramPublishStatus,
  {
    label: string;
    color: "default" | "primary" | "secondary" | "error" | "warning" | "info" | "success";
    icon: React.ReactElement;
    tooltip: string;
  }
> = {
  pending: {
    label: "Pending",
    color: "default",
    icon: <PendingIcon />,
    tooltip: "Waiting to be scheduled",
  },
  scheduled: {
    label: "Scheduled",
    color: "info",
    icon: <ScheduleIcon />,
    tooltip: "Scheduled for Instagram",
  },
  publishing: {
    label: "Publishing",
    color: "warning",
    icon: <PublishIcon />,
    tooltip: "Currently publishing to Instagram",
  },
  published: {
    label: "Published",
    color: "success",
    icon: <CheckCircleIcon />,
    tooltip: "Successfully published to Instagram",
  },
  failed: {
    label: "Failed",
    color: "error",
    icon: <ErrorIcon />,
    tooltip: "Failed to publish to Instagram",
  },
  cancelled: {
    label: "Cancelled",
    color: "default",
    icon: <CancelIcon />,
    tooltip: "Schedule cancelled",
  },
};

export default function InstagramStatusBadge({
  status,
  permalink,
  errorMessage,
  size = "small",
}: InstagramStatusBadgeProps) {
  const config = STATUS_CONFIG[status];

  const tooltipTitle = React.useMemo(() => {
    if (status === "failed" && errorMessage) {
      return `${config.tooltip}: ${errorMessage}`;
    }
    if (status === "published" && permalink) {
      return "Published to Instagram - Click to view";
    }
    return config.tooltip;
  }, [status, errorMessage, permalink, config.tooltip]);

  const handleClick = (e: React.MouseEvent) => {
    if (status === "published" && permalink) {
      e.stopPropagation();
      window.open(permalink, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <Tooltip title={tooltipTitle} arrow>
      <Chip
        icon={config.icon}
        label={config.label}
        color={config.color}
        size={size}
        onClick={status === "published" && permalink ? handleClick : undefined}
        sx={{
          fontWeight: 700,
          cursor: status === "published" && permalink ? "pointer" : "default",
          "& .MuiChip-icon": {
            fontSize: size === "small" ? 16 : 20,
          },
        }}
      />
    </Tooltip>
  );
}
