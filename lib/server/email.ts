import { formatIsoDateToEuropean } from "@/lib/date";
import { env } from "@/lib/server/env";

type WorkerAppointmentEmailInput = {
  to: string;
  workerName: string;
  clientName: string;
  serviceName: string;
  date: string;
  startTime: string;
  endTime: string;
  workerId: string;
  appointmentId: string;
  origin: string;
};

type ClientAppointmentStatusEmailInput = {
  to: string;
  clientName: string;
  workerName: string;
  serviceName: string;
  date: string;
  startTime: string;
  endTime: string;
  status: "confirmed" | "cancelled";
  reason?: string;
  appointmentId: string;
  origin: string;
};

const isValidEmail = (value: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((value || "").trim());

const isValidFromAddress = (value: string) => {
  const trimmed = (value || "").trim();
  if (isValidEmail(trimmed)) return true;
  const match = trimmed.match(/<([^>]+)>/);
  return match ? isValidEmail(match[1]) : false;
};

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const sendViaResend = async ({
  from,
  to,
  subject,
  html,
  text,
}: {
  from: string;
  to: string;
  subject: string;
  html: string;
  text: string;
}) => {
  const apiKey = env.resendApiKey();
  if (!apiKey) {
    console.warn("[email] Staff notification skipped: RESEND_API_KEY is not set.");
    return false;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject,
      html,
      text,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    console.error("[email] Resend API error:", response.status, body);
    return false;
  }
  return true;
};

const sendEmail = async ({
  to,
  subject,
  html,
  text,
}: {
  to: string;
  subject: string;
  html: string;
  text: string;
}) => {
  const normalizedTo = (to || "").trim().toLowerCase();
  if (!isValidEmail(normalizedTo)) {
    console.warn("[email] Staff notification skipped: invalid 'to' address.");
    return false;
  }

  const from = env.emailFrom();
  if (!from || !isValidFromAddress(from)) {
    console.warn("[email] Staff notification skipped: EMAIL_FROM (or RESEND_FROM) is not set or invalid. Current value:", from || "(empty)");
    return false;
  }

  const provider = env.emailProvider().toLowerCase();
  if (provider !== "resend") {
    console.warn("[email] Staff notification skipped: EMAIL_PROVIDER is not 'resend'.");
    return false;
  }

  try {
    return await sendViaResend({
      from,
      to: normalizedTo,
      subject,
      html,
      text,
    });
  } catch {
    return false;
  }
};

export const sendWorkerNewAppointmentEmail = async (input: WorkerAppointmentEmailInput) => {
  const baseUrl = env.appPublicUrl() || input.origin;
  const adminUrl = `${baseUrl.replace(/\/+$/, "")}/admin/calendar?workerId=${encodeURIComponent(
    input.workerId
  )}`;
  const europeanDate = formatIsoDateToEuropean(input.date);
  const subject = `Novi termin ceka potvrdu - ${europeanDate} ${input.startTime}`;

  const safeWorkerName = escapeHtml(input.workerName || "Radnik");
  const safeClientName = escapeHtml(input.clientName || "Klijent");
  const safeServiceName = escapeHtml(input.serviceName || "Usluga");
  const safeDate = escapeHtml(europeanDate);
  const safeStart = escapeHtml(input.startTime);
  const safeEnd = escapeHtml(input.endTime);
  const safeAdminUrl = escapeHtml(adminUrl);

  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.5;color:#1f2937;">
      <h2 style="margin:0 0 12px;">Novi termin ceka potvrdu</h2>
      <p style="margin:0 0 12px;">Zdravo ${safeWorkerName}, stigao je novi online zahtev za termin.</p>
      <ul style="margin:0 0 16px;padding-left:18px;">
        <li><strong>Klijent:</strong> ${safeClientName}</li>
        <li><strong>Usluga:</strong> ${safeServiceName}</li>
        <li><strong>Datum:</strong> ${safeDate}</li>
        <li><strong>Vreme:</strong> ${safeStart} - ${safeEnd}</li>
        <li><strong>ID termina:</strong> ${escapeHtml(input.appointmentId)}</li>
      </ul>
      <p style="margin:0 0 8px;">
        Udji u admin i potvrdi termin:
      </p>
      <p style="margin:0;">
        <a href="${safeAdminUrl}">${safeAdminUrl}</a>
      </p>
    </div>
  `.trim();

  const text = [
    "Novi termin ceka potvrdu.",
    `Klijent: ${input.clientName || "Klijent"}`,
    `Usluga: ${input.serviceName || "Usluga"}`,
    `Datum: ${europeanDate}`,
    `Vreme: ${input.startTime} - ${input.endTime}`,
    `ID termina: ${input.appointmentId}`,
    `Admin: ${adminUrl}`,
  ].join("\n");

  return sendEmail({
    to: input.to,
    subject,
    html,
    text,
  });
};

export const sendClientAppointmentStatusEmail = async (
  input: ClientAppointmentStatusEmailInput
) => {
  const europeanDate = formatIsoDateToEuropean(input.date);
  const isConfirmed = input.status === "confirmed";
  const statusLabel = isConfirmed ? "potvrdjen" : "otkazan";
  const subject = isConfirmed
    ? `Termin je potvrdjen - ${europeanDate} ${input.startTime}`
    : `Termin je otkazan - ${europeanDate} ${input.startTime}`;

  const safeClientName = escapeHtml(input.clientName || "Klijent");
  const safeWorkerName = escapeHtml(input.workerName || "Radnik");
  const safeServiceName = escapeHtml(input.serviceName || "Usluga");
  const safeDate = escapeHtml(europeanDate);
  const safeStart = escapeHtml(input.startTime);
  const safeEnd = escapeHtml(input.endTime);
  const safeReason = escapeHtml((input.reason || "").trim());
  const safeStatusLabel = escapeHtml(statusLabel);
  const reasonRow = safeReason
    ? `<li><strong>Razlog:</strong> ${safeReason}</li>`
    : "";

  const baseUrl = env.appPublicUrl() || input.origin;
  const myAppointmentsUrl = `${baseUrl.replace(/\/+$/, "")}/moji-termini`;
  const safeMyAppointmentsUrl = escapeHtml(myAppointmentsUrl);

  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.5;color:#1f2937;">
      <h2 style="margin:0 0 12px;">Status termina je azuriran</h2>
      <p style="margin:0 0 12px;">Zdravo ${safeClientName}, tvoj termin je <strong>${safeStatusLabel}</strong>.</p>
      <ul style="margin:0 0 16px;padding-left:18px;">
        <li><strong>Radnik:</strong> ${safeWorkerName}</li>
        <li><strong>Usluga:</strong> ${safeServiceName}</li>
        <li><strong>Datum:</strong> ${safeDate}</li>
        <li><strong>Vreme:</strong> ${safeStart} - ${safeEnd}</li>
        <li><strong>ID termina:</strong> ${escapeHtml(input.appointmentId)}</li>
        ${reasonRow}
      </ul>
      <p style="margin:0;">
        Moji termini:
        <a href="${safeMyAppointmentsUrl}">${safeMyAppointmentsUrl}</a>
      </p>
    </div>
  `.trim();

  const lines = [
    `Tvoj termin je ${statusLabel}.`,
    `Radnik: ${input.workerName || "Radnik"}`,
    `Usluga: ${input.serviceName || "Usluga"}`,
    `Datum: ${europeanDate}`,
    `Vreme: ${input.startTime} - ${input.endTime}`,
    `ID termina: ${input.appointmentId}`,
  ];
  if (input.reason && input.reason.trim()) {
    lines.push(`Razlog: ${input.reason.trim()}`);
  }
  lines.push(`Moji termini: ${myAppointmentsUrl}`);

  return sendEmail({
    to: input.to,
    subject,
    html,
    text: lines.join("\n"),
  });
};
