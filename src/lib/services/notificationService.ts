import { NotImplementedError } from "@/lib/errors";
import type { Notification } from "@/lib/types";

/** Notification Service (PRD Section 42 + Section 32 "Notifications"). */
export const notificationService = {
  async send(_notification: Omit<Notification, "id" | "createdAt" | "readAt">): Promise<Notification> {
    throw new NotImplementedError("notificationService.send");
  },

  async listForUser(_userId: string): Promise<Notification[]> {
    throw new NotImplementedError("notificationService.listForUser");
  },
};
