"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent, type TouchEvent } from "react";
import Link from "next/link";
import { Button } from "@heroui/react";

import { fetchServices, getActiveServices, services as fallbackServices, type Service } from "@/lib/services";
import { siteConfig } from "@/lib/site";
import type { Language } from "@/lib/useLanguage";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "";
const BOOKING_DAYS_AHEAD = siteConfig.schedule.bookingDaysAhead ?? 14;
const WORKING_DAYS = siteConfig.schedule.workingDays ?? [1, 2, 3, 4, 5];
const WORKING_DAY_ORDER = [...WORKING_DAYS].sort((a, b) => a - b);
const getWorkdayColumn = (day: number) => WORKING_DAY_ORDER.indexOf(day);

type StatusState = {
  type: "idle" | "sending" | "success" | "error";
  message?: string;
};

type AvailabilityState = {
  type: "idle" | "loading" | "error";
  message?: string;
};

type BookingSettings = {
  minBookingLeadMinutes: number;
  minCancelLeadMinutes: number;
};

type ClientProfile = {
  name: string;
  phone: string;
  email: string;
  token: string;
};

type Appointment = {
  id: string;
  serviceName: string;
  price?: number;
  date: string;
  time: string;
  status?: string;
};

type CalendarBooking = {
  serviceName: string;
  date: string;
  time: string;
  durationMinutes: number;
  note: string;
};

type AvailabilityItem = {
  time: string;
  duration?: string | number;
};

type CalendarDay = {
  value: string | null;
  label: string;
  inMonth: boolean;
  inRange: boolean;
};

const formatDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const languageToLocale: Record<Language, string> = {
  sr: "sr-RS",
  en: "en-US",
  it: "it-IT",
};

const formatLongDate = (value: string, locale: string) => {
  const date = new Date(`${value}T00:00:00`);
  return new Intl.DateTimeFormat(locale, {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
};

const formatMonthLabel = (date: Date, locale: string) =>
  new Intl.DateTimeFormat(locale, {
    month: "long",
    year: "numeric",
  }).format(date);

const formatWeekday = (date: Date, locale: string) =>
  new Intl.DateTimeFormat(locale, {
    weekday: "short",
  }).format(date);

const formatSlotLabel = (time: string, locale: string) => {
  const [hours, minutes] = time.split(":").map((part) => Number(part));
  const date = new Date(2024, 0, 1, hours, minutes);
  return new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
};

const timeToMinutes = (time: string) => {
  const [hours, minutes] = time.split(":").map((part) => Number(part));
  return hours * 60 + minutes;
};

const minutesToTime = (minutes: number) => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
};

const parseDurationMinutes = (duration?: string | number) => {
  if (typeof duration === "number") {
    return duration;
  }

  if (!duration) {
    return 0;
  }

  const value = duration.toLowerCase();
  if (value.includes("h")) {
    const number = Number(value.replace(/[^\d.]/g, ""));
    return Number.isFinite(number) ? Math.round(number * 60) : 0;
  }

  const number = Number(value.replace(/[^\d]/g, ""));
  return Number.isFinite(number) ? number : 0;
};

type BreakWindow = {
  start: string;
  end: string;
};

const normalizeServiceLabel = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const getServicePriority = (service: Service) => {
  const id = service.id.toLowerCase();
  const name = normalizeServiceLabel(service.name || "");

  if (id === "sisanje" || name.startsWith("sisanje")) {
    return 0;
  }

  if (id === "fade" || name.startsWith("fade")) {
    return 1;
  }

  return 2;
};

const orderServices = (items: Service[]) =>
  [...items].sort((a, b) => {
    const priorityDiff = getServicePriority(a) - getServicePriority(b);
    if (priorityDiff !== 0) {
      return priorityDiff;
    }
    return a.name.localeCompare(b.name, "sr");
  });

const buildBreakWindows = (breaks: BreakWindow[] = []) =>
  breaks
    .map((window) => ({
      start: timeToMinutes(window.start),
      end: timeToMinutes(window.end),
    }))
    .filter((window) => window.end > window.start);

const isBreakOverlap = (start: number, end: number, breaks: { start: number; end: number }[]) =>
  breaks.some((window) => start < window.end && end > window.start);

const padIcs = (value: number) => String(value).padStart(2, "0");

const formatIcsLocal = (date: Date) =>
  `${date.getFullYear()}${padIcs(date.getMonth() + 1)}${padIcs(
    date.getDate()
  )}T${padIcs(date.getHours())}${padIcs(date.getMinutes())}${padIcs(
    date.getSeconds()
  )}`;

const formatIcsUtc = (date: Date) =>
  `${date.getUTCFullYear()}${padIcs(date.getUTCMonth() + 1)}${padIcs(
    date.getUTCDate()
  )}T${padIcs(date.getUTCHours())}${padIcs(date.getUTCMinutes())}${padIcs(
    date.getUTCSeconds()
  )}Z`;

const escapeIcsText = (value: string) =>
  value.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");

const buildIcs = (booking: CalendarBooking) => {
  const start = new Date(`${booking.date}T${booking.time}:00`);
  if (Number.isNaN(start.getTime())) {
    return null;
  }

  const durationMinutes = booking.durationMinutes || siteConfig.schedule.slotMinutes;
  const end = new Date(start.getTime() + durationMinutes * 60 * 1000);
  const stamp = formatIcsUtc(new Date());
  const uid = `db-${start.getTime()}-${Math.random().toString(36).slice(2, 10)}`;
  const summary = escapeIcsText(booking.serviceName);
  const descriptionParts = [
    `Usluga: ${booking.serviceName}`,
    booking.note ? `Napomena: ${booking.note}` : "",
    siteConfig.locationNote ? `Lokacija: ${siteConfig.locationNote}` : "",
  ].filter(Boolean);
  const description = escapeIcsText(descriptionParts.join("\n"));
  const location = escapeIcsText(siteConfig.city || siteConfig.locationNote || "");

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//SrdjanSalon//Booking//SR",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${stamp}`,
    `DTSTART;TZID=Europe/Belgrade:${formatIcsLocal(start)}`,
    `DTEND;TZID=Europe/Belgrade:${formatIcsLocal(end)}`,
    `SUMMARY:${summary}`,
    description ? `DESCRIPTION:${description}` : "",
    location ? `LOCATION:${location}` : "",
    "END:VEVENT",
    "END:VCALENDAR",
  ]
    .filter(Boolean)
    .join("\r\n");
};

const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const getWeekStart = (date: Date) => {
  const day = date.getDay();
  const diff = (day + 6) % 7;
  return addDays(date, -diff);
};

const isWorkingDay = (date: Date) => WORKING_DAYS.includes(date.getDay());

const getNextWorkingDay = (date: Date) => {
  let cursor = new Date(date);
  while (!isWorkingDay(cursor)) {
    cursor = addDays(cursor, 1);
  }
  return cursor;
};

const addMonths = (date: Date, months: number) =>
  new Date(date.getFullYear(), date.getMonth() + months, 1);

const buildCalendarDays = (
  monthDate: Date,
  minDate: Date,
  maxDate: Date
): CalendarDay[] => {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days: CalendarDay[] = [];

  let firstWorking = new Date(year, month, 1);
  while (
    firstWorking.getMonth() === month &&
    getWorkdayColumn(firstWorking.getDay()) === -1
  ) {
    firstWorking = addDays(firstWorking, 1);
  }

  const startOffset =
    firstWorking.getMonth() === month ? Math.max(0, getWorkdayColumn(firstWorking.getDay())) : 0;

  for (let i = 0; i < startOffset; i += 1) {
    days.push({ value: null, label: "", inMonth: false, inRange: false });
  }

  for (let dayNumber = 1; dayNumber <= daysInMonth; dayNumber += 1) {
    const date = new Date(year, month, dayNumber);
    if (getWorkdayColumn(date.getDay()) === -1) {
      continue;
    }

    const value = formatDate(date);
    const inRange = isWorkingDay(date) && date >= minDate && date <= maxDate;

    days.push({
      value,
      label: String(dayNumber),
      inMonth: true,
      inRange,
    });
  }

  const totalCells =
    Math.ceil(days.length / WORKING_DAY_ORDER.length) * WORKING_DAY_ORDER.length;
  while (days.length < totalCells) {
    days.push({ value: null, label: "", inMonth: false, inRange: false });
  }

  return days;
};

const buildDateRange = (startDate: Date, endDate: Date) => {
  const dates: string[] = [];
  let cursor = new Date(startDate);

  while (cursor <= endDate) {
    dates.push(formatDate(cursor));
    cursor = addDays(cursor, 1);
  }

  return dates;
};

const buildSlots = (
  date: string,
  durationMinutes: number,
  appointments: AvailabilityItem[],
  blocks: AvailabilityItem[],
  minBookingLeadMinutes = 0,
  vipWindow?: Service["vipWindow"]
) => {
  const dateObj = new Date(`${date}T00:00:00`);
  if (!isWorkingDay(dateObj)) {
    return [];
  }

  const { open, close, slotMinutes, breaks = [] } = siteConfig.schedule;
  const openMinutes = timeToMinutes(open);
  const closeMinutes = timeToMinutes(close);
  const now = new Date();
  const minLeadMinutes = Math.max(0, minBookingLeadMinutes);
  const minAllowedTime = minLeadMinutes > 0 ? now.getTime() + minLeadMinutes * 60000 : now.getTime();
  const isVipWindow = vipWindow === "before" || vipWindow === "after";
  const required = isVipWindow ? 60 : durationMinutes || slotMinutes;
  const breakWindows = buildBreakWindows(breaks);

  const reserved = [...appointments, ...blocks].map((item) => {
    const start = timeToMinutes(item.time);
    const length = parseDurationMinutes(item.duration) || slotMinutes;
    return { start, end: start + length };
  });

  const slots: string[] = [];
  if (isVipWindow) {
    const start =
      vipWindow === "before" ? Math.max(0, openMinutes - 60) : closeMinutes;
    const end = start + required;
    const slotDateTime = new Date(`${date}T${minutesToTime(start)}:00`).getTime();

    if (slotDateTime < minAllowedTime) {
      return slots;
    }

    const overlap = reserved.some((item) => start < item.end && end > item.start);
    if (!overlap) {
      slots.push(minutesToTime(start));
    }
    return slots;
  }

  const stepMinutes = slotMinutes;

  for (let start = openMinutes; start + required <= closeMinutes; start += stepMinutes) {
    const slotDateTime = new Date(`${date}T${minutesToTime(start)}:00`).getTime();
    if (slotDateTime < minAllowedTime) {
      continue;
    }

    const end = start + required;
    if (isBreakOverlap(start, end, breakWindows)) {
      continue;
    }
    const overlap = reserved.some((item) => start < item.end && end > item.start);
    if (!overlap) {
      slots.push(minutesToTime(start));
    }
  }

  return slots;
};

type BookingFormProps = {
  language?: Language;
};

export default function BookingForm({ language = "sr" }: BookingFormProps) {
  const locale = languageToLocale[language];
  const text = {
    sr: {
      loginRequired: "Prijava je obavezna",
      loginRequiredDesc: "Za zakazivanje je potrebna prijava.",
      login: "Prijava",
      register: "Registracija",
      title: "Zakazi termin",
      subtitle: "Izaberi uslugu, datum i vreme.",
      loggedIn: "Ulogovani ste",
      warning: "Upozorenje: imate",
      unpaidAppointments: "neplacenih termina.",
      totalForPayment: "Ukupno za naplatu:",
      serviceStep: "1. Usluga",
      slotStep: "2. Termin",
      nextAppointment: "Vas sledeci termin",
      refresh: "Osvezi",
      loading: "Ucitavanje...",
      noAppointments: "Nema zakazanih termina.",
      chooseService: "Izaberi uslugu",
      serviceHint: "Termini se prilagodjavaju trajanju usluge.",
      selected: "Izabrano",
      choose: "Izaberi",
      continue: "Nastavi",
      chooseDateAndTime: "Izaberi datum i vreme",
      chooseDateHint: "Izaberi datum i vreme koje ti odgovara.",
      pickServiceFirst: "Prvo izaberi uslugu da bi video kalendar.",
      selectedService: "Izabrana usluga",
      duration: "Trajanje",
      price: "Cena",
      vipBeforeShort: "VIP pre radnog vremena",
      vipAfterShort: "VIP posle radnog vremena",
      previous: "Prethodni",
      next: "Sledeci",
      availableOn: "Dostupno",
      noSlots: "Nema dostupnih termina za ovaj dan.",
      note: "Napomena",
      notePlaceholder: "Specijalne zelje, stil, dodatne informacije.",
      addToCalendar: "Ubaci u kalendar",
      back: "Nazad",
      submit: "Potvrdi termin",
      sending: "Slanje...",
      mustLoginToBook: "Morate biti ulogovani da biste zakazali termin.",
      selectServiceBeforeBooking: "Izaberite uslugu pre zakazivanja.",
      apiMissing: "API nije podesen. Dodaj NEXT_PUBLIC_API_BASE_URL u .env.",
      cannotLoadAppointments: "Ne mogu da preuzmem termine.",
      cannotCheckAvailability: "Ne mogu da proverim dostupnost.",
      submitError: "Greska pri slanju termina.",
      bookingConfirmed: "Vas termin je potvrdjen.",
      genericError: "Doslo je do greske.",
      statusLabels: {
        pending: "Na cekanju",
        confirmed: "Potvrdjen",
        completed: "Zavrsen",
        cancelled: "Otkazan",
        no_show: "Nije dosao",
      },
    },
    en: {
      loginRequired: "Login required",
      loginRequiredDesc: "You need to log in before booking.",
      login: "Login",
      register: "Register",
      title: "Book appointment",
      subtitle: "Choose service, date and time.",
      loggedIn: "Logged in as",
      warning: "Warning: you have",
      unpaidAppointments: "unpaid appointments.",
      totalForPayment: "Total due:",
      serviceStep: "1. Service",
      slotStep: "2. Slot",
      nextAppointment: "Your next appointment",
      refresh: "Refresh",
      loading: "Loading...",
      noAppointments: "No appointments booked.",
      chooseService: "Choose service",
      serviceHint: "Available slots adapt to service duration.",
      selected: "Selected",
      choose: "Choose",
      continue: "Continue",
      chooseDateAndTime: "Choose date and time",
      chooseDateHint: "Pick the date and time that suits you.",
      pickServiceFirst: "Select a service first to view the calendar.",
      selectedService: "Selected service",
      duration: "Duration",
      price: "Price",
      vipBeforeShort: "VIP before work hours",
      vipAfterShort: "VIP after work hours",
      previous: "Previous",
      next: "Next",
      availableOn: "Available",
      noSlots: "No available slots for this day.",
      note: "Note",
      notePlaceholder: "Special requests, style, additional details.",
      addToCalendar: "Add to calendar",
      back: "Back",
      submit: "Confirm appointment",
      sending: "Sending...",
      mustLoginToBook: "You must be logged in to book an appointment.",
      selectServiceBeforeBooking: "Please choose a service before booking.",
      apiMissing: "API is not configured. Add NEXT_PUBLIC_API_BASE_URL to .env.",
      cannotLoadAppointments: "Unable to load appointments.",
      cannotCheckAvailability: "Unable to check availability.",
      submitError: "Booking request failed.",
      bookingConfirmed: "Your appointment has been confirmed.",
      genericError: "Something went wrong.",
      statusLabels: {
        pending: "Pending",
        confirmed: "Confirmed",
        completed: "Completed",
        cancelled: "Cancelled",
        no_show: "No show",
      },
    },
    it: {
      loginRequired: "Accesso obbligatorio",
      loginRequiredDesc: "Devi accedere prima di prenotare.",
      login: "Accedi",
      register: "Registrati",
      title: "Prenota appuntamento",
      subtitle: "Scegli servizio, data e orario.",
      loggedIn: "Accesso effettuato",
      warning: "Attenzione: hai",
      unpaidAppointments: "appuntamenti non pagati.",
      totalForPayment: "Totale da pagare:",
      serviceStep: "1. Servizio",
      slotStep: "2. Orario",
      nextAppointment: "Il tuo prossimo appuntamento",
      refresh: "Aggiorna",
      loading: "Caricamento...",
      noAppointments: "Nessun appuntamento prenotato.",
      chooseService: "Scegli servizio",
      serviceHint: "Gli orari si adattano alla durata del servizio.",
      selected: "Selezionato",
      choose: "Scegli",
      continue: "Continua",
      chooseDateAndTime: "Scegli data e orario",
      chooseDateHint: "Scegli la data e l'orario piu adatti a te.",
      pickServiceFirst: "Seleziona prima un servizio per vedere il calendario.",
      selectedService: "Servizio selezionato",
      duration: "Durata",
      price: "Prezzo",
      vipBeforeShort: "VIP prima dell'orario",
      vipAfterShort: "VIP dopo l'orario",
      previous: "Precedente",
      next: "Successivo",
      availableOn: "Disponibile",
      noSlots: "Nessun orario disponibile per questo giorno.",
      note: "Nota",
      notePlaceholder: "Richieste speciali, stile, dettagli aggiuntivi.",
      addToCalendar: "Aggiungi al calendario",
      back: "Indietro",
      submit: "Conferma appuntamento",
      sending: "Invio...",
      mustLoginToBook: "Devi essere autenticato per prenotare.",
      selectServiceBeforeBooking: "Seleziona un servizio prima della prenotazione.",
      apiMissing: "API non configurata. Aggiungi NEXT_PUBLIC_API_BASE_URL in .env.",
      cannotLoadAppointments: "Impossibile caricare gli appuntamenti.",
      cannotCheckAvailability: "Impossibile verificare la disponibilita.",
      submitError: "Errore durante l'invio della prenotazione.",
      bookingConfirmed: "Il tuo appuntamento e stato confermato.",
      genericError: "Si e verificato un errore.",
      statusLabels: {
        pending: "In attesa",
        confirmed: "Confermato",
        completed: "Completato",
        cancelled: "Annullato",
        no_show: "Assente",
      },
    },
  }[language];

  const minLeadMessage = (minutes: number) => {
    if (language === "en") {
      return `Appointment must be booked at least ${minutes} minutes in advance.`;
    }
    if (language === "it") {
      return `L'appuntamento deve essere prenotato almeno ${minutes} minuti prima.`;
    }
    return `Termin mora biti zakazan najmanje ${minutes} minuta unapred.`;
  };
  const today = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }, []);
  const firstWorkingDay = useMemo(() => getNextWorkingDay(today), [today]);
  const lastDay = useMemo(() => addDays(today, BOOKING_DAYS_AHEAD), [today]);
  const dateList = useMemo(
    () =>
      buildDateRange(firstWorkingDay, lastDay).filter((value) =>
        isWorkingDay(new Date(`${value}T00:00:00`))
      ),
    [firstWorkingDay, lastDay]
  );

  const [client, setClient] = useState<ClientProfile | null>(null);
  const [serviceItems, setServiceItems] = useState<Service[]>(fallbackServices);
  const [bookingSettings, setBookingSettings] = useState<BookingSettings>({
    minBookingLeadMinutes: 60,
    minCancelLeadMinutes: 60,
  });
  const [clientAppointments, setClientAppointments] = useState<Appointment[]>([]);
  const [formData, setFormData] = useState({
    serviceId: "",
    date: formatDate(firstWorkingDay),
    time: "",
    note: "",
  });
  const [status, setStatus] = useState<StatusState>({ type: "idle" });
  const [availabilityStatus, setAvailabilityStatus] = useState<AvailabilityState>({
    type: "idle",
  });
  const [availabilityByDate, setAvailabilityByDate] = useState<
    Record<string, string[]>
  >({});
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [lastBooked, setLastBooked] = useState<CalendarBooking | null>(null);
  const [calendarMonth, setCalendarMonth] = useState(
    new Date(firstWorkingDay.getFullYear(), firstWorkingDay.getMonth(), 1)
  );
  const weekSwipeStart = useRef<{ x: number; y: number } | null>(null);
  const swipeAnimationTimeout = useRef<number | null>(null);
  const [weekTransition, setWeekTransition] = useState<"next" | "prev" | null>(null);
  const slotRef = useRef<HTMLDivElement | null>(null);
  const submitRef = useRef<HTMLDivElement | null>(null);
  const calendarRef = useRef<HTMLDivElement | null>(null);
  const [autoSelectPending, setAutoSelectPending] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("db_client_token");
    if (!token) {
      return;
    }

    const name = localStorage.getItem("db_client_name") || "";
    const phone = localStorage.getItem("db_client_phone") || "";
    const email = localStorage.getItem("db_client_email") || "";

    setClient({ name, phone, email, token });
  }, []);

  const fetchClientAppointments = async (token: string) => {
    if (!apiBaseUrl) {
      return;
    }

    try {
      const response = await fetch(
        `${apiBaseUrl}/appointments.php?clientToken=${encodeURIComponent(token)}`
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || text.cannotLoadAppointments);
      }

      const items = Array.isArray(data.appointments) ? data.appointments : [];
      items.sort((a: Appointment, b: Appointment) =>
        `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`)
      );
      setClientAppointments(items);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : text.genericError;
      setStatus({ type: "error", message });
    }
  };

  useEffect(() => {
    if (!client?.token) {
      return;
    }

    fetchClientAppointments(client.token);
  }, [client?.token]);

  useEffect(() => {
    return () => {
      if (swipeAnimationTimeout.current) {
        window.clearTimeout(swipeAnimationTimeout.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!apiBaseUrl) {
      return;
    }

    let active = true;
    fetchServices(apiBaseUrl)
      .then((items) => {
        if (!active) {
          return;
        }
        setServiceItems(items.length > 0 ? items : fallbackServices);
      })
      .catch(() => {
        if (active) {
          setServiceItems(fallbackServices);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!apiBaseUrl) {
      return;
    }

    let active = true;
    fetch(`${apiBaseUrl}/settings.php`)
      .then((response) => response.json())
      .then((data) => {
        if (!active) {
          return;
        }
        const settings = data?.settings ?? data ?? {};
        const minBookingLeadMinutes = Number(settings.minBookingLeadMinutes ?? 60);
        const minCancelLeadMinutes = Number(settings.minCancelLeadMinutes ?? 60);
        setBookingSettings({
          minBookingLeadMinutes: Number.isFinite(minBookingLeadMinutes)
            ? minBookingLeadMinutes
            : 60,
          minCancelLeadMinutes: Number.isFinite(minCancelLeadMinutes)
            ? minCancelLeadMinutes
            : 60,
        });
      })
      .catch(() => {
        if (active) {
          setBookingSettings((prev) => prev);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const selectedService = useMemo(
    () => serviceItems.find((service) => service.id === formData.serviceId),
    [formData.serviceId, serviceItems]
  );
  const selectedServiceDurationLabel = selectedService
    ? selectedService.vipWindow === "before" || selectedService.vipWindow === "after"
      ? "1 h"
      : selectedService.duration
    : "";
  const selectedServiceDurationMinutes = selectedService
    ? selectedService.vipWindow === "before" || selectedService.vipWindow === "after"
      ? 60
      : parseDurationMinutes(selectedService.duration)
    : 0;
  const selectedServiceVipLabel = selectedService
    ? selectedService.vipWindow === "before"
      ? text.vipBeforeShort
      : selectedService.vipWindow === "after"
        ? text.vipAfterShort
        : ""
    : "";
  const activeServices = useMemo(
    () => getActiveServices(serviceItems),
    [serviceItems]
  );
  const orderedServices = useMemo(() => orderServices(activeServices), [activeServices]);

  const calendarDays = useMemo(
    () => buildCalendarDays(calendarMonth, firstWorkingDay, lastDay),
    [calendarMonth, firstWorkingDay, lastDay]
  );
  const maxSlotsByDate = useMemo(() => {
    if (!selectedService) {
      return {};
    }

    const map: Record<string, number> = {};
    dateList.forEach((date) => {
      map[date] = buildSlots(
        date,
        selectedServiceDurationMinutes,
        [],
        [],
        bookingSettings.minBookingLeadMinutes,
        selectedService.vipWindow
      ).length;
    });
    return map;
  }, [
    dateList,
    selectedServiceDurationMinutes,
    selectedService?.vipWindow,
    bookingSettings.minBookingLeadMinutes,
  ]);

  const selectedDateObj = useMemo(
    () => new Date(`${formData.date}T00:00:00`),
    [formData.date]
  );
  const weekStart = useMemo(() => getWeekStart(selectedDateObj), [selectedDateObj]);
  const weekDays = useMemo(
    () => WORKING_DAY_ORDER.map((dayIndex) => addDays(weekStart, dayIndex - 1)),
    [weekStart]
  );

  useEffect(() => {
    if (!apiBaseUrl || !selectedService) {
      setAvailabilityByDate({});
      setAvailableSlots([]);
      setAvailabilityStatus({ type: "idle" });
      return;
    }

    let active = true;
    setAvailabilityStatus({ type: "loading" });
    setAvailabilityByDate({});

    const fetchForDate = async (date: string) => {
      const response = await fetch(
        `${apiBaseUrl}/availability.php?date=${encodeURIComponent(date)}`
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || text.cannotCheckAvailability);
      }

      const appointments = Array.isArray(data.appointments) ? data.appointments : [];
      const blocks = Array.isArray(data.blocks) ? data.blocks : [];
      const slots = buildSlots(
        date,
        selectedServiceDurationMinutes,
        appointments,
        blocks,
        bookingSettings.minBookingLeadMinutes,
        selectedService.vipWindow
      );

      return [date, slots] as const;
    };

    Promise.all(dateList.map((date) => fetchForDate(date)))
      .then((entries) => {
        if (!active) {
          return;
        }

        const map: Record<string, string[]> = {};
        entries.forEach(([date, slots]) => {
          map[date] = slots;
        });
        setAvailabilityByDate(map);
        setAvailabilityStatus({ type: "idle" });
      })
      .catch((error) => {
        if (!active) {
          return;
        }

        const message =
          error instanceof Error ? error.message : text.genericError;
        setAvailabilityStatus({ type: "error", message });
        setAvailabilityByDate({});
      });

    return () => {
      active = false;
    };
  }, [
    apiBaseUrl,
    dateList,
    selectedServiceDurationMinutes,
    selectedService?.id,
    selectedService?.vipWindow,
    bookingSettings.minBookingLeadMinutes,
  ]);

  useEffect(() => {
    if (!selectedService) {
      setAvailableSlots([]);
      return;
    }

    const slots = availabilityByDate[formData.date] ?? [];
    setAvailableSlots(slots);
    setFormData((prev) => ({
      ...prev,
      time: slots.includes(prev.time) ? prev.time : slots[0] ?? "",
    }));
  }, [availabilityByDate, formData.date, selectedService?.id]);

  useEffect(() => {
    const [year, month] = formData.date.split("-").map((part) => Number(part));
    if (!year || !month) {
      return;
    }

    setCalendarMonth(new Date(year, month - 1, 1));
  }, [formData.date]);

  useEffect(() => {
    if (!selectedService || !autoSelectPending) {
      return;
    }

    if (availabilityStatus.type === "loading") {
      return;
    }

    const nextDate = dateList.find((date) => (availabilityByDate[date] ?? []).length > 0);
    if (nextDate) {
      setFormData((prev) => ({
        ...prev,
        date: nextDate,
        time: "",
      }));
      window.setTimeout(() => {
        if (calendarRef.current) {
          calendarRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 0);
    }

    setAutoSelectPending(false);
  }, [
    autoSelectPending,
    availabilityByDate,
    availabilityStatus.type,
    dateList,
    selectedService?.id,
  ]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!client) {
      setStatus({
        type: "error",
        message: text.mustLoginToBook,
      });
      return;
    }

    if (!selectedService) {
      setStatus({
        type: "error",
        message: text.selectServiceBeforeBooking,
      });
      return;
    }

    if (!apiBaseUrl) {
      setStatus({
        type: "error",
        message: text.apiMissing,
      });
      return;
    }

    if (!formData.date || !formData.time) {
      setStatus({
        type: "error",
        message: "Izaberite datum i vreme.",
      });
      return;
    }

    const bookingDate = new Date(`${formData.date}T00:00:00`);
    if (!isWorkingDay(bookingDate)) {
      setStatus({
        type: "error",
        message: "Vikendom ne radimo. Izaberi radni dan.",
      });
      return;
    }

    const minLeadMinutes = Math.max(0, bookingSettings.minBookingLeadMinutes);
    if (minLeadMinutes > 0) {
      const bookingDateTime = new Date(`${formData.date}T${formData.time}:00`);
      const minAllowed = new Date(Date.now() + minLeadMinutes * 60000);
      if (Number.isNaN(bookingDateTime.getTime())) {
        setStatus({
          type: "error",
          message: "Neispravan datum ili vreme.",
        });
        return;
      }
      if (bookingDateTime < minAllowed) {
        setStatus({
          type: "error",
          message: minLeadMessage(minLeadMinutes),
        });
        return;
      }
    }

    setStatus({ type: "sending" });

    const durationMinutes = selectedServiceDurationMinutes;

    const payload = {
      clientName: client.name,
      phone: client.phone,
      email: client.email,
      serviceId: formData.serviceId,
      serviceName: selectedService.name,
      duration: selectedServiceDurationLabel || selectedService.duration,
      price: selectedService.price,
      date: formData.date,
      time: formData.time,
      notes: formData.note.trim(),
      clientToken: client.token,
      source: "web",
    };

    try {
      const response = await fetch(`${apiBaseUrl}/appointments.php`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || text.submitError);
      }

      setStatus({
        type: "success",
        message: text.bookingConfirmed,
      });
      setLastBooked({
        serviceName: selectedService.name,
        date: formData.date,
        time: formData.time,
        durationMinutes,
        note: formData.note.trim(),
      });
      if (client?.token) {
        fetchClientAppointments(client.token);
      }

      setFormData((prev) => ({
        ...prev,
        time: "",
        note: "",
      }));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : text.genericError;
      setStatus({ type: "error", message });
    }
  };

  const handleAddToCalendar = () => {
    if (!lastBooked) {
      return;
    }

    const ics = buildIcs(lastBooked);
    if (!ics) {
      return;
    }

    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `termin-${lastBooked.date}.ics`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 500);
  };

  const scrollToSubmit = () => {
    if (typeof window === "undefined") {
      return;
    }
    if (!window.matchMedia("(max-width: 900px)").matches) {
      return;
    }
    if (submitRef.current) {
      submitRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const scrollToSlots = () => {
    if (typeof window === "undefined") {
      return;
    }
    if (!window.matchMedia("(max-width: 900px)").matches) {
      return;
    }
    if (slotRef.current) {
      slotRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const scrollToCalendar = () => {
    if (typeof window === "undefined") {
      return;
    }
    if (calendarRef.current) {
      calendarRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const handleWeekSwipeStart = (event: TouchEvent<HTMLDivElement>) => {
    const touch = event.touches[0];
    weekSwipeStart.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleWeekSwipeEnd = (event: TouchEvent<HTMLDivElement>) => {
    if (!weekSwipeStart.current) {
      return;
    }

    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - weekSwipeStart.current.x;
    const deltaY = touch.clientY - weekSwipeStart.current.y;
    weekSwipeStart.current = null;

    if (Math.abs(deltaX) < 60 || Math.abs(deltaX) <= Math.abs(deltaY)) {
      return;
    }

    if (deltaX < 0 && canGoNextWeek) {
      setWeekTransition("next");
      setFormData((prev) => ({
        ...prev,
        date: formatDate(addDays(weekStart, 7)),
      }));
    } else if (deltaX > 0 && canGoPrevWeek) {
      setWeekTransition("prev");
      setFormData((prev) => ({
        ...prev,
        date: formatDate(addDays(weekStart, -7)),
      }));
    }

    if (swipeAnimationTimeout.current) {
      window.clearTimeout(swipeAnimationTimeout.current);
    }
    swipeAnimationTimeout.current = window.setTimeout(() => {
      setWeekTransition(null);
    }, 240);
  };

  const servicePrice = selectedService?.price
    ? `RSD ${selectedService.price.toLocaleString(locale)}`
    : "-";

  const canGoPrev =
    calendarMonth > new Date(firstWorkingDay.getFullYear(), firstWorkingDay.getMonth(), 1);
  const canGoNext =
    calendarMonth < new Date(lastDay.getFullYear(), lastDay.getMonth(), 1);
  const canGoPrevWeek = weekStart > firstWorkingDay;
  const canGoNextWeek = addDays(weekStart, 7) <= lastDay;

  const weekdayLabels = useMemo(() => {
    const base = new Date(2024, 0, 1);
    return WORKING_DAY_ORDER.map((dayIndex) => {
      const offset = dayIndex === 0 ? -1 : dayIndex - 1;
      return formatWeekday(addDays(base, offset), locale);
    });
  }, [locale]);

  const selectedDateLabel = formData.date ? formatLongDate(formData.date, locale) : "";
  const sortedSlots = useMemo(
    () => [...availableSlots].sort((a, b) => timeToMinutes(a) - timeToMinutes(b)),
    [availableSlots]
  );
  const getAvailabilityClass = (date: string, slots?: string[]) => {
    if (slots === undefined) {
      return "is-loading";
    }

    if (slots.length === 0) {
      return "is-none";
    }

    const maxSlots = maxSlotsByDate[date] ?? slots.length;
    const ratio = maxSlots > 0 ? slots.length / maxSlots : 0;
    return ratio >= 0.6 ? "is-high" : "is-medium";
  };

  const unpaidAppointments = useMemo(
    () => clientAppointments.filter((appointment) => appointment.status === "no_show"),
    [clientAppointments]
  );

  const unpaidTotal = useMemo(
    () =>
      unpaidAppointments.reduce(
        (sum, appointment) => sum + (appointment.price ? Number(appointment.price) : 0),
        0
      ),
    [unpaidAppointments]
  );

  if (!client) {
    return (
      <div className="booking-locked">
        <div>
          <h3>{text.loginRequired}</h3>
          <p>{text.loginRequiredDesc}</p>
        </div>
        <div className="hero-actions">
          <Link className="button" href="/login">
            {text.login}
          </Link>
          <Link className="button outline" href="/register">
            {text.register}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form className="booking-form" onSubmit={handleSubmit}>

      {unpaidAppointments.length > 0 && (
        <div className="booking-debt">
          <strong>
            {text.warning} {unpaidAppointments.length} {text.unpaidAppointments}
          </strong>
          <span>
            {text.totalForPayment} RSD {unpaidTotal.toLocaleString(locale)}
          </span>
          <div className="booking-debt__items">
            {unpaidAppointments.map((appointment) => (
              <div key={appointment.id} className="booking-debt__item">
                <span>{formatLongDate(appointment.date, locale)}</span>
                <span>
                  RSD {(appointment.price ?? 0).toLocaleString(locale)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="booking-steps">
        <section className="booking-panel" data-step="1">
          <div className="booking-panel__header">
            <span className="step-pill">01</span>
            <div>
              <h4>{text.chooseService}</h4>
              <p>{text.serviceHint}</p>
            </div>
          </div>
          <div className="service-list">
            {orderedServices.map((service) => {
              const isActive = service.id === formData.serviceId;
              return (
                <button
                  key={service.id}
                  type="button"
                  className={`service-option ${isActive ? "is-active" : ""}${
                    service.vipWindow === "before" || service.vipWindow === "after"
                      ? " is-vip"
                      : ""
                  }`}
                  onClick={() => {
                    setFormData((prev) => ({
                      ...prev,
                      serviceId: service.id,
                      time: "",
                    }));
                    setAutoSelectPending(true);
                    window.setTimeout(scrollToCalendar, 0);
                  }}
                >
                  <div className="service-info">
                    <strong>{service.name}</strong>
                    <span>
                      {service.vipWindow === "before" || service.vipWindow === "after"
                        ? "1 h"
                        : service.duration}{" "}
                      | RSD {service.price.toLocaleString(locale)}
                    </span>
                    {service.vipWindow === "before" && (
                      <em>{text.vipBeforeShort}</em>
                    )}
                    {service.vipWindow === "after" && (
                      <em>{text.vipAfterShort}</em>
                    )}
                  </div>
                  <span className="service-action">
                    {isActive ? text.selected : text.choose}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="booking-panel" data-step="2">
          <div className="booking-panel__header">
            <span className="step-pill">02</span>
            <div>
              <h4>{text.chooseDateAndTime}</h4>
              <p>{text.chooseDateHint}</p>
            </div>
          </div>

          {!selectedService && (
            <div className="booking-empty">{text.pickServiceFirst}</div>
          )}

          {selectedService && (
            <>
              <div className="booking-meta">
                <div>
                  <span>{text.selectedService}</span>
                  <strong>{selectedService.name}</strong>
                  {selectedServiceVipLabel && <em>{selectedServiceVipLabel}</em>}
                </div>
                <div>
                  <span>{text.duration}</span>
                  <strong>{selectedServiceDurationLabel || selectedService.duration}</strong>
                </div>
                <div>
                  <span>{text.price}</span>
                  <strong>{servicePrice}</strong>
                </div>
              </div>

              <div className="calendar" ref={calendarRef}>
                <div className="calendar-header">
                  <Button
                    size="sm"
                    variant="bordered"
                    className="calendar-nav"
                    isDisabled={!canGoPrev}
                    onPress={() => setCalendarMonth(addMonths(calendarMonth, -1))}
                  >
                    {text.previous}
                  </Button>
                  <div className="calendar-title">{formatMonthLabel(calendarMonth, locale)}</div>
                  <Button
                    size="sm"
                    variant="bordered"
                    className="calendar-nav"
                    isDisabled={!canGoNext}
                    onPress={() => setCalendarMonth(addMonths(calendarMonth, 1))}
                  >
                    {text.next}
                  </Button>
                </div>

              <div className="calendar-weekdays">
                {weekdayLabels.map((day) => (
                  <span key={day}>{day}</span>
                ))}
              </div>

              <div
                className={`calendar-week${
                  weekTransition ? ` is-swipe-${weekTransition}` : ""
                }`}
                onTouchStart={handleWeekSwipeStart}
                onTouchEnd={handleWeekSwipeEnd}
              >
                {weekDays.map((day) => {
                  const value = formatDate(day);
                  const isActive = value === formData.date;
                  const slots = availabilityByDate[value];
                  const hasSlots = slots ? slots.length > 0 : false;
                  const inRange = day >= firstWorkingDay && day <= lastDay;
                  const isDisabled =
                    !inRange || (slots !== undefined && slots.length === 0);

                  return (
                    <Button
                      key={value}
                      size="sm"
                      variant="flat"
                      radius="sm"
                      className={`calendar-week-day ${isActive ? "is-active" : ""}`}
                      isDisabled={isDisabled}
                      onPress={() => {
                        setAutoSelectPending(false);
                        setFormData((prev) => ({
                          ...prev,
                          date: value,
                        }));
                        window.setTimeout(scrollToSlots, 0);
                      }}
                    >
                      <span className="calendar-week-day__label">
                        {formatWeekday(day, locale)}
                      </span>
                      <span className="calendar-week-day__date">
                        {day.getDate()}
                      </span>
                      {inRange && (
                        <span
                          className={`calendar-indicator ${getAvailabilityClass(
                            value,
                            slots
                          )}`}
                        />
                      )}
                    </Button>
                  );
                })}
              </div>

              <div className="calendar-grid">
                {calendarDays.map((day, index) => {
                  if (!day.inMonth) {
                    return <div key={`empty-${index}`} className="calendar-cell" />;
                    }

                    const isActive = day.value === formData.date;
                    const slots = day.value ? availabilityByDate[day.value] : undefined;
                    const hasSlots = slots ? slots.length > 0 : false;
                    const isDisabled = !day.inRange || (slots !== undefined && slots.length === 0);

                    return (
                      <Button
                        key={day.value}
                        size="sm"
                        variant="flat"
                        radius="sm"
                        className={`calendar-day ${isActive ? "is-active" : ""}`}
                        isDisabled={isDisabled}
                        onPress={() => {
                          const value = day.value;
                          if (!value) {
                            return;
                          }
                          setAutoSelectPending(false);
                          setFormData((prev) => ({
                            ...prev,
                            date: value,
                          }));
                          window.setTimeout(scrollToSlots, 0);
                        }}
                      >
                        <span>{day.label}</span>
                        {day.inRange && (
                          <span
                            className={`calendar-indicator ${getAvailabilityClass(
                              day.value || "",
                              slots
                            )}`}
                          />
                        )}
                      </Button>
                    );
                  })}
                </div>
              </div>

              <div className="slot-section" ref={slotRef}>
                <div className="slot-header">
                  <h4>{text.availableOn} {selectedDateLabel} (GMT+1)</h4>
                  {availabilityStatus.type === "loading" && <span>{text.loading}</span>}
                  {availabilityStatus.type === "error" && (
                    <span>{availabilityStatus.message}</span>
                  )}
                </div>

                {availableSlots.length === 0 && availabilityStatus.type !== "loading" && (
                  <div className="slot-empty">{text.noSlots}</div>
                )}

                {availableSlots.length > 0 && (
                  <div className="slot-items slot-items--single">
                    {sortedSlots.map((slot) => (
                      <Button
                        key={slot}
                        size="sm"
                        variant="bordered"
                        radius="sm"
                        className={`slot-button ${
                          slot === formData.time ? "is-active" : ""
                        }`}
                        onPress={() => {
                          setFormData((prev) => ({ ...prev, time: slot }));
                          window.setTimeout(scrollToSubmit, 0);
                        }}
                      >
                        {formatSlotLabel(slot, locale)}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
              <div className="booking-note">
                <label htmlFor="note">{text.note}</label>
                <textarea
                  id="note"
                  name="note"
                  className="textarea"
                  value={formData.note}
                  onChange={(event) =>
                    setFormData((prev) => ({ ...prev, note: event.target.value }))
                  }
                  placeholder={text.notePlaceholder}
                />
              </div>
            </>
          )}

          {status.type !== "idle" && status.message && (
            <div
              className={`form-status ${status.type} ${
                status.type === "success" ? "booking-confirm" : ""
              }`}
            >
              {status.message}
            </div>
          )}

          {status.type === "success" && lastBooked && (
            <div className="booking-calendar">
              <button className="button outline" type="button" onClick={handleAddToCalendar}>
                {text.addToCalendar}
              </button>
            </div>
          )}

          <div className="booking-submit" ref={submitRef}>
            <button
              className="button"
              type="submit"
              disabled={status.type === "sending" || !formData.time || !selectedService}
            >
              {status.type === "sending" ? text.sending : text.submit}
            </button>
          </div>
        </section>
      </div>
    </form>
  );
}




