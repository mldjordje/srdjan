"use client";

import { useEffect, useState } from "react";

import AdminShell from "@/components/admin/AdminShell";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "";
const adminKey = process.env.NEXT_PUBLIC_ADMIN_KEY || "";

type Notification = {
  id: string;
  type: string;
  message: string;
  relatedBookingId?: string | number | null;
  createdAt?: string;
  readAt?: string | null;
};

type StatusState = {
  type: "idle" | "loading" | "success" | "error";
  message?: string;
};

export default function AdminNotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [status, setStatus] = useState<StatusState>({ type: "idle" });

  const fetchNotifications = async () => {
    if (!apiBaseUrl) {
      setStatus({
        type: "error",
        message: "API nije podesen. Dodaj NEXT_PUBLIC_API_BASE_URL u .env.",
      });
      return;
    }

    if (!adminKey) {
      setStatus({
        type: "error",
        message: "Dodaj NEXT_PUBLIC_ADMIN_KEY u .env da bi CMS radio.",
      });
      return;
    }

    setStatus({ type: "loading" });

    try {
      const response = await fetch(
        `${apiBaseUrl}/notifications.php?limit=100&includeUnreadCount=1`,
        {
          headers: {
            "X-Admin-Key": adminKey,
          },
        }
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || "Ne mogu da preuzmem notifikacije.");
      }

      const items = Array.isArray(data.notifications) ? data.notifications : [];
      setNotifications(items);
      setStatus({ type: "success", message: "Notifikacije su osvezene." });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Doslo je do greske.";
      setStatus({ type: "error", message });
    }
  };

  const markAllRead = async () => {
    if (!apiBaseUrl || !adminKey) {
      return;
    }

    setStatus({ type: "loading" });

    try {
      const response = await fetch(`${apiBaseUrl}/notifications.php`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Key": adminKey,
        },
        body: JSON.stringify({ adminAction: "mark_all_read" }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || "Ne mogu da oznacim procitano.");
      }

      setNotifications((prev) =>
        prev.map((item) => ({
          ...item,
          readAt: item.readAt ?? new Date().toISOString(),
        }))
      );
      setStatus({ type: "success", message: "Sve notifikacije su procitane." });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Doslo je do greske.";
      setStatus({ type: "error", message });
    }
  };

  const markRead = async (id: string) => {
    if (!apiBaseUrl || !adminKey) {
      return;
    }

    try {
      const response = await fetch(`${apiBaseUrl}/notifications.php`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Key": adminKey,
        },
        body: JSON.stringify({ adminAction: "mark_read", id }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || "Ne mogu da oznacim procitano.");
      }

      setNotifications((prev) =>
        prev.map((item) => (item.id === id ? { ...item, readAt: new Date().toISOString() } : item))
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Doslo je do greske.";
      setStatus({ type: "error", message });
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const unreadCount = notifications.filter((item) => !item.readAt).length;

  return (
    <AdminShell
      title="Notifikacije"
      subtitle={`Ukupno: ${notifications.length} | Neprocitano: ${unreadCount}`}
    >
      <div className="admin-grid">
        <div className="admin-toolbar">
          <button className="button" type="button" onClick={fetchNotifications}>
            Osvezi listu
          </button>
          <button className="button outline" type="button" onClick={markAllRead}>
            Oznaci sve kao procitano
          </button>
          {status.type !== "idle" && status.message && (
            <div className={`form-status ${status.type}`}>{status.message}</div>
          )}
        </div>

        {notifications.length === 0 && status.type !== "loading" && (
          <div className="admin-card">Nema novih notifikacija.</div>
        )}

        {notifications.map((item) => (
          <div
            key={item.id}
            className={`admin-card notification-card${item.readAt ? "" : " unread"}`}
          >
            <strong>{item.type}</strong>
            <span>{item.message}</span>
            {item.createdAt && <span>Kreirano: {item.createdAt}</span>}
            {item.relatedBookingId && (
              <span>Termin ID: {item.relatedBookingId}</span>
            )}
            <div className="admin-actions">
              {!item.readAt && (
                <button
                  className="button outline"
                  type="button"
                  onClick={() => markRead(String(item.id))}
                >
                  Oznaci procitano
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </AdminShell>
  );
}
