"use client";

import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import React from "react";

export type TimeSelectDialogProps = {
  open: boolean;
  dateISO: string | null;
  itemId: string | null;
  onCancel: () => void;
  onConfirm: (time: string) => void;
};

function toHHMM(date: Date): string {
  const h = date.getHours().toString().padStart(2, "0");
  const m = date.getMinutes().toString().padStart(2, "0");
  return `${h}:${m}`;
}

export default function TimeSelectDialog({
  open,
  dateISO,
  itemId,
  onCancel,
  onConfirm,
}: TimeSelectDialogProps) {
  const now = new Date();
  const defaultTime = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
  const [time, setTime] = React.useState(defaultTime);

  React.useEffect(() => {
    const now = new Date();
    setTime(toHHMM(now));
  }, [open]);

  const handleConfirm = () => {
    const [h, m] = time.split(":").map(Number);
    const hour = Math.min(23, Math.max(0, isNaN(h) ? 12 : h));
    const minute = Math.min(59, Math.max(0, isNaN(m) ? 0 : m));
    onConfirm(`${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`);
  };

  return (
    <Dialog
      open={open}
      onClose={onCancel}
      fullWidth
      maxWidth="xs"
      PaperProps={{ sx: { borderRadius: 4, maxWidth: { xs: "92vw", sm: 420 } } }}
    >
      <DialogTitle sx={{ fontWeight: 800 }}>Choose a time</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Scheduling item <b>{itemId ?? ""}</b> on <b>{dateISO ?? ""}</b>.
          </Typography>
          <TextField
            label="Time"
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value || "12:00")}
            slotProps={{
              htmlInput: {
                step: 300,
              },
            }}
            fullWidth
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
          sx={{ textTransform: "none", borderRadius: 999 }}
        >
          Schedule
        </Button>
      </DialogActions>
    </Dialog>
  );
}


