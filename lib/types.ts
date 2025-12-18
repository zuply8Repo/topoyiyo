export type ContentStatus = "pending" | "approved" | "rejected";

export type ContentItem = {
  id: string;
  imageUrl: string;
  caption: string;
  status: ContentStatus;
  regenerationRequested?: boolean;
  createdAt: number;
  updatedAt: number;
};

export type Session = {
  signedIn: boolean;
  name?: string;
  email?: string;
};

export type ScheduleAssignment = {
  itemId: string;
  dateISO: string; // YYYY-MM-DD
  time: string; // HH:mm
  /**
   * Optional manual ordering within a day. Lower renders first.
   * Used for drag/drop reordering without changing the scheduled time.
   */
  order?: number;
};
