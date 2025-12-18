"use client";

import TimeSelectDialog from "@/components/TimeSelectDialog";
import {
  getApprovedItems,
  getSchedule,
  removeSchedule,
  setScheduleOrderForDate,
  upsertSchedule,
} from "@/lib/store";
import { getMonthGrid } from "@/lib/monthGrid";
import type { ContentItem, ScheduleAssignment } from "@/lib/types";
import { useSession } from "next-auth/react";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import PublishIcon from "@mui/icons-material/Publish";
import ClearIcon from "@mui/icons-material/Clear";
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  IconButton,
  Paper,
  Snackbar,
  Stack,
  Typography,
} from "@mui/material";
import React from "react";

function byTime(a: ScheduleAssignment, b: ScheduleAssignment) {
  const ao = a.order ?? 0;
  const bo = b.order ?? 0;
  if (ao !== bo) return ao - bo;
  return a.time.localeCompare(b.time);
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const userId = session?.user?.id;

  const [approved, setApproved] = React.useState<ContentItem[]>([]);
  const [schedule, setSchedule] = React.useState<ScheduleAssignment[]>([]);
  const [toast, setToast] = React.useState<string | null>(null);

  const today = React.useMemo(() => new Date(), []);
  const [year, setYear] = React.useState(today.getFullYear());
  const [month, setMonth] = React.useState(today.getMonth());

  const [dropTarget, setDropTarget] = React.useState<{
    itemId: string;
    dateISO: string;
  } | null>(null);

  const [dragging, setDragging] = React.useState<{
    itemId: string;
    source: "approved" | "scheduled";
  } | null>(null);
  const [hoverDateISO, setHoverDateISO] = React.useState<string | null>(null);

  const refresh = React.useCallback(() => {
    setApproved(getApprovedItems(userId));
    setSchedule(getSchedule(userId));
  }, [userId]);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  const itemsById = React.useMemo(() => {
    const m = new Map<string, ContentItem>();
    for (const i of approved) m.set(i.id, i);
    return m;
  }, [approved]);

  const assignmentByItemId = React.useMemo(() => {
    const m = new Map<string, ScheduleAssignment>();
    for (const a of schedule) m.set(a.itemId, a);
    return m;
  }, [schedule]);

  const assignmentsByDate = React.useMemo(() => {
    const m = new Map<string, ScheduleAssignment[]>();
    for (const a of schedule) {
      const list = m.get(a.dateISO) ?? [];
      list.push(a);
      m.set(a.dateISO, list);
    }
    for (const [k, v] of m) m.set(k, v.sort(byTime));
    return m;
  }, [schedule]);

  const monthCells = React.useMemo(
    () => getMonthGrid(year, month),
    [year, month]
  );
  const monthLabel = React.useMemo(() => {
    const d = new Date(year, month, 1);
    return d.toLocaleString(undefined, { month: "long", year: "numeric" });
  }, [year, month]);

  const getDropContextFromPoint = React.useCallback((x: number, y: number) => {
    const el = document.elementFromPoint(x, y) as HTMLElement | null;
    if (!el) return null;

    const dayEl = el.closest?.("[data-cb-day]") as HTMLElement | null;
    const dateISO = dayEl?.dataset.dateiso ?? null;
    if (!dateISO) return null;

    const scheduledEl = el.closest?.(
      "[data-cb-scheduled]"
    ) as HTMLElement | null;
    const targetItemId = scheduledEl?.dataset.itemid ?? null;

    return { dateISO, targetItemId };
  }, []);

  const onPointerDownDrag =
    (itemId: string, source: "approved" | "scheduled") =>
    (e: React.PointerEvent) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      // Prevent page scrolling while dragging on touch.
      e.preventDefault();
      setDragging({ itemId, source });
      setHoverDateISO(null);
      (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    };

  const onPointerMoveDrag = (e: React.PointerEvent) => {
    if (!dragging) return;
    const ctx = getDropContextFromPoint(e.clientX, e.clientY);
    setHoverDateISO(ctx?.dateISO ?? null);
  };

  const onPointerUpDrag = (e: React.PointerEvent) => {
    if (!dragging) return;
    const ctx = getDropContextFromPoint(e.clientX, e.clientY);
    const dropDateISO = ctx?.dateISO ?? null;
    const targetItemId = ctx?.targetItemId ?? null;

    const draggingItemId = dragging.itemId;
    const fromAssignment = assignmentByItemId.get(draggingItemId);
    const fromDateISO = fromAssignment?.dateISO ?? null;

    // Reorder within the same day (no time dialog).
    if (dropDateISO && fromDateISO && dropDateISO === fromDateISO) {
      const currentIds = (assignmentsByDate.get(dropDateISO) ?? []).map(
        (a) => a.itemId
      );
      const nextIds = currentIds.filter((id) => id !== draggingItemId);
      const idx = targetItemId ? nextIds.indexOf(targetItemId) : -1;
      if (idx >= 0) nextIds.splice(idx, 0, draggingItemId);
      else nextIds.push(draggingItemId);
      setScheduleOrderForDate(dropDateISO, nextIds, userId);
      refresh();
      setToast("Reordered (stub).");
      setDragging(null);
      setHoverDateISO(null);
      return;
    }

    // Schedule / move to another day (time selection).
    if (dropDateISO) {
      setDropTarget({ itemId: draggingItemId, dateISO: dropDateISO });
    }

    setDragging(null);
    setHoverDateISO(null);
  };

  return (
    <Stack spacing={2.5}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1.5}
        alignItems={{ sm: "center" }}
      >
        <Stack spacing={0.25} sx={{ flex: 1 }}>
          <Typography variant="h5" sx={{ fontWeight: 900 }}>
            Dashboard
          </Typography>
          <Typography color="text.secondary">
            Drag approved items onto the calendar to schedule by day/time (UI
            stub).
          </Typography>
        </Stack>
        <Button
          startIcon={<PublishIcon />}
          variant="contained"
          onClick={() =>
            setToast("Schedule stub: this will publish to IG later.")
          }
          sx={{ textTransform: "none", borderRadius: 999, fontWeight: 800 }}
        >
          Schedule
        </Button>
      </Stack>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "360px 1fr" },
          gap: 2,
          alignItems: "start",
        }}
      >
        {/* Left: approved list */}
        <Paper
          variant="outlined"
          sx={{ borderRadius: 4, borderColor: "divider", overflow: "hidden" }}
        >
          <Box sx={{ p: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 900 }}>
              Approved items
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Drag to schedule. Items remain approved even if already scheduled.
            </Typography>
          </Box>
          <Divider />
          <Stack spacing={1} sx={{ p: 2 }}>
            {approved.length === 0 ? (
              <Typography color="text.secondary">
                Nothing approved yet — approve items in <b>Review</b>.
              </Typography>
            ) : (
              approved.map((it) => {
                const assignment = assignmentByItemId.get(it.id);
                return (
                  <Paper
                    key={it.id}
                    variant="outlined"
                    onPointerDown={onPointerDownDrag(it.id, "approved")}
                    onPointerMove={onPointerMoveDrag}
                    onPointerUp={onPointerUpDrag}
                    sx={{
                      borderRadius: 3,
                      borderColor: "divider",
                      p: 1.25,
                      cursor: "grab",
                      touchAction: "none",
                      opacity: dragging?.itemId === it.id ? 0.65 : 1,
                      "&:active": { cursor: "grabbing" },
                    }}
                  >
                    <Stack direction="row" spacing={1.25} alignItems="center">
                      <Box
                        component="img"
                        src={it.imageUrl}
                        alt="Approved"
                        sx={{
                          width: 44,
                          height: 44,
                          borderRadius: 2,
                          objectFit: "cover",
                          flex: "0 0 auto",
                        }}
                      />
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography
                          variant="body2"
                          sx={{ fontWeight: 800 }}
                          noWrap
                        >
                          {it.id}
                        </Typography>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          noWrap
                        >
                          {it.caption}
                        </Typography>
                      </Box>
                      {assignment ? (
                        <Chip
                          size="small"
                          icon={<CalendarMonthIcon />}
                          label={`${assignment.dateISO} @ ${assignment.time}`}
                          sx={{ fontWeight: 700 }}
                        />
                      ) : (
                        <Chip
                          size="small"
                          label="Unscheduled"
                          variant="outlined"
                        />
                      )}
                    </Stack>
                  </Paper>
                );
              })
            )}
          </Stack>
        </Paper>

        {/* Right: calendar */}
        <Paper
          variant="outlined"
          sx={{ borderRadius: 4, borderColor: "divider", p: 2 }}
        >
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1.25}
            alignItems={{ sm: "center" }}
          >
            <Typography variant="subtitle1" sx={{ fontWeight: 900, flex: 1 }}>
              {monthLabel}
            </Typography>
            <Stack direction="row" spacing={1}>
              <Button
                variant="outlined"
                size="small"
                onClick={() => {
                  const d = new Date(year, month - 1, 1);
                  setYear(d.getFullYear());
                  setMonth(d.getMonth());
                }}
                sx={{ textTransform: "none", borderRadius: 999 }}
              >
                Prev
              </Button>
              <Button
                variant="outlined"
                size="small"
                onClick={() => {
                  const d = new Date(year, month + 1, 1);
                  setYear(d.getFullYear());
                  setMonth(d.getMonth());
                }}
                sx={{ textTransform: "none", borderRadius: 999 }}
              >
                Next
              </Button>
            </Stack>
          </Stack>

          <Box
            sx={{
              mt: 2,
              display: "grid",
              // minmax(0, 1fr) is critical for equal-width columns when children have long content.
              gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
              gap: 1,
            }}
          >
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <Box key={d} sx={{ px: 1, py: 0.5, minWidth: 0 }}>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ fontWeight: 800 }}
                >
                  {d}
                </Typography>
              </Box>
            ))}

            {monthCells.map((c) => {
              const dayAssignments = assignmentsByDate.get(c.dateISO) ?? [];
              return (
                <Paper
                  key={c.dateISO}
                  variant="outlined"
                  data-cb-day
                  data-dateiso={c.dateISO}
                  sx={{
                    minHeight: 128,
                    borderRadius: 3,
                    borderColor: "divider",
                    p: 1,
                    minWidth: 0,
                    overflow: "hidden",
                    opacity: c.inMonth ? 1 : 0.55,
                    bgcolor: c.inMonth ? "background.paper" : "grey.50",
                    outline: "2px solid",
                    outlineColor:
                      dragging && hoverDateISO === c.dateISO
                        ? "primary.main"
                        : "transparent",
                  }}
                >
                  <Stack spacing={0.75}>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ fontWeight: 900 }}
                    >
                      {c.date.getDate()}
                    </Typography>
                    <Stack
                      spacing={0.5}
                      sx={{
                        minWidth: 0,
                        // Scroll inside the day cell when multiple items are scheduled.
                        maxHeight: { xs: 78, sm: 90 },
                        overflowY:
                          dayAssignments.length > 2 ? "auto" : "visible",
                        overflowX: "hidden",
                        pr: dayAssignments.length > 2 ? 0.25 : 0,
                      }}
                    >
                      {dayAssignments.map((a) => {
                        const item = itemsById.get(a.itemId);
                        const title = item?.caption ?? a.itemId;
                        const thumb =
                          item?.imageUrl ??
                          "https://picsum.photos/seed/contentbeaver/200/200";

                        return (
                          <Box
                            key={a.itemId}
                            data-cb-scheduled
                            data-itemid={a.itemId}
                            onPointerDown={onPointerDownDrag(
                              a.itemId,
                              "scheduled"
                            )}
                            onPointerMove={onPointerMoveDrag}
                            onPointerUp={onPointerUpDrag}
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 0.75,
                              border: "1px solid",
                              borderColor: "divider",
                              borderRadius: 2,
                              px: 0.75,
                              py: 0.5,
                              minWidth: 0,
                              bgcolor: "background.paper",
                              cursor: "grab",
                              touchAction: "none",
                              opacity: dragging?.itemId === a.itemId ? 0.65 : 1,
                              "&:active": { cursor: "grabbing" },
                            }}
                          >
                            <Box
                              component="img"
                              src={thumb}
                              alt="Scheduled"
                              sx={{
                                width: 22,
                                height: 22,
                                borderRadius: 1,
                                objectFit: "cover",
                                flex: "0 0 auto",
                              }}
                            />
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                              <Typography
                                variant="caption"
                                sx={{ fontWeight: 900, lineHeight: 1.2 }}
                                noWrap
                              >
                                {a.time}
                              </Typography>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                                sx={{ lineHeight: 1.2 }}
                                noWrap
                              >
                                {title}
                              </Typography>
                            </Box>
                            <IconButton
                              size="small"
                              aria-label="Remove schedule"
                              onClick={(ev) => {
                                ev.stopPropagation();
                                removeSchedule(a.itemId, userId);
                                refresh();
                              }}
                              sx={{ flex: "0 0 auto" }}
                            >
                              <ClearIcon fontSize="small" />
                            </IconButton>
                          </Box>
                        );
                      })}
                    </Stack>
                  </Stack>
                </Paper>
              );
            })}
          </Box>
        </Paper>
      </Box>

      <TimeSelectDialog
        open={Boolean(dropTarget)}
        dateISO={dropTarget?.dateISO ?? null}
        itemId={dropTarget?.itemId ?? null}
        onCancel={() => setDropTarget(null)}
        onConfirm={(time) => {
          if (!dropTarget) return;
          upsertSchedule(dropTarget.itemId, dropTarget.dateISO, time, userId);
          setDropTarget(null);
          refresh();
          setToast("Scheduled (stub).");
        }}
      />

      {toast ? (
        <Snackbar
          open
          autoHideDuration={2600}
          onClose={() => setToast(null)}
          anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        >
          <Alert
            onClose={() => setToast(null)}
            severity="info"
            sx={{ width: "100%" }}
          >
            {toast}
          </Alert>
        </Snackbar>
      ) : null}
    </Stack>
  );
}
