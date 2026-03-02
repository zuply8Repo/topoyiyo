"use client";

import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
} from "@mui/material";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import React from "react";

export type MobileScheduleDialogProps = {
  open: boolean;
  onCancel: () => void;
  onConfirm: (dateISO: string, time: string) => void;
  /** Pre-fill with existing scheduled date when rescheduling */
  initialDate?: string;
  /** Pre-fill with existing scheduled time when rescheduling */
  initialTime?: string;
};

function toDateISO(date: Date): string {
  const y = date.getFullYear();
  const m = (date.getMonth() + 1).toString().padStart(2, "0");
  const d = date.getDate().toString().padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function toHHMM(date: Date): string {
  const h = date.getHours().toString().padStart(2, "0");
  const m = date.getMinutes().toString().padStart(2, "0");
  return `${h}:${m}`;
}

export default function MobileScheduleDialog({
  open,
  onCancel,
  onConfirm,
  initialDate,
  initialTime,
}: MobileScheduleDialogProps) {
  const now = new Date();
  const [dateISO, setDateISO] = React.useState(initialDate ?? toDateISO(now));
  const [time, setTime] = React.useState(initialTime ?? toHHMM(now));

  React.useEffect(() => {
    if (open) {
      const n = new Date();
      setDateISO(initialDate ?? toDateISO(n));
      setTime(initialTime ?? toHHMM(n));
    }
  }, [open, initialDate, initialTime]);

  const handleConfirm = () => {
    if (!dateISO) return;
    const [h, m] = time.split(":").map(Number);
    const hour = Math.min(23, Math.max(0, isNaN(h) ? 12 : h));
    const minute = Math.min(59, Math.max(0, isNaN(m) ? 0 : m));
    onConfirm(
      dateISO,
      `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`
    );
  };

  return (
    <Dialog
      open={open}
      onClose={onCancel}
      fullWidth
      maxWidth="xs"
      PaperProps={{ sx: { borderRadius: 4, maxWidth: { xs: "92vw", sm: 420 } } }}
    >
      <DialogTitle
        sx={{ fontWeight: 800, display: "flex", alignItems: "center", gap: 1 }}
      >
        <CalendarTodayIcon sx={{ fontSize: 20 }} />
        {initialDate ? "Reschedule Content" : "Schedule Content"}
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <TextField
            label="Date"
            type="date"
            value={dateISO}
            onChange={(e) => setDateISO(e.target.value)}
            fullWidth
            slotProps={{ htmlInput: { min: toDateISO(new Date()) } }}
          />
          <TextField
            label="Time"
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value || "12:00")}
            fullWidth
            slotProps={{ htmlInput: { step: 300 } }}
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onCancel} sx={{ textTransform: "none" }}>
          Cancel
        </Button>
        <Button
          onClick={handleConfirm}
          variant="contained"
          disabled={!dateISO}
          sx={{ textTransform: "none", borderRadius: 999 }}
        >
          Schedule
        </Button>
      </DialogActions>
    </Dialog>
  );
}
