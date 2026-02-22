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

const isValidEmail = (value: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((value || "").trim());

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

  return response.ok;
};

export const sendWorkerNewAppointmentEmail = async (input: WorkerAppointmentEmailInput) => {
  const to = (input.to || "").trim().toLowerCase();
  if (!isValidEmail(to)) {
    return false;
  }

  const from = env.emailFrom();
  if (!from || !isValidEmail(from)) {
    return false;
  }

  const provider = env.emailProvider().toLowerCase();
  if (provider !== "resend") {
    return false;
  }

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

  try {
    return await sendViaResend({
      from,
      to,
      subject,
      html,
      text,
    });
  } catch {
    return false;
  }
};
