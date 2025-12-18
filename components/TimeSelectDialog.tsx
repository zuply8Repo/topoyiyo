"use client";

import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
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

const TIMES = ["09:00", "12:00", "15:00", "18:00"];

export default function TimeSelectDialog({
  open,
  dateISO,
  itemId,
  onCancel,
  onConfirm,
}: TimeSelectDialogProps) {
  const [time, setTime] = React.useState(TIMES[1]);

  React.useEffect(() => {
    setTime(TIMES[1]);
  }, [open]);

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
          <FormControl fullWidth>
            <InputLabel id="time-select-label">Time</InputLabel>
            <Select
              labelId="time-select-label"
              label="Time"
              value={time}
              onChange={(e) => setTime(String(e.target.value))}
            >
              {TIMES.map((t) => (
                <MenuItem key={t} value={t}>
                  {t}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onCancel} sx={{ textTransform: "none" }}>
          Cancel
        </Button>
        <Button
          onClick={() => onConfirm(time)}
          variant="contained"
          sx={{ textTransform: "none", borderRadius: 999 }}
        >
          Schedule
        </Button>
      </DialogActions>
    </Dialog>
  );
}


