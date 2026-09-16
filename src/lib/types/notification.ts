/** PRD Section 32 — Notifications (weather / traffic / schedule / opportunity). */
export type NotificationCategory = "weather" | "traffic" | "schedule" | "opportunity" | "system";

export interface Notification {
  id: string;
  userId: string;
  tripId: string | null;
  category: NotificationCategory;
  title: string;
  body: string;
  createdAt: string;
  readAt: string | null;
}

/**
 * PRD Section 34 — Recommendation Entity / "Every important AI recommendation
 * should explain its reasoning."
 */
export interface Recommendation {
  id: string;
  tripId: string;
  activityId: string | null;
  title: string;
  reasons: string[];
  impactSummary: string | null;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
}
