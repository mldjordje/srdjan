"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type CSSProperties,
  type FormEvent,
  type TouchEvent,
} from "react";

import AdminShell from "@/components/admin/AdminShell";
import { fetchServices, services as fallbackServices, type Service } from "@/lib/services";
import { siteConfig } from "@/lib/site";
import { useLanguage, type Language } from "@/lib/useLanguage";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "";
const adminKey = process.env.NEXT_PUBLIC_ADMIN_KEY || "";
const MONTHS_AHEAD = 12;
const WORKING_DAYS = siteConfig.schedule.workingDays ?? [1, 2, 3, 4, 5];
const WORKING_DAY_ORDER = [...WORKING_DAYS].sort((a, b) => a - b);
const getWorkdayColumn = (day: number) => WORKING_DAY_ORDER.indexOf(day);

type Appointment = {
  id: string;
  clientName: string;
  phone?: string;
  email?: string;
  serviceId?: string;
  serviceName: string;
  duration?: string;
  price?: number;
  date: string;
  time: string;
  notes?: string;
  status?: string;
  source?: string;
  createdAt?: string;
};

type Block = {
  id: string;
  date: string;
  time: string;
  duration: number;
  note?: string;
};

type BreakWindow = {
  start: string;
  end: string;
};

type Client = {
  id: string;
  name: string;
  phone: string;
  email?: string;
};

type AppointmentFormState = {
  date: string;
  time: string;
  serviceId: string;
  clientName: string;
  phone: string;
  email: string;
  notes: string;
};

type StatusState = {
  type: "idle" | "loading" | "success" | "error";
  message?: string;
};

type CalendarDay = {
  value: string | null;
  label: string;
  inMonth: boolean;
  inRange: boolean;
};

type ScheduleItem = {
  id: string;
  sourceId?: string;
  date: string;
  time: string;
  dayIndex: number;
  startRow: number;
  span: number;
  title: string;
  subtitle?: string;
  duration?: number;
  note?: string;
  type: "appointment" | "block";
  status?: string;
  appointment?: Appointment;
  serviceColor?: string;
};

const statusLabels: Record<string, string> = {
  pending: "Na cekanju",
  confirmed: "Potvrdjen",
  completed: "Zavrsen",
  cancelled: "Otkazan",
  no_show: "Nije dosao",
};

const statusOptions = [
  { value: "confirmed", label: "Potvrdjen" },
  { value: "no_show", label: "Nije dosao (ispalio)" },
];

const sourceLabels: Record<string, string> = {
  web: "Online",
  admin: "Rucno",
};

const formatDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
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

const formatLongDate = (value: string, locale: string) => {
  const date = new Date(`${value}T00:00:00`);
  return new Intl.DateTimeFormat(locale, {
    weekday: "long",
    day: "2-digit",
    month: "long",
  }).format(date);
};

const formatRangeLabel = (start: Date, end: Date, locale: string) => {
  const startLabel = new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "short",
  }).format(start);
  const endLabel = new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "short",
  }).format(end);
  return `${startLabel} - ${endLabel}`;
};

const normalizeTimeInput = (value: string) => (value ? value.slice(0, 5) : "");

const normalizePhoneValue = (value: string) => value.replace(/\D+/g, "");
const normalizeServiceKey = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();

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

const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const isWorkingDay = (date: Date) => WORKING_DAYS.includes(date.getDay());

const getNextWorkingDay = (date: Date) => {
  let cursor = new Date(date);
  while (!isWorkingDay(cursor)) {
    cursor = addDays(cursor, 1);
  }
  return cursor;
};

const addMonthsClamped = (date: Date, months: number) => {
  const year = date.getFullYear();
  const month = date.getMonth() + months;
  const day = date.getDate();
  const lastDay = new Date(year, month + 1, 0).getDate();
  return new Date(year, month, Math.min(day, lastDay));
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

const getWeekStart = (date: Date) => {
  const day = date.getDay();
  const diff = (day + 6) % 7;
  return addDays(date, -diff);
};

const buildTimeSlots = (
  open: string,
  close: string,
  stepMinutes: number,
  breaks: BreakWindow[] = []
) => {
  const slots: string[] = [];
  const startMinutes = timeToMinutes(open);
  const endMinutes = timeToMinutes(close);
  const breakWindows = breaks
    .map((window) => ({
      start: timeToMinutes(window.start),
      end: timeToMinutes(window.end),
    }))
    .filter((window) => window.end > window.start);

  for (let minutes = startMinutes; minutes < endMinutes; minutes += stepMinutes) {
    const isBreak = breakWindows.some(
      (window) => minutes >= window.start && minutes < window.end
    );
    if (isBreak) {
      continue;
    }
    slots.push(minutesToTime(minutes));
  }

  return slots;
};

export default function AdminCalendarPage() {
  const { language } = useLanguage();
  const locale = language === "sr" ? "sr-RS" : language === "en" ? "en-US" : "it-IT";
  const text: Record<Language, Record<string, string>> = {
    sr: {
      totalAppointments: "Ukupno termina",
      totalBlocks: "Ukupno blokada",
      apiMissing: "API nije podesen. Dodaj NEXT_PUBLIC_API_BASE_URL u .env.",
      adminMissing: "Dodaj NEXT_PUBLIC_ADMIN_KEY u .env da bi CMS radio.",
      cannotLoadBlocks: "Ne mogu da preuzmem blokade.",
      genericError: "Doslo je do greske.",
      calendarRefreshed: "Kalendar je osvezen.",
      confirmDeleteAppointment: "Da li sigurno zelis da obrises termin?",
      cannotDeleteAppointment: "Ne mogu da obrisem termin.",
      appointmentDeleted: "Termin je obrisan.",
      cannotSaveStatus: "Ne mogu da sacuvam status.",
      statusSaved: "Status je sacuvan.",
      cannotSaveBlock: "Ne mogu da sacuvam blokadu.",
      cannotSaveAppointment: "Ne mogu da sacuvam termin.",
      appointmentUpdated: "Termin je izmenjen.",
      appointmentSaved: "Termin je sacuvan.",
      cannotDeleteBlock: "Ne mogu da obrisem blokadu.",
      feedMissing: "Dodaj API bazu i admin key da bi generisao feed.",
      chooseDate: "Izaberi datum",
    },
    en: {
      totalAppointments: "Total appointments",
      totalBlocks: "Total blocks",
      apiMissing: "API is not configured. Add NEXT_PUBLIC_API_BASE_URL to .env.",
      adminMissing: "Add NEXT_PUBLIC_ADMIN_KEY to .env so CMS can work.",
      cannotLoadBlocks: "Unable to load blocks.",
      genericError: "Something went wrong.",
      calendarRefreshed: "Calendar refreshed.",
      confirmDeleteAppointment: "Are you sure you want to delete this appointment?",
      cannotDeleteAppointment: "Unable to delete appointment.",
      appointmentDeleted: "Appointment deleted.",
      cannotSaveStatus: "Unable to save status.",
      statusSaved: "Status saved.",
      cannotSaveBlock: "Unable to save block.",
      cannotSaveAppointment: "Unable to save appointment.",
      appointmentUpdated: "Appointment updated.",
      appointmentSaved: "Appointment saved.",
      cannotDeleteBlock: "Unable to delete block.",
      feedMissing: "Add API base URL and admin key to generate feed.",
      chooseDate: "Select date",
    },
    it: {
      totalAppointments: "Appuntamenti totali",
      totalBlocks: "Blocchi totali",
      apiMissing: "API non configurata. Aggiungi NEXT_PUBLIC_API_BASE_URL in .env.",
      adminMissing: "Aggiungi NEXT_PUBLIC_ADMIN_KEY in .env per usare il CMS.",
      cannotLoadBlocks: "Impossibile caricare i blocchi.",
      genericError: "Si e verificato un errore.",
      calendarRefreshed: "Calendario aggiornato.",
      confirmDeleteAppointment: "Sei sicuro di voler eliminare questo appuntamento?",
      cannotDeleteAppointment: "Impossibile eliminare l'appuntamento.",
      appointmentDeleted: "Appuntamento eliminato.",
      cannotSaveStatus: "Impossibile salvare lo stato.",
      statusSaved: "Stato salvato.",
      cannotSaveBlock: "Impossibile salvare il blocco.",
      cannotSaveAppointment: "Impossibile salvare l'appuntamento.",
      appointmentUpdated: "Appuntamento aggiornato.",
      appointmentSaved: "Appuntamento salvato.",
      cannotDeleteBlock: "Impossibile eliminare il blocco.",
      feedMissing: "Aggiungi URL API e admin key per generare il feed.",
      chooseDate: "Seleziona data",
    },
  };
  const t = text[language];
  const today = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }, []);
  const firstWorkingDay = useMemo(() => getNextWorkingDay(today), [today]);
  const lastDay = useMemo(() => addMonthsClamped(today, MONTHS_AHEAD), [today]);
  const { open, close, slotMinutes, breaks = [] } = siteConfig.schedule;

  const [selectedDate, setSelectedDate] = useState(formatDate(firstWorkingDay));
  const [calendarMonth, setCalendarMonth] = useState(
    new Date(firstWorkingDay.getFullYear(), firstWorkingDay.getMonth(), 1)
  );
  const [appointmentsByDate, setAppointmentsByDate] = useState<
    Record<string, Appointment[]>
  >({});
  const [blocksByDate, setBlocksByDate] = useState<Record<string, Block[]>>({});
  const [status, setStatus] = useState<StatusState>({ type: "idle" });
  const [appointmentStatus, setAppointmentStatus] = useState<StatusState>({
    type: "idle",
  });
  const [appointmentActionStatus, setAppointmentActionStatus] = useState<StatusState>({
    type: "idle",
  });
  const [isSlotModalOpen, setIsSlotModalOpen] = useState(false);
  const [slotAction, setSlotAction] = useState<"appointment" | "block">("appointment");
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<{ date: string; time: string } | null>(
    null
  );
  const [blockForm, setBlockForm] = useState({
    date: formatDate(firstWorkingDay),
    time: "",
    duration: "20",
    note: "",
  });
  const [appointmentForm, setAppointmentForm] = useState<AppointmentFormState>({
    date: formatDate(firstWorkingDay),
    time: "",
    serviceId: fallbackServices[0]?.id ?? "",
    clientName: "",
    phone: "",
    email: "",
    notes: "",
  });
  const [serviceItems, setServiceItems] = useState<Service[]>(fallbackServices);
  const [clients, setClients] = useState<Client[]>([]);
  const [clientsStatus, setClientsStatus] = useState<StatusState>({ type: "idle" });
  const [selectedClientId, setSelectedClientId] = useState("");
  const [clientSearch, setClientSearch] = useState("");
  const weekSwipeStart = useRef<{ x: number; y: number } | null>(null);
  const swipeAnimationTimeout = useRef<number | null>(null);
  const [weekTransition, setWeekTransition] = useState<"next" | "prev" | null>(null);

  const selectedDateObj = useMemo(
    () => new Date(`${selectedDate}T00:00:00`),
    [selectedDate]
  );
  const weekStart = useMemo(() => getWeekStart(selectedDateObj), [selectedDateObj]);
  const weekEnd = useMemo(
    () => addDays(weekStart, WORKING_DAY_ORDER.length - 1),
    [weekStart]
  );
  const weekDays = useMemo(
    () => WORKING_DAY_ORDER.map((dayIndex) => addDays(weekStart, dayIndex - 1)),
    [weekStart]
  );
  const weekDateStrings = useMemo(
    () => weekDays.map((day) => formatDate(day)),
    [weekDays]
  );

  const timeSlots = useMemo(
    () => buildTimeSlots(open, close, slotMinutes, breaks),
    [open, close, slotMinutes, breaks]
  );
  const slotCount = timeSlots.length;
  const slotIndexByTime = useMemo(() => {
    const map: Record<string, number> = {};
    timeSlots.forEach((slot, index) => {
      map[slot] = index;
    });
    return map;
  }, [timeSlots]);

  const weekdayLabels = useMemo(() => {
    const base = new Date(2024, 0, 1);
    return WORKING_DAY_ORDER.map((dayIndex) => {
      const offset = dayIndex === 0 ? -1 : dayIndex - 1;
      return formatWeekday(addDays(base, offset), locale);
    });
  }, [locale]);

  const gridStyles = useMemo(
    () => ({
      gridTemplateColumns: `repeat(${weekDays.length}, minmax(0, 1fr))`,
      gridTemplateRows: `var(--calendar-header-height) 6px repeat(${slotCount}, var(--calendar-slot-height))`,
    }),
    [weekDays.length, slotCount]
  );

  const timeStyles = useMemo(
    () => ({
      gridTemplateRows: `var(--calendar-header-height) 6px repeat(${slotCount}, var(--calendar-slot-height))`,
    }),
    [slotCount]
  );

  const selectedDateLabel = selectedDate ? formatLongDate(selectedDate, locale) : "";
  const weekRangeLabel = useMemo(
    () => formatRangeLabel(weekStart, weekEnd, locale),
    [weekStart, weekEnd, locale]
  );

  const monthDays = useMemo(
    () => buildCalendarDays(calendarMonth, firstWorkingDay, lastDay),
    [calendarMonth, firstWorkingDay, lastDay]
  );

  const minMonth = new Date(firstWorkingDay.getFullYear(), firstWorkingDay.getMonth(), 1);
  const maxMonth = new Date(lastDay.getFullYear(), lastDay.getMonth(), 1);
  const canGoPrevMonth = calendarMonth > minMonth;
  const canGoNextMonth = calendarMonth < maxMonth;

  const selectedService = useMemo(
    () => serviceItems.find((service) => service.id === appointmentForm.serviceId),
    [appointmentForm.serviceId]
  );
  const filteredClients = useMemo(() => {
    const term = clientSearch.trim().toLowerCase().replace(/\s+/g, " ");
    if (!term) {
      if (!selectedClientId) {
        return [];
      }
      const selected = clients.find((client) => client.id === selectedClientId);
      return selected ? [selected] : [];
    }

    const normalizedPhone = normalizePhoneValue(term);
    return clients.filter((client) => {
      const name = (client.name || "").toLowerCase().replace(/\s+/g, " ").trim();
      const email = (client.email || "").toLowerCase();
      const phone = normalizePhoneValue(client.phone || "");

      const nameMatches =
        name.startsWith(term) || name.split(" ").some((part) => part.startsWith(term));
      const emailMatches = email.startsWith(term);

      if (nameMatches || emailMatches) {
        return true;
      }

      if (normalizedPhone && phone.startsWith(normalizedPhone)) {
        return true;
      }

      return false;
    });
  }, [clientSearch, clients, selectedClientId]);
  const serviceColorLookup = useMemo(() => {
    const byId: Record<string, string> = {};
    const byName: Record<string, string> = {};
    serviceItems.forEach((service) => {
      if (service.color) {
        byId[service.id] = service.color;
        byName[normalizeServiceKey(service.name)] = service.color;
      }
    });
    return { byId, byName };
  }, [serviceItems]);
  const breakBoundaryRows = useMemo(() => {
    if (!breaks?.length || !timeSlots.length) {
      return new Set<number>();
    }

    const boundaries = new Set<number>();
    breaks.forEach((window) => {
      const endMinutes = timeToMinutes(window.end);
      const firstSlotAfterBreak = timeSlots.findIndex(
        (slot) => timeToMinutes(slot) >= endMinutes
      );
      if (firstSlotAfterBreak > 0) {
        boundaries.add(firstSlotAfterBreak);
      }
    });

    return boundaries;
  }, [breaks, timeSlots]);
  const isEditingAppointment = Boolean(editingAppointment);
  const hasUnknownService =
    appointmentForm.serviceId !== "" &&
    !serviceItems.some((service) => service.id === appointmentForm.serviceId);

  const canGoPrev = weekStart > firstWorkingDay;
  const canGoNext = addDays(weekStart, 7) <= lastDay;
  const calendarKey = process.env.NEXT_PUBLIC_CALENDAR_KEY || adminKey;
  const calendarFeedUrl =
    apiBaseUrl && calendarKey
      ? `${apiBaseUrl}/calendar-feed.php?adminKey=${encodeURIComponent(calendarKey)}`
      : "";

  const scheduleItems = useMemo(() => {
    const items: ScheduleItem[] = [];
    const openMinutes = timeToMinutes(open);
    const closeMinutes = timeToMinutes(close);

    weekDays.forEach((day, dayIndex) => {
      const dateKey = formatDate(day);
      const dayAppointments = appointmentsByDate[dateKey] ?? [];
      const dayBlocks = blocksByDate[dateKey] ?? [];

      dayAppointments.forEach((appointment) => {
        const startMinutes = timeToMinutes(appointment.time);
        const durationMinutes =
          parseDurationMinutes(appointment.duration) || slotMinutes;

        if (startMinutes < openMinutes || startMinutes >= closeMinutes) {
          return;
        }

        const startKey = minutesToTime(startMinutes);
        const startIndex = slotIndexByTime[startKey];
        if (startIndex === undefined) {
          return;
        }
        const rowStart = startIndex + 3;
        const rawSpan = Math.ceil(durationMinutes / slotMinutes);
        const maxSpan = slotCount - startIndex;
        const span = Math.max(1, Math.min(rawSpan, maxSpan));

        const serviceColor =
          (appointment.serviceId && serviceColorLookup.byId[appointment.serviceId]) ||
          (appointment.serviceName &&
            serviceColorLookup.byName[normalizeServiceKey(appointment.serviceName)]);

        items.push({
          id: `appointment-${appointment.id}`,
          sourceId: appointment.id,
          date: dateKey,
          time: appointment.time,
          dayIndex,
          startRow: rowStart,
          span,
          title: appointment.clientName,
          subtitle: appointment.serviceName,
          duration: durationMinutes,
          type: "appointment",
          status: appointment.status || "pending",
          appointment,
          serviceColor,
        });
      });

      dayBlocks.forEach((block) => {
        const startMinutes = timeToMinutes(block.time);
        const durationMinutes = block.duration || slotMinutes;

        if (startMinutes < openMinutes || startMinutes >= closeMinutes) {
          return;
        }

        const startKey = minutesToTime(startMinutes);
        const startIndex = slotIndexByTime[startKey];
        if (startIndex === undefined) {
          return;
        }
        const rowStart = startIndex + 3;
        const rawSpan = Math.ceil(durationMinutes / slotMinutes);
        const maxSpan = slotCount - startIndex;
        const span = Math.max(1, Math.min(rawSpan, maxSpan));

        items.push({
          id: `block-${block.id}`,
          sourceId: block.id,
          date: dateKey,
          time: block.time,
          dayIndex,
          startRow: rowStart,
          span,
          title: "Blokada",
          subtitle: block.note || `${block.duration} min`,
          duration: block.duration,
          note: block.note,
          type: "block",
        });
      });
    });

    return items;
  }, [
    weekDays,
    appointmentsByDate,
    blocksByDate,
    open,
    close,
    slotMinutes,
    slotCount,
    slotIndexByTime,
    serviceColorLookup,
  ]);

  const busySlots = useMemo(() => {
    const map = new Set<string>();
    scheduleItems.forEach((item) => {
      for (let row = item.startRow; row < item.startRow + item.span; row += 1) {
        map.add(`${item.dayIndex}-${row}`);
      }
    });
    return map;
  }, [scheduleItems]);

  const selectedSlotKey = selectedSlot ? `${selectedSlot.date}-${selectedSlot.time}` : null;

  const fetchAppointments = async (date: string) => {
    if (!apiBaseUrl || !adminKey) {
      return [];
    }

    const dateObj = new Date(`${date}T00:00:00`);
    if (!isWorkingDay(dateObj)) {
      return [];
    }

    const response = await fetch(
      `${apiBaseUrl}/appointments.php?date=${encodeURIComponent(date)}`,
      {
        headers: {
          "X-Admin-Key": adminKey,
        },
      }
    );
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data?.message || "Ne mogu da preuzmem termine.");
    }

    const items = Array.isArray(data.appointments) ? data.appointments : [];
    items.sort((a: Appointment, b: Appointment) => a.time.localeCompare(b.time));
    return items;
  };

  const fetchBlocks = async (date: string) => {
    if (!apiBaseUrl || !adminKey) {
      return [];
    }

    const dateObj = new Date(`${date}T00:00:00`);
    if (!isWorkingDay(dateObj)) {
      return [];
    }

    const response = await fetch(
      `${apiBaseUrl}/blocks.php?date=${encodeURIComponent(date)}`,
      {
        headers: {
          "X-Admin-Key": adminKey,
        },
      }
    );
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data?.message || t.cannotLoadBlocks);
    }

    const items = Array.isArray(data.blocks) ? data.blocks : [];
    items.sort((a: Block, b: Block) => a.time.localeCompare(b.time));
    return items;
  };

  const fetchClients = async () => {
    if (!apiBaseUrl || !adminKey) {
      return;
    }

    setClientsStatus({ type: "loading" });

    try {
      const response = await fetch(`${apiBaseUrl}/clients.php`, {
        headers: {
          "X-Admin-Key": adminKey,
        },
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || "Ne mogu da preuzmem klijente.");
      }

      const items = Array.isArray(data.clients) ? data.clients : [];
      setClients(items);
      setClientsStatus({ type: "success" });
    } catch (error) {
      const message = error instanceof Error ? error.message : t.genericError;
      setClientsStatus({ type: "error", message });
    }
  };
  const fetchServiceItems = async () => {
    if (!apiBaseUrl || !adminKey) {
      return;
    }

    try {
      const items = await fetchServices(apiBaseUrl, {
        adminKey,
        includeInactive: true,
      });
      setServiceItems(items);
      if (items.length > 0) {
        setAppointmentForm((prev) => {
          if (items.some((service) => service.id === prev.serviceId)) {
            return prev;
          }
          return { ...prev, serviceId: items[0].id };
        });
      }
    } catch (error) {
      setServiceItems(fallbackServices);
    }
  };

  const refreshData = async (dates: string[]) => {
    if (!apiBaseUrl) {
      setStatus({
        type: "error",
        message: t.apiMissing,
      });
      return;
    }

    if (!adminKey) {
      setStatus({
        type: "error",
        message: t.adminMissing,
      });
      return;
    }

    setStatus({ type: "loading" });

    try {
      const appointmentEntries = await Promise.all(
        dates.map(async (date) => [date, await fetchAppointments(date)] as const)
      );
      const blockEntries = await Promise.all(
        dates.map(async (date) => [date, await fetchBlocks(date)] as const)
      );

      setAppointmentsByDate(
        Object.fromEntries(appointmentEntries) as Record<string, Appointment[]>
      );
      setBlocksByDate(Object.fromEntries(blockEntries) as Record<string, Block[]>);
      setStatus({ type: "success", message: t.calendarRefreshed });
    } catch (error) {
      const message = error instanceof Error ? error.message : t.genericError;
      setStatus({ type: "error", message });
    }
  };

  useEffect(() => {
    if (!selectedDate) {
      return;
    }

    setBlockForm((prev) => ({ ...prev, date: selectedDate }));
    setAppointmentForm((prev) => ({ ...prev, date: selectedDate }));
  }, [selectedDate]);

  useEffect(() => {
    if (selectedSlot && selectedSlot.date !== selectedDate) {
      setSelectedSlot(null);
    }
  }, [selectedDate, selectedSlot]);

  useEffect(() => {
    const [year, month] = selectedDate.split("-").map((part) => Number(part));
    if (!year || !month) {
      return;
    }

    setCalendarMonth(new Date(year, month - 1, 1));
  }, [selectedDate]);

  useEffect(() => {
    fetchClients();
  }, []);

  useEffect(() => {
    return () => {
      if (swipeAnimationTimeout.current) {
        window.clearTimeout(swipeAnimationTimeout.current);
      }
    };
  }, []);

  useEffect(() => {
    if (weekDateStrings.length === 0) {
      return;
    }

    refreshData(weekDateStrings);
  }, [weekDateStrings]);

  const normalizeToWorkingDay = (value: string) => {
    const date = new Date(`${value}T00:00:00`);
    if (Number.isNaN(date.getTime())) {
      return value;
    }
    return isWorkingDay(date) ? value : formatDate(getNextWorkingDay(date));
  };

  const resolveServiceId = (appointment: Appointment) => {
    if (appointment.serviceId) {
      return appointment.serviceId;
    }

    const match = serviceItems.find((service) => service.name === appointment.serviceName);
    return match?.id ?? "";
  };

  const resolveClientId = (appointment: Appointment) => {
    if (clients.length === 0) {
      return "";
    }

    const email = (appointment.email || "").trim().toLowerCase();
    const phone = normalizePhoneValue(appointment.phone || "");
    const name = (appointment.clientName || "").trim().toLowerCase();

    const match = clients.find((client) => {
      if (email && client.email && client.email.toLowerCase() === email) {
        return true;
      }
      const clientPhone = normalizePhoneValue(client.phone || "");
      if (phone && clientPhone && clientPhone === phone) {
        return true;
      }
      if (name && client.name && client.name.trim().toLowerCase() === name) {
        return true;
      }
      return false;
    });

    return match?.id ?? "";
  };

  const handleClientPick = (client: Client | null) => {
    if (!client) {
      setSelectedClientId("");
      return;
    }

    setSelectedClientId(client.id);
    setClientSearch(client.name || "");
    setAppointmentForm((prev) => ({
      ...prev,
      clientName: client.name || "",
      phone: client.phone || "",
      email: client.email || "",
    }));
  };

  const handleOpenAppointmentModal = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setAppointmentActionStatus({ type: "idle" });
  };

  const handleCloseAppointmentModal = () => {
    setSelectedAppointment(null);
    setAppointmentActionStatus({ type: "idle" });
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

    if (deltaX < 0 && canGoNext) {
      setWeekTransition("next");
      setSelectedDate(formatDate(addDays(weekStart, 7)));
    } else if (deltaX > 0 && canGoPrev) {
      setWeekTransition("prev");
      setSelectedDate(formatDate(addDays(weekStart, -7)));
    }

    if (swipeAnimationTimeout.current) {
      window.clearTimeout(swipeAnimationTimeout.current);
    }
    swipeAnimationTimeout.current = window.setTimeout(() => {
      setWeekTransition(null);
    }, 240);
  };

  const handleBlockChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;

    if (name === "date") {
      const normalized = normalizeToWorkingDay(value);
      if (normalized !== value) {
        setStatus({
          type: "error",
          message: "Vikendom ne radimo. Izabran je prvi radni dan.",
        });
      }
      setBlockForm((prev) => ({
        ...prev,
        date: normalized,
      }));
      setSelectedDate(normalized);
      return;
    }

    setBlockForm((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (name === "time") {
      setSelectedSlot({ date: blockForm.date, time: value });
    }
  };

  const handleAppointmentChange = (
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = event.target;

    if (name === "date") {
      const normalized = normalizeToWorkingDay(value);
      if (normalized !== value) {
        setAppointmentStatus({
          type: "error",
          message: "Vikendom ne radimo. Izabran je prvi radni dan.",
        });
      }
      setAppointmentForm((prev) => ({
        ...prev,
        date: normalized,
      }));
      setSelectedDate(normalized);
      if (appointmentForm.time) {
        setSelectedSlot({ date: normalized, time: appointmentForm.time });
      }
      return;
    }

    if (name === "time") {
      setSelectedSlot({ date: appointmentForm.date, time: value });
    }

    if (name === "clientName" || name === "phone" || name === "email") {
      setSelectedClientId("");
    }

    setAppointmentForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSlotSelect = (date: string, time: string) => {
    const dateObj = new Date(`${date}T00:00:00`);
    if (!isWorkingDay(dateObj)) {
      return;
    }

    setEditingBlockId(null);
    setEditingAppointment(null);
    setSelectedClientId("");
    setClientSearch("");
    setSlotAction("appointment");
    setAppointmentStatus({ type: "idle" });
    setIsSlotModalOpen(true);
    setSelectedSlot({ date, time });
    setSelectedDate(date);
    setBlockForm((prev) => ({
      ...prev,
      date,
      time,
      duration: prev.duration || String(slotMinutes),
    }));
    setAppointmentForm((prev) => ({
      ...prev,
      date,
      time,
    }));
  };

  const handleEditBlock = (block: Block) => {
    setSlotAction("block");
    setIsSlotModalOpen(true);
    setEditingBlockId(block.id);
    setEditingAppointment(null);
    setSelectedSlot({ date: block.date, time: block.time });
    setSelectedDate(block.date);
    setBlockForm({
      date: block.date,
      time: block.time,
      duration: String(block.duration),
      note: block.note || "",
    });
  };

  const handleCancelEdit = () => {
    setEditingBlockId(null);
    setSelectedSlot(null);
    setIsSlotModalOpen(false);
    setBlockForm((prev) => ({
      ...prev,
      time: "",
      duration: "20",
      note: "",
    }));
  };

  const handleEditAppointment = (appointment: Appointment) => {
    const resolvedServiceId = resolveServiceId(appointment);
    const normalizedTime = normalizeTimeInput(appointment.time);
    const resolvedClientId = resolveClientId(appointment);

    setEditingBlockId(null);
    setEditingAppointment(appointment);
    setSlotAction("appointment");
    setAppointmentStatus({ type: "idle" });
    setIsSlotModalOpen(true);
    setSelectedClientId(resolvedClientId);
    setClientSearch(appointment.clientName ?? "");
    setSelectedSlot({ date: appointment.date, time: normalizedTime });
    setSelectedDate(appointment.date);
    setAppointmentForm({
      date: appointment.date,
      time: normalizedTime,
      serviceId: resolvedServiceId || serviceItems[0]?.id || fallbackServices[0]?.id || "",
      clientName: appointment.clientName ?? "",
      phone: appointment.phone ?? "",
      email: appointment.email ?? "",
      notes: appointment.notes ?? "",
    });
    setAppointmentActionStatus({ type: "idle" });
    setSelectedAppointment(null);
  };

  const handleDeleteAppointment = async (appointment: Appointment) => {
    if (!apiBaseUrl || !adminKey) {
      return;
    }

    const confirmed = window.confirm(t.confirmDeleteAppointment);
    if (!confirmed) {
      return;
    }

    setAppointmentActionStatus({ type: "loading" });

    try {
      const response = await fetch(`${apiBaseUrl}/appointments.php`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Key": adminKey,
        },
        body: JSON.stringify({
          adminAction: "delete",
          id: appointment.id,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || t.cannotDeleteAppointment);
      }

      setAppointmentsByDate((prev) => {
        const next = { ...prev };
        const list = next[appointment.date] ?? [];
        next[appointment.date] = list.filter((item) => item.id !== appointment.id);
        return next;
      });

      setSelectedAppointment(null);
      setEditingAppointment(null);
      setAppointmentActionStatus({ type: "success", message: t.appointmentDeleted });
    } catch (error) {
      const message = error instanceof Error ? error.message : t.genericError;
      setAppointmentActionStatus({ type: "error", message });
    }
  };

  const handleUpdateAppointmentStatus = async (
    appointment: Appointment,
    nextStatus: string
  ) => {
    if (appointment.status === nextStatus) {
      return;
    }

    if (!apiBaseUrl || !adminKey) {
      return;
    }

    setAppointmentActionStatus({ type: "loading" });

    try {
      const response = await fetch(`${apiBaseUrl}/appointments.php`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Key": adminKey,
        },
        body: JSON.stringify({
          adminAction: "update_status",
          id: appointment.id,
          status: nextStatus,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || t.cannotSaveStatus);
      }

      setAppointmentsByDate((prev) => {
        const next = { ...prev };
        const list = next[appointment.date] ?? [];
        next[appointment.date] = list.map((item) =>
          item.id === appointment.id ? { ...item, status: nextStatus } : item
        );
        return next;
      });

      setSelectedAppointment((prev) =>
        prev ? { ...prev, status: nextStatus } : prev
      );
      setEditingAppointment((prev) =>
        prev ? { ...prev, status: nextStatus } : prev
      );
      setAppointmentActionStatus({ type: "success", message: t.statusSaved });
    } catch (error) {
      const message = error instanceof Error ? error.message : t.genericError;
      setAppointmentActionStatus({ type: "error", message });
    }
  };

  const handleCreateBlock = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!apiBaseUrl || !adminKey) {
      return;
    }

    const blockDate = new Date(`${blockForm.date}T00:00:00`);
    if (!isWorkingDay(blockDate)) {
      setStatus({
        type: "error",
        message: "Vikendom ne radimo. Izaberi radni dan.",
      });
      return;
    }

    setStatus({ type: "loading" });

    try {
      const createResponse = await fetch(`${apiBaseUrl}/blocks.php`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Key": adminKey,
        },
        body: JSON.stringify({
          date: blockForm.date,
          time: blockForm.time,
          duration: Number(blockForm.duration),
          note: blockForm.note.trim(),
        }),
      });
      const data = await createResponse.json();

      if (!createResponse.ok) {
        throw new Error(data?.message || t.cannotSaveBlock);
      }

      if (editingBlockId) {
        await fetch(`${apiBaseUrl}/blocks.php?id=${editingBlockId}`, {
          method: "DELETE",
          headers: {
            "X-Admin-Key": adminKey,
          },
        });
      }

      setEditingBlockId(null);
      setSelectedSlot(null);
      setIsSlotModalOpen(false);
      setBlockForm((prev) => ({ ...prev, time: "", duration: "20", note: "" }));
      await refreshData(weekDateStrings);
    } catch (error) {
      const message = error instanceof Error ? error.message : t.genericError;
      setStatus({ type: "error", message });
    }
  };

  const handleSaveAppointment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!apiBaseUrl) {
      setAppointmentStatus({
        type: "error",
        message: t.apiMissing,
      });
      return;
    }

    if (!adminKey) {
      setAppointmentStatus({
        type: "error",
        message: t.adminMissing,
      });
      return;
    }

    const resolvedServiceId =
      selectedService?.id || editingAppointment?.serviceId || appointmentForm.serviceId;
    const resolvedServiceName =
      selectedService?.name || editingAppointment?.serviceName || "";
    const resolvedDuration =
      selectedService?.duration || editingAppointment?.duration || "";
    const resolvedPrice =
      selectedService?.price ?? editingAppointment?.price ?? 0;

    if (!resolvedServiceId || !resolvedServiceName || !resolvedDuration) {
      setAppointmentStatus({
        type: "error",
        message: "Izaberi uslugu pre zakazivanja.",
      });
      return;
    }

    if (!appointmentForm.clientName.trim() || !appointmentForm.phone.trim()) {
      setAppointmentStatus({
        type: "error",
        message: "Unesi ime klijenta i telefon.",
      });
      return;
    }

    if (!appointmentForm.date || !appointmentForm.time) {
      setAppointmentStatus({
        type: "error",
        message: "Izaberi datum i vreme.",
      });
      return;
    }

    const bookingDate = new Date(`${appointmentForm.date}T00:00:00`);
    if (!isWorkingDay(bookingDate)) {
      setAppointmentStatus({
        type: "error",
        message: "Vikendom ne radimo. Izaberi radni dan.",
      });
      return;
    }

    setAppointmentStatus({ type: "loading" });

    try {
      const payload = {
        clientName: appointmentForm.clientName.trim(),
        phone: appointmentForm.phone.trim(),
        email: appointmentForm.email.trim(),
        serviceId: resolvedServiceId,
        serviceName: resolvedServiceName,
        duration: resolvedDuration,
        price: resolvedPrice,
        date: appointmentForm.date,
        time: normalizeTimeInput(appointmentForm.time),
        notes: appointmentForm.notes.trim(),
        status: editingAppointment?.status ?? "pending",
        source: editingAppointment?.source ?? "admin",
      };

      const response = await fetch(`${apiBaseUrl}/appointments.php`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Key": adminKey,
        },
        body: JSON.stringify({
          adminAction: editingAppointment ? "update" : "create",
          id: editingAppointment?.id,
          ...payload,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || t.cannotSaveAppointment);
      }

      setAppointmentStatus({
        type: "success",
        message: editingAppointment ? t.appointmentUpdated : t.appointmentSaved,
      });
      setAppointmentForm((prev) => ({
        ...prev,
        clientName: "",
        phone: "",
        email: "",
        notes: "",
      }));
      setEditingAppointment(null);
      setSelectedSlot(null);
      setIsSlotModalOpen(false);
      await refreshData(weekDateStrings);
    } catch (error) {
      const message = error instanceof Error ? error.message : t.genericError;
      setAppointmentStatus({ type: "error", message });
    }
  };

  const handleDeleteBlock = async (id: string) => {
    if (!apiBaseUrl || !adminKey) {
      return;
    }

    setStatus({ type: "loading" });

    try {
      const response = await fetch(`${apiBaseUrl}/blocks.php?id=${id}`, {
        method: "DELETE",
        headers: {
          "X-Admin-Key": adminKey,
        },
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || t.cannotDeleteBlock);
      }

      if (editingBlockId === id) {
        handleCancelEdit();
      }

      await refreshData(weekDateStrings);
    } catch (error) {
      const message = error instanceof Error ? error.message : t.genericError;
      setStatus({ type: "error", message });
    }
  };

  const handleCloseModal = () => {
    setIsSlotModalOpen(false);
    setEditingBlockId(null);
    setEditingAppointment(null);
    setSelectedSlot(null);
    setAppointmentStatus({ type: "idle" });
  };

  const getItemClass = (item: ScheduleItem) => {
    if (item.type === "block") {
      return "calendar-item calendar-item--block is-editable";
    }

    const baseClass = "calendar-item calendar-item--appointment is-editable";
    return item.serviceColor ? `${baseClass} has-service-color` : baseClass;
  };

  return (
    <AdminShell
      title="Kalendar"
      subtitle="Upravljanje dostupnoscu termina"
      hideHeader
      fullWidth
    >
      <div className="admin-grid">
          <div className="calendar-layout">
            <div className="calendar-main">
              <div className="calendar-schedule">
                <div
                  className="calendar-schedule__scroll"
                  onTouchStart={handleWeekSwipeStart}
                  onTouchEnd={handleWeekSwipeEnd}
                >
                <div className="calendar-schedule__times" style={timeStyles}>
                  <div className="calendar-time-header" />
                  <div className="calendar-time-gap" />
                  {timeSlots.map((time, rowIndex) => (
                    <div
                      key={time}
                      className={`calendar-time ${breakBoundaryRows.has(rowIndex) ? "has-break-before" : ""}`}
                    >
                      {time}
                    </div>
                  ))}
                </div>

                <div
                  className={`calendar-schedule__grid${
                    weekTransition ? ` is-swipe-${weekTransition}` : ""
                  }`}
                  style={gridStyles}
                >
                  {weekDays.map((day, index) => {
                    const dateKey = formatDate(day);
                    const isActive = dateKey === selectedDate;
                    const isToday = dateKey === formatDate(today);
                    const isWorkday = isWorkingDay(day);
                    const inRange = day >= today && day <= lastDay && isWorkday;
                    return (
                      <button
                        key={dateKey}
                        type="button"
                        className={`calendar-day-header ${isActive ? "is-active" : ""} ${
                          isToday ? "is-today" : ""
                        } ${isWorkday ? "" : "is-closed"}`}
                        style={{ gridColumn: index + 1, gridRow: 1 }}
                        disabled={!inRange}
                        onClick={() => setSelectedDate(dateKey)}
                      >
                        <span className="calendar-day-number">{day.getDate()}</span>
                        <span className="calendar-day-label">
                          {formatWeekday(day, locale).toUpperCase()}
                        </span>
                      </button>
                    );
                  })}
                  {weekDays.map((day, index) => (
                    <div
                      key={`gap-${formatDate(day)}`}
                      className="calendar-header-gap"
                      style={{ gridColumn: index + 1, gridRow: 2 }}
                    />
                  ))}

                  {timeSlots.map((slot, rowIndex) =>
                    weekDays.map((day, colIndex) => {
                      const dateKey = formatDate(day);
                      const rowKey = rowIndex + 3;
                      const isWorkday = isWorkingDay(day);
                      const isBusy = busySlots.has(`${colIndex}-${rowKey}`);
                      const isSelected =
                        selectedSlotKey === `${dateKey}-${slot}` && isWorkday;

                      return (
                        <button
                          key={`${slot}-${colIndex}`}
                          type="button"
                          className={`calendar-slot ${isWorkday ? "" : "is-closed"} ${
                            isBusy ? "is-busy" : ""
                          } ${isSelected ? "is-selected" : ""} ${
                            breakBoundaryRows.has(rowIndex) ? "has-break-before" : ""
                          }`}
                          style={{ gridColumn: colIndex + 1, gridRow: rowIndex + 3 }}
                          disabled={!isWorkday || isBusy}
                          onClick={() => handleSlotSelect(dateKey, slot)}
                        />
                      );
                    })
                  )}

                  {scheduleItems.map((item) => (
                    <div
                      key={item.id}
                      className={getItemClass(item)}
                      style={
                        {
                          gridColumn: item.dayIndex + 1,
                          gridRow: `${item.startRow} / span ${item.span}`,
                          ...(item.serviceColor
                            ? { ["--service-color"]: item.serviceColor }
                            : {}),
                        } as CSSProperties
                      }
                      onClick={() => {
                        if (item.type === "block" && item.sourceId) {
                          handleEditBlock({
                            id: item.sourceId,
                            date: item.date,
                            time: item.time,
                            duration: item.duration || slotMinutes,
                            note: item.note,
                          });
                          return;
                        }

                        if (item.type === "appointment" && item.appointment) {
                          handleOpenAppointmentModal(item.appointment);
                        }
                      }}
                    >
                      {item.type === "appointment" && item.status === "confirmed" && (
                        <span className="calendar-item__badge" aria-label="Potvrdjen">
                          ✓
                        </span>
                      )}
                      <strong>{item.title}</strong>
                      {item.subtitle && <span>{item.subtitle}</span>}
                    </div>
                  ))}
                  </div>
                </div>
              </div>

              {status.type === "error" && status.message && (
                <div className="form-status error">{status.message}</div>
              )}
          </div>
        </div>
      </div>

      {isSlotModalOpen && (
        <div className="calendar-modal" role="dialog" aria-modal="true">
          <div className="calendar-modal__backdrop" onClick={handleCloseModal} />
          <div className="calendar-modal__card">
            <div className="calendar-modal__header">
              <div>
                <strong>
                  {slotAction === "block"
                    ? editingBlockId
                      ? "Izmeni blokadu"
                      : "Blokiraj termin"
                    : isEditingAppointment
                    ? "Izmeni termin"
                    : "Rezervisi termin"}
                </strong>
                {selectedSlot && (
                  <span>
                    {selectedSlot.date} | {selectedSlot.time}
                  </span>
                )}
              </div>
              <button
                className="calendar-modal__close"
                type="button"
                onClick={handleCloseModal}
                aria-label="Zatvori"
              >
                âœ•
              </button>
            </div>

            <div className="calendar-modal__tabs">
              <button
                className={`button small ${slotAction === "appointment" ? "" : "outline"}`}
                type="button"
                onClick={() => {
                  setSlotAction("appointment");
                  setEditingBlockId(null);
                }}
              >
                Rezervisi
              </button>
              <button
                className={`button small ${slotAction === "block" ? "" : "outline"}`}
                type="button"
                disabled={isEditingAppointment}
                onClick={() => setSlotAction("block")}
              >
                Blokiraj
              </button>
            </div>

            {slotAction === "appointment" ? (
              <form className="calendar-form" onSubmit={handleSaveAppointment}>
                <div className="form-row">
                  <label htmlFor="appointment-date">Datum</label>
                  <input
                    id="appointment-date"
                    name="date"
                    className="input"
                    type="date"
                    value={appointmentForm.date}
                    min={formatDate(firstWorkingDay)}
                    max={formatDate(lastDay)}
                    onChange={handleAppointmentChange}
                    required
                  />
                </div>
                <div className="form-row">
                  <label htmlFor="appointment-time">Vreme</label>
                  <input
                    id="appointment-time"
                    name="time"
                    className="input"
                    type="time"
                    value={appointmentForm.time}
                    onChange={handleAppointmentChange}
                    required
                  />
                </div>
                <div className="form-row">
                  <label htmlFor="appointment-service">Usluga</label>
                  <select
                    id="appointment-service"
                    name="serviceId"
                    className="select"
                    value={appointmentForm.serviceId}
                    onChange={handleAppointmentChange}
                    required
                  >
                    <option value="" disabled>
                      Izaberi uslugu
                    </option>
                    {hasUnknownService && (
                      <option value={appointmentForm.serviceId}>
                        {editingAppointment?.serviceName || "Nepoznata usluga"}
                      </option>
                    )}
                    {serviceItems.map((service) => (
                      <option key={service.id} value={service.id}>
                        {service.name} ({service.duration})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-row">
                  <label htmlFor="appointment-client-search">Pretrazi klijente</label>
                  <div className="client-search">
                    <input
                      id="appointment-client-search"
                      className="input"
                      type="search"
                      value={clientSearch}
                      onChange={(event) => {
                        setClientSearch(event.target.value);
                        setSelectedClientId("");
                      }}
                      placeholder="Upisi ime ili telefon"
                      autoComplete="off"
                    />
                    {clientSearch.trim() !== "" && (
                      <div className="client-suggestions" role="listbox">
                        {clientsStatus.type === "loading" && (
                          <div className="client-suggestion client-suggestion--empty">
                            Ucitavanje...
                          </div>
                        )}
                        {clientsStatus.type !== "loading" && filteredClients.length === 0 && (
                          <div className="client-suggestion client-suggestion--empty">
                            Nema rezultata
                          </div>
                        )}
                        {filteredClients.map((client) => (
                          <button
                            key={client.id}
                            type="button"
                            className={`client-suggestion ${
                              client.id === selectedClientId ? "is-active" : ""
                            }`}
                            onClick={() => handleClientPick(client)}
                          >
                            {client.name} {client.phone ? `(${client.phone})` : ""}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="form-row">
                  <label htmlFor="appointment-client">Ime klijenta</label>
                  <input
                    id="appointment-client"
                    name="clientName"
                    className="input"
                    value={appointmentForm.clientName}
                    onChange={handleAppointmentChange}
                    required
                  />
                </div>
                <div className="form-row">
                  <label htmlFor="appointment-phone">Telefon</label>
                  <input
                    id="appointment-phone"
                    name="phone"
                    className="input"
                    type="tel"
                    inputMode="tel"
                    value={appointmentForm.phone}
                    onChange={handleAppointmentChange}
                    required
                  />
                </div>
                <div className="form-row">
                  <label htmlFor="appointment-email">Email (opciono)</label>
                  <input
                    id="appointment-email"
                    name="email"
                    className="input"
                    type="email"
                    value={appointmentForm.email}
                    onChange={handleAppointmentChange}
                  />
                </div>
                <div className="form-row">
                  <label htmlFor="appointment-notes">Napomena</label>
                  <input
                    id="appointment-notes"
                    name="notes"
                    className="input"
                    value={appointmentForm.notes}
                    onChange={handleAppointmentChange}
                  />
                </div>
                {appointmentStatus.type !== "idle" && appointmentStatus.message && (
                  <div className={`form-status ${appointmentStatus.type}`}>
                    {appointmentStatus.message}
                  </div>
                )}
                <div className="calendar-form__actions">
                  <button className="button" type="submit">
                    {isEditingAppointment ? "Sacuvaj izmene" : "Sacuvaj termin"}
                  </button>
                </div>
              </form>
            ) : (
              <form className="calendar-form" onSubmit={handleCreateBlock}>
                <h4>{editingBlockId ? "Izmeni blokadu" : "Dodaj blokadu"}</h4>
                <div className="form-row">
                  <label htmlFor="date">Datum</label>
                  <input
                    id="date"
                    name="date"
                    className="input"
                    type="date"
                    value={blockForm.date}
                    min={formatDate(firstWorkingDay)}
                    max={formatDate(lastDay)}
                    onChange={handleBlockChange}
                    required
                  />
                </div>
                <div className="form-row">
                  <label htmlFor="time">Vreme</label>
                  <input
                    id="time"
                    name="time"
                    className="input"
                    type="time"
                    value={blockForm.time}
                    onChange={handleBlockChange}
                    required
                  />
                </div>
                <div className="form-row">
                  <label htmlFor="duration">Trajanje (min)</label>
                  <input
                    id="duration"
                    name="duration"
                    className="input"
                    type="number"
                    min="10"
                    step="10"
                    value={blockForm.duration}
                    onChange={handleBlockChange}
                    required
                  />
                </div>
                <div className="form-row">
                  <label htmlFor="note">Napomena</label>
                  <input
                    id="note"
                    name="note"
                    className="input"
                    value={blockForm.note}
                    onChange={handleBlockChange}
                  />
                </div>
                <div className="calendar-form__actions">
                  {editingBlockId && (
                    <button
                      className="button outline"
                      type="button"
                      onClick={handleCancelEdit}
                    >
                      Otkazi izmenu
                    </button>
                  )}
                  <button className="button" type="submit">
                    {editingBlockId ? "Sacuvaj izmene" : "Sacuvaj blokadu"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {selectedAppointment && (
        <div className="calendar-modal" role="dialog" aria-modal="true">
          <div className="calendar-modal__backdrop" onClick={handleCloseAppointmentModal} />
          <div className="calendar-modal__card">
            <div className="calendar-modal__header">
              <div>
                <strong className="calendar-appointment__client">
                  {selectedAppointment.clientName}
                </strong>
                <span>
                  {selectedAppointment.date} |{" "}
                  {normalizeTimeInput(selectedAppointment.time)}
                </span>
              </div>
              <button
                className="calendar-modal__close"
                type="button"
                onClick={handleCloseAppointmentModal}
                aria-label="Zatvori"
              >
                x
              </button>
            </div>

            <div className="calendar-appointment__meta">
              <div className={`status-pill ${selectedAppointment.status || "pending"}`}>
                {statusLabels[selectedAppointment.status || "pending"] ||
                  selectedAppointment.status}
              </div>
              <strong>{selectedAppointment.serviceName}</strong>
              {selectedAppointment.phone && (
                <span>Telefon: {selectedAppointment.phone}</span>
              )}
              {selectedAppointment.email && (
                <span>Email: {selectedAppointment.email}</span>
              )}
              {selectedAppointment.notes && (
                <span>Napomena: {selectedAppointment.notes}</span>
              )}
              {selectedAppointment.source && (
                <span>
                  Izvor:{" "}
                  {sourceLabels[selectedAppointment.source] ||
                    selectedAppointment.source}
                </span>
              )}
              {selectedAppointment.createdAt && (
                <span>Kreirano: {selectedAppointment.createdAt}</span>
              )}
            </div>

            {appointmentActionStatus.type !== "idle" &&
              appointmentActionStatus.message && (
                <div className={`form-status ${appointmentActionStatus.type}`}>
                  {appointmentActionStatus.message}
                </div>
              )}

            <div className="calendar-appointment__actions">
              <button
                className="button outline"
                type="button"
                onClick={() => handleEditAppointment(selectedAppointment)}
                disabled={appointmentActionStatus.type === "loading"}
              >
                Izmeni
              </button>
              <button
                className="button outline"
                type="button"
                onClick={() => handleDeleteAppointment(selectedAppointment)}
                disabled={appointmentActionStatus.type === "loading"}
              >
                Obrisi
              </button>
              {statusOptions.map((option) => (
                <button
                  key={option.value}
                  className={`button small outline ${
                    (selectedAppointment.status || "pending") === option.value
                      ? "is-active"
                      : ""
                  }`}
                  type="button"
                  onClick={() =>
                    handleUpdateAppointmentStatus(selectedAppointment, option.value)
                  }
                  disabled={appointmentActionStatus.type === "loading"}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}






