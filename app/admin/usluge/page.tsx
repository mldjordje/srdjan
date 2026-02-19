"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import AdminShell from "@/components/srdjan/admin/AdminShell";

type AdminMe = {
  id: string;
  username: string;
  role: "owner" | "staff-admin";
  workerId?: string | null;
};

type Worker = { id: string; name: string; location_id: string; is_active: boolean };

type WorkerService = {
  id: string;
  worker_id: string;
  duration_min: number;
  price: number;
  color?: string | null;
  is_active: boolean;
  services?: { id: string; name: string } | null;
  workers?: { id: string; name: string } | null;
};

type ServiceDraft = {
  name: string;
  durationMin: string;
  price: string;
  color: string;
  isActive: boolean;
};

const HEX_COLOR_RE = /^#[0-9A-Fa-f]{6}$/;
const normalizeHexColor = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }
  return HEX_COLOR_RE.test(trimmed) ? trimmed.toUpperCase() : trimmed;
};

const draftFromService = (service: WorkerService): ServiceDraft => ({
  name: service.services?.name || "",
  durationMin: String(service.duration_min || 20),
  price: String(service.price || 0),
  color: normalizeHexColor(service.color || ""),
  isActive: service.is_active !== false,
});

export default function AdminServicesPage() {
  const [admin, setAdmin] = useState<AdminMe | null>(null);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [workerId, setWorkerId] = useState("");
  const [services, setServices] = useState<WorkerService[]>([]);
  const [draftById, setDraftById] = useState<Record<string, ServiceDraft>>({});
  const [loading, setLoading] = useState(true);
  const [statusType, setStatusType] = useState<"success" | "error">("success");
  const [status, setStatus] = useState("");
  const [form, setForm] = useState({
    workerId: "",
    name: "",
    durationMin: "20",
    price: "1000",
    color: "#3C9468",
    isActive: true,
  });

  const setError = (message: string) => {
    setStatusType("error");
    setStatus(message);
  };

  const setSuccess = (message: string) => {
    setStatusType("success");
    setStatus(message);
  };

  const fetchServices = useCallback(
    async (currentAdmin: AdminMe, targetWorkerId: string) => {
      const query =
        currentAdmin.role === "owner" && targetWorkerId
          ? `?workerId=${encodeURIComponent(targetWorkerId)}`
          : "";
      const response = await fetch(`/api/admin/services${query}`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Ne mogu da ucitam usluge.");
      }
      const list = Array.isArray(data.services) ? (data.services as WorkerService[]) : [];
      setServices(list);
      setDraftById((prev) => {
        const next: Record<string, ServiceDraft> = {};
        list.forEach((item) => {
          next[item.id] = prev[item.id] || draftFromService(item);
        });
        return next;
      });
    },
    []
  );

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setStatus("");
      try {
        const [meRes, workersRes] = await Promise.all([
          fetch("/api/admin/me"),
          fetch("/api/admin/workers?includeInactive=1"),
        ]);

        const meData = await meRes.json();
        if (!meRes.ok) {
          throw new Error(meData.error || "Niste prijavljeni.");
        }
        const currentAdmin = meData as AdminMe;
        setAdmin(currentAdmin);

        const workersData = await workersRes.json();
        if (!workersRes.ok) {
          throw new Error(workersData.error || "Ne mogu da ucitam radnike.");
        }
        const workerList = Array.isArray(workersData.workers)
          ? (workersData.workers as Worker[])
          : [];
        setWorkers(workerList);

        const resolvedWorkerId =
          currentAdmin.role === "staff-admin"
            ? (currentAdmin.workerId || "").trim()
            : workerList[0]?.id || "";

        if (currentAdmin.role === "staff-admin" && !resolvedWorkerId) {
          throw new Error("Staff nalog nije povezan sa radnikom. Kontaktiraj owner-a.");
        }

        setWorkerId(resolvedWorkerId);
        setForm((prev) => ({
          ...prev,
          workerId: resolvedWorkerId,
        }));

        await fetchServices(currentAdmin, resolvedWorkerId);
      } catch (error) {
        setError(error instanceof Error ? error.message : "Greska.");
      } finally {
        setLoading(false);
      }
    };

    load().catch(() => {
      setLoading(false);
      setError("Greska pri ucitavanju.");
    });
  }, [fetchServices]);

  useEffect(() => {
    if (!admin || admin.role !== "owner" || !workerId) {
      return;
    }

    fetchServices(admin, workerId).catch((error) => {
      setError(error instanceof Error ? error.message : "Greska.");
    });
  }, [admin, fetchServices, workerId]);

  const isStaff = admin?.role === "staff-admin";
  const activeWorker = workers.find((item) => item.id === workerId) || null;
  const visibleServices = useMemo(
    () => (isStaff ? services : services.filter((service) => service.worker_id === workerId)),
    [isStaff, services, workerId]
  );

  const create = async (event: React.FormEvent) => {
    event.preventDefault();
    setStatus("");
    if (!admin) {
      setError("Niste prijavljeni.");
      return;
    }
    const resolvedWorkerId = isStaff ? workerId : form.workerId;
    if (!resolvedWorkerId) {
      setError("Izaberi radnika.");
      return;
    }

    const response = await fetch("/api/admin/services", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workerId: resolvedWorkerId,
        name: form.name,
        durationMin: Number(form.durationMin),
        price: Number(form.price),
        color: form.color,
        isActive: form.isActive,
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error || "Ne mogu da kreiram uslugu.");
      return;
    }
    setForm((prev) => ({
      ...prev,
      name: "",
      color: "#3C9468",
      isActive: true,
    }));
    await fetchServices(admin, workerId);
    setSuccess("Usluga je sacuvana.");
  };

  const updateDraft = (
    service: WorkerService,
    patch: Partial<ServiceDraft>
  ) => {
    setDraftById((prev) => {
      const current = prev[service.id] || draftFromService(service);
      return {
        ...prev,
        [service.id]: {
          ...current,
          ...patch,
        },
      };
    });
  };

  const saveService = async (service: WorkerService) => {
    if (!admin) {
      setError("Niste prijavljeni.");
      return;
    }

    const draft = draftById[service.id] || draftFromService(service);
    const payload: Record<string, unknown> = {
      workerServiceId: service.id,
      durationMin: Number(draft.durationMin),
      price: Number(draft.price),
      color: draft.color,
      isActive: draft.isActive,
    };
    if (!isStaff) {
      payload.name = draft.name;
    }

    const response = await fetch("/api/admin/services", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error || "Ne mogu da sacuvam izmenu usluge.");
      return;
    }
    await fetchServices(admin, workerId);
    setSuccess("Usluga je azurirana.");
  };

  if (loading) {
    return (
      <AdminShell title="Usluge" subtitle="Ucitavanje usluga...">
        <p>Ucitavanje...</p>
      </AdminShell>
    );
  }

  return (
    <AdminShell
      title="Usluge"
      subtitle={
        isStaff
          ? `Moje usluge (${activeWorker?.name || admin?.username || "staff"})`
          : "Upravljanje uslugama po radniku"
      }
    >
      <div className="admin-card">
        <h3>{isStaff ? "Moje usluge" : "Podmeni po clanu staff-a"}</h3>
        {!isStaff ? (
          <div className="admin-actions">
            {workers.map((worker) => (
              <button
                key={worker.id}
                className={`button outline small ${workerId === worker.id ? "is-active" : ""}`}
                type="button"
                onClick={() => {
                  setWorkerId(worker.id);
                  setForm((prev) => ({ ...prev, workerId: worker.id }));
                }}
              >
                {worker.name}
              </button>
            ))}
          </div>
        ) : (
          <p>
            Aktivni radnik: <strong>{activeWorker?.name || "N/A"}</strong>
          </p>
        )}
      </div>

      <div className="admin-card">
        <h3>{isStaff ? "Nova moja usluga" : "Nova usluga za radnika"}</h3>
        <p>Trajanje usluge unosi se u minutima (primer: 35, 50).</p>
        <form className="form-grid" onSubmit={create}>
          {isStaff ? (
            <div className="form-row">
              <label>Radnik</label>
              <input className="input" value={activeWorker?.name || ""} readOnly />
            </div>
          ) : (
            <div className="form-row">
              <label>Radnik</label>
              <select
                className="select"
                value={form.workerId}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, workerId: event.target.value }))
                }
                required
              >
                {workers.map((worker) => (
                  <option key={worker.id} value={worker.id}>
                    {worker.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="form-row">
            <label>Naziv usluge</label>
            <input
              className="input"
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              required
            />
          </div>
          <div className="form-row">
            <label>Trajanje (min)</label>
            <input
              className="input"
              type="number"
              min="5"
              max="240"
              step="5"
              value={form.durationMin}
              onChange={(event) => setForm((prev) => ({ ...prev, durationMin: event.target.value }))}
              required
            />
          </div>
          <div className="form-row">
            <label>Cena (RSD)</label>
            <input
              className="input"
              type="number"
              min="0"
              value={form.price}
              onChange={(event) => setForm((prev) => ({ ...prev, price: event.target.value }))}
              required
            />
          </div>
          <div className="form-row">
            <label>Boja termina</label>
            <div className="admin-actions">
              <input
                className="input input--color"
                type="color"
                value={HEX_COLOR_RE.test(form.color) ? form.color : "#3C9468"}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, color: event.target.value.toUpperCase() }))
                }
              />
              <input
                className="input"
                value={form.color}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, color: normalizeHexColor(event.target.value) }))
                }
                placeholder="#RRGGBB"
              />
            </div>
          </div>
          <div className="form-row">
            <label>Aktivna usluga</label>
            <label>
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, isActive: event.target.checked }))
                }
              />{" "}
              Aktivna
            </label>
          </div>
          <div className="form-row">
            <button className="button" type="submit">Sacuvaj uslugu</button>
          </div>
        </form>
      </div>

      <div className="admin-card">
        <h3>Usluge ({visibleServices.length})</h3>
        {visibleServices.map((item) => {
          const draft = draftById[item.id] || draftFromService(item);
          const colorForPreview = HEX_COLOR_RE.test(draft.color)
            ? draft.color
            : "#8E939B";
          return (
          <div key={item.id} className="admin-card">
            {!isStaff ? (
              <div className="form-row">
                <label>Naziv usluge</label>
                <input
                  className="input"
                  value={draft.name}
                  onChange={(event) =>
                    updateDraft(item, { name: event.target.value })
                  }
                />
              </div>
            ) : (
              <strong>{item.services?.name || "-"}</strong>
            )}
            <div>Radnik: {item.workers?.name || "-"}</div>
            <div className="form-grid">
              <div className="form-row">
                <label>Trajanje (min)</label>
                <input
                  className="input"
                  type="number"
                  min="5"
                  max="240"
                  step="5"
                  value={draft.durationMin}
                  onChange={(event) =>
                    updateDraft(item, { durationMin: event.target.value })
                  }
                />
              </div>
              <div className="form-row">
                <label>Cena (RSD)</label>
                <input
                  className="input"
                  type="number"
                  min="0"
                  value={draft.price}
                  onChange={(event) =>
                    updateDraft(item, { price: event.target.value })
                  }
                />
              </div>
              <div className="form-row">
                <label>Boja termina</label>
                <div className="admin-actions">
                  <input
                    className="input input--color"
                    type="color"
                    value={HEX_COLOR_RE.test(draft.color) ? draft.color : "#3C9468"}
                    onChange={(event) =>
                      updateDraft(item, { color: event.target.value.toUpperCase() })
                    }
                  />
                  <input
                    className="input"
                    value={draft.color}
                    onChange={(event) =>
                      updateDraft(item, { color: normalizeHexColor(event.target.value) })
                    }
                    placeholder="#RRGGBB"
                  />
                </div>
                <div className="service-color">
                  <span
                    className="service-color__dot"
                    style={{ backgroundColor: colorForPreview }}
                  />
                  <span>{draft.color || "Boja nije postavljena"}</span>
                </div>
              </div>
              <div className="form-row">
                <label>Aktivna usluga</label>
                <label>
                  <input
                    type="checkbox"
                    checked={draft.isActive}
                    onChange={(event) =>
                      updateDraft(item, { isActive: event.target.checked })
                    }
                  />{" "}
                  Aktivna
                </label>
              </div>
            </div>
            <div className="admin-actions">
              <button
                className="button outline"
                type="button"
                onClick={() => saveService(item)}
              >
                Sacuvaj izmene
              </button>
            </div>
          </div>
          );
        })}
      </div>

      {status && <p className={`form-status ${statusType}`}>{status}</p>}
    </AdminShell>
  );
}
