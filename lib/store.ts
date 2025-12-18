import type {
  ContentItem,
  ContentStatus,
  ScheduleAssignment,
} from "@/lib/types";

// Helper to get user-scoped localStorage keys
function getUserKey(userId: string | undefined, resource: string): string {
  if (!userId) return `cb_guest_${resource}_v1`;
  return `${userId}_cb_${resource}_v1`;
}

function isBrowser() {
  return (
    typeof window !== "undefined" && typeof window.localStorage !== "undefined"
  );
}

function safeParseJSON<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function now() {
  return Date.now();
}

function seedItems(): ContentItem[] {
  const base = now();
  const seeds = [
    {
      id: "cb_001",
      caption:
        "New week, new momentum. What’s one thing you’re building that you’re proud of?",
    },
    {
      id: "cb_002",
      caption: "Three tiny habits that quietly compound over 30 days.",
    },
    {
      id: "cb_003",
      caption:
        "Before you optimize: make it work, make it right, make it fast. Which phase are you in?",
    },
    {
      id: "cb_004",
      caption: "A simple template to write posts that people actually save.",
    },
    {
      id: "cb_005",
      caption:
        "Behind the scenes: the messy middle is where the magic happens. Keep going.",
    },
    {
      id: "cb_006",
      caption: "If you had 60 seconds to teach one lesson, what would it be?",
    },
  ];
  return seeds.map((s, idx) => ({
    id: s.id,
    imageUrl: `https://picsum.photos/seed/${encodeURIComponent(s.id)}/800/800`,
    caption: s.caption,
    status: "pending" as const,
    createdAt: base - (idx + 1) * 60_000,
    updatedAt: base - (idx + 1) * 60_000,
  }));
}

export function getSpecPrompt(userId?: string): string | null {
  if (!isBrowser()) return null;
  const key = getUserKey(userId, "spec_prompt");
  return localStorage.getItem(key);
}

export function saveSpecPrompt(prompt: string, userId?: string) {
  if (!isBrowser()) return;
  const key = getUserKey(userId, "spec_prompt");
  localStorage.setItem(key, prompt);
  // Ensure demo items exist for review step.
  ensureSeededItems(userId);
}

export function ensureSeededItems(userId?: string) {
  if (!isBrowser()) return;
  const key = getUserKey(userId, "items");
  const existing = safeParseJSON<ContentItem[]>(localStorage.getItem(key));
  if (existing && Array.isArray(existing) && existing.length > 0) return;
  localStorage.setItem(key, JSON.stringify(seedItems()));
}

export function getAllItems(userId?: string): ContentItem[] {
  if (!isBrowser()) return [];
  ensureSeededItems(userId);
  const key = getUserKey(userId, "items");
  const parsed = safeParseJSON<ContentItem[]>(localStorage.getItem(key));
  if (!parsed || !Array.isArray(parsed)) return [];
  return parsed;
}

function saveAllItems(items: ContentItem[], userId?: string) {
  if (!isBrowser()) return;
  const key = getUserKey(userId, "items");
  localStorage.setItem(key, JSON.stringify(items));
}

export function getPendingItems(userId?: string): ContentItem[] {
  return getAllItems(userId).filter((i) => i.status === "pending");
}

export function getApprovedItems(userId?: string): ContentItem[] {
  return getAllItems(userId).filter((i) => i.status === "approved");
}

export function updateItemStatus(
  id: string,
  status: ContentStatus,
  opts?: { regenerationRequested?: boolean; userId?: string }
) {
  const items = getAllItems(opts?.userId);
  const next = items.map((i) => {
    if (i.id !== id) return i;
    return {
      ...i,
      status,
      regenerationRequested:
        status === "rejected"
          ? opts?.regenerationRequested ?? true
          : i.regenerationRequested,
      updatedAt: now(),
    };
  });
  saveAllItems(next, opts?.userId);
}

export function updateItemCaption(id: string, caption: string, userId?: string) {
  const items = getAllItems(userId);
  const next = items.map((i) =>
    i.id === id ? { ...i, caption, updatedAt: now() } : i
  );
  saveAllItems(next, userId);
}

export function getSchedule(userId?: string): ScheduleAssignment[] {
  if (!isBrowser()) return [];
  const key = getUserKey(userId, "schedule");
  const parsed = safeParseJSON<ScheduleAssignment[]>(
    localStorage.getItem(key)
  );
  if (!parsed || !Array.isArray(parsed)) return [];
  return parsed;
}

function saveSchedule(assignments: ScheduleAssignment[], userId?: string) {
  if (!isBrowser()) return;
  const key = getUserKey(userId, "schedule");
  localStorage.setItem(key, JSON.stringify(assignments));
}

export function upsertSchedule(itemId: string, dateISO: string, time: string, userId?: string) {
  const current = getSchedule(userId);
  const existing = current.find((a) => a.itemId === itemId);

  // Auto-append to the end of the day's list when (re)scheduling, unless the item already had an order.
  const nextOrder =
    existing?.order ??
    (() => {
      const orders = current
        .filter((a) => a.dateISO === dateISO)
        .map((a) => a.order)
        .filter((o): o is number => typeof o === "number");
      const max = orders.length ? Math.max(...orders) : -1;
      return max + 1;
    })();

  const next = current.some((a) => a.itemId === itemId)
    ? current.map((a) =>
        a.itemId === itemId ? { itemId, dateISO, time, order: nextOrder } : a
      )
    : [...current, { itemId, dateISO, time, order: nextOrder }];
  saveSchedule(next, userId);
}

export function removeSchedule(itemId: string, userId?: string) {
  const current = getSchedule(userId);
  saveSchedule(current.filter((a) => a.itemId !== itemId), userId);
}

export function setScheduleOrderForDate(
  dateISO: string,
  orderedItemIds: string[],
  userId?: string
) {
  const current = getSchedule(userId);
  const orderById = new Map<string, number>();
  orderedItemIds.forEach((id, idx) => orderById.set(id, idx));

  const next = current.map((a) => {
    if (a.dateISO !== dateISO) return a;
    const order = orderById.get(a.itemId);
    if (typeof order !== "number") return a;
    return { ...a, order };
  });

  saveSchedule(next, userId);
}

export function resetAllDemoData(userId?: string) {
  if (!isBrowser()) return;
  const promptKey = getUserKey(userId, "spec_prompt");
  const itemsKey = getUserKey(userId, "items");
  const scheduleKey = getUserKey(userId, "schedule");
  localStorage.removeItem(promptKey);
  localStorage.setItem(itemsKey, JSON.stringify(seedItems()));
  localStorage.removeItem(scheduleKey);
}
