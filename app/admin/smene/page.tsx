"use client";

import { useEffect, useMemo, useState } from "react";

import AdminShell from "@/components/srdjan/admin/AdminShell";
import { formatIsoDateToEuropean } from "@/lib/date";

type Worker = {
  id: string;
  name: string;
  location_id: string;
  is_active?: boolean;
};

type ShiftType = "morning" | "afternoon" | "off";

const SHIFT_LABELS: Record<ShiftType, string> = {
  morning: "Prepodne",
  afternoon: "Popodne",
  off: "Slobodan",
};

const toDateInput = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const mondayOfWeek = (base: Date) => {
  const date = new Date(base.getFullYear(), base.getMonth(), base.getDate());
  const day = date.getDay();
  const offset = day === 0 ? -6 : 1 - day;
  return addDays(date, offset);
};

const nextMonday = () => addDays(mondayOfWeek(new Date()), 7);

const parseShiftValue = (value: string): ShiftType =>
  value === "morning" || value === "afternoon" ? value : "off";

const dateRange = (from: string, days: number) => {
  const start = new Date(`${from}T00:00:00`);
  const items: string[] = [];
  for (let index = 0; index < days; index += 1) {
    items.push(toDateInput(addDays(start, index)));
  }
  return items;
};

const weekDays = ["Ponedeljak", "Utorak", "Sreda", "Cetvrtak", "Petak", "Subota", "Nedelja"];

export default function AdminShiftsPage() {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [locationId, setLocationId] = useState("");
  const [weekStart, setWeekStart] = useState(toDateInput(nextMonday()));
  const [shiftMap, setShiftMap] = useState<Record<string, ShiftType>>({});
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [swapping, setSwapping] = useState(false);
  const [swapForm, setSwapForm] = useState({
    date: toDateInput(nextMonday()),
    workerAId: "",
    workerBId: "",
  });

  const weekDates = useMemo(() => dateRange(weekStart, 7), [weekStart]);

  const loadWorkers = async () => {
    const response = await fetch("/api/public/bootstrap", { cache: "no-store" });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || "Ne mogu da ucitam radnike.");
    }

    const list = Array.isArray(payload.workers) ? payload.workers : [];
    const activeWorkers = list.filter((worker: Worker) => worker.is_active !== false);
    setWorkers(activeWorkers);
    const defaultLocationId = payload.defaultLocationId || payload.locations?.[0]?.id || "";
    setLocationId(defaultLocationId);
    setSwapForm((prev) => ({
      ...prev,
      workerAId: prev.workerAId || activeWorkers[0]?.id || "",
      workerBId: prev.workerBId || activeWorkers[1]?.id || activeWorkers[0]?.id || "",
    }));
    return { activeWorkers, defaultLocationId };
  };

  const loadWeekShifts = async (
    targetLocationId: string,
    targetWorkers: Worker[],
    targetWeekStart: string
  ) => {
    if (!targetLocationId || targetWorkers.length === 0) {
      setShiftMap({});
      return;
    }

    const dates = dateRange(targetWeekStart, 7);
    const from = dates[0];
    const to = dates[dates.length - 1];

    const entries = await Promise.all(
      targetWorkers.map(async (worker) => {
        const response = await fetch(
          `/api/public/worker-shifts?locationId=${encodeURIComponent(
            targetLocationId
          )}&workerId=${encodeURIComponent(worker.id)}&from=${encodeURIComponent(
            from
          )}&to=${encodeURIComponent(to)}`,
          { cache: "no-store" }
        );
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload.error || "Ne mogu da ucitam smene.");
        }
        return { workerId: worker.id, shifts: Array.isArray(payload.shifts) ? payload.shifts : [] };
      })
    );

    const nextMap: Record<string, ShiftType> = {};
    entries.forEach((entry) => {
      entry.shifts.forEach((shift: { date: string; shift_type: string }) => {
        const key = `${entry.workerId}|${shift.date}`;
        nextMap[key] = parseShiftValue(shift.shift_type);
      });
    });
    setShiftMap(nextMap);
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setStatus("");
      try {
        const { activeWorkers, defaultLocationId } = await loadWorkers();
        await loadWeekShifts(defaultLocationId, activeWorkers, weekStart);
      } catch (error) {
        setStatus(error instanceof Error ? error.message : "Greska pri ucitavanju.");
      } finally {
        setLoading(false);
      }
    };

    load().catch(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!locationId || workers.length === 0) {
      return;
    }
    loadWeekShifts(locationId, workers, weekStart).catch((error) =>
      setStatus(error instanceof Error ? error.message : "Ne mogu da ucitam smene.")
    );
  }, [locationId, workers, weekStart]);

  const setShift = (workerId: string, date: string, shiftType: ShiftType) => {
    const key = `${workerId}|${date}`;
    setShiftMap((prev) => ({ ...prev, [key]: shiftType }));
  };

  const saveWeek = async () => {
    if (!locationId || workers.length === 0) {
      setStatus("Nema aktivnih radnika za planiranje.");
      return;
    }

    setSaving(true);
    setStatus("");
    try {
      const payload = workers.flatMap((worker) =>
        weekDates.map((date) => {
          const key = `${worker.id}|${date}`;
          return {
            workerId: worker.id,
            date,
            shiftType: shiftMap[key] || "off",
          };
        })
      );

      const response = await fetch("/api/admin/shifts/week", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locationId,
          shifts: payload,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Ne mogu da sacuvam smene.");
      }
      setStatus(`Smene su sacuvane. Upisano zapisa: ${data.count}.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Greska pri cuvanju smena.");
    } finally {
      setSaving(false);
    }
  };

  const swapShifts = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!locationId || !swapForm.workerAId || !swapForm.workerBId || !swapForm.date) {
      setStatus("Popuni datum i oba radnika za zamenu.");
      return;
    }

    setSwapping(true);
    setStatus("");
    try {
      const response = await fetch("/api/admin/shifts/swap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locationId,
          date: swapForm.date,
          workerAId: swapForm.workerAId,
          workerBId: swapForm.workerBId,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Zamena smene nije uspela.");
      }
      await loadWeekShifts(locationId, workers, weekStart);
      setStatus("Zamena smene je uspesna.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Greska pri zameni smena.");
    } finally {
      setSwapping(false);
    }
  };

  return (
    <AdminShell title="Smene" subtitle="Nedeljni plan smena i zamena smena">
      <div className="admin-card">
        <h3>Naredna nedelja</h3>
        <div className="form-row">
          <label htmlFor="weekStart">Pocetak nedelje (ponedeljak)</label>
          <input
            id="weekStart"
            className="input"
            type="date"
            value={weekStart}
            onChange={(event) => setWeekStart(event.target.value)}
          />
          <small>Planiraj unapred i sacuvaj smene za svih 7 dana.</small>
        </div>
      </div>

      <div className="admin-card">
        <h3>Plan smena po radniku</h3>
        {loading && <p>Ucitavanje smena...</p>}
        {!loading && workers.length === 0 && <p>Nema aktivnih radnika.</p>}
        {!loading && workers.length > 0 && (
          <div style={{ overflowX: "auto" }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Radnik</th>
                  {weekDates.map((date, index) => (
                    <th key={date}>
                      {weekDays[index]}
                      <br />
                      <small>{formatIsoDateToEuropean(date)}</small>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {workers.map((worker) => (
                  <tr key={worker.id}>
                    <td>
                      <strong>{worker.name}</strong>
                    </td>
                    {weekDates.map((date) => {
                      const key = `${worker.id}|${date}`;
                      const value = shiftMap[key] || "off";
                      return (
                        <td key={key}>
                          <select
                            className="select"
                            value={value}
                            onChange={(event) =>
                              setShift(worker.id, date, parseShiftValue(event.target.value))
                            }
                          >
                            <option value="morning">{SHIFT_LABELS.morning}</option>
                            <option value="afternoon">{SHIFT_LABELS.afternoon}</option>
                            <option value="off">{SHIFT_LABELS.off}</option>
                          </select>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="admin-actions" style={{ marginTop: 12 }}>
          <button className="button" type="button" onClick={saveWeek} disabled={saving || loading}>
            {saving ? "Cuvanje..." : "Sacuvaj smene za nedelju"}
          </button>
        </div>
      </div>

      <div className="admin-card">
        <h3>Zamena smene sa kolegom</h3>
        <form className="form-grid" onSubmit={swapShifts}>
          <div className="form-row">
            <label htmlFor="swapDate">Datum</label>
            <input
              id="swapDate"
              className="input"
              type="date"
              value={swapForm.date}
              onChange={(event) => setSwapForm((prev) => ({ ...prev, date: event.target.value }))}
            />
          </div>
          <div className="form-row">
            <label htmlFor="workerA">Radnik A</label>
            <select
              id="workerA"
              className="select"
              value={swapForm.workerAId}
              onChange={(event) =>
                setSwapForm((prev) => ({ ...prev, workerAId: event.target.value }))
              }
            >
              {workers.map((worker) => (
                <option key={worker.id} value={worker.id}>
                  {worker.name}
                </option>
              ))}
            </select>
          </div>
          <div className="form-row">
            <label htmlFor="workerB">Radnik B</label>
            <select
              id="workerB"
              className="select"
              value={swapForm.workerBId}
              onChange={(event) =>
                setSwapForm((prev) => ({ ...prev, workerBId: event.target.value }))
              }
            >
              {workers.map((worker) => (
                <option key={worker.id} value={worker.id}>
                  {worker.name}
                </option>
              ))}
            </select>
          </div>
          <div className="form-row">
            <button className="button outline" type="submit" disabled={swapping}>
              {swapping ? "Zamena..." : "Zameni smene"}
            </button>
          </div>
        </form>
        <small>
          Zamena radi samo ako oba radnika imaju smenu tog datuma i oba imaju nula aktivnih
          termina za taj dan.
        </small>
      </div>

      {status && <p className="form-status success">{status}</p>}
    </AdminShell>
  );
}
