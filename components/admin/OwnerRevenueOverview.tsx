"use client";

import WorkerAvatar from "@/components/admin/WorkerAvatar";

export type RevenueWorkerSummary = {
  workerId: string;
  workerName: string;
  profileImageUrl: string | null;
  locationId: string;
  locationName: string;
  revenue: number;
  appointments: number;
};

export type RevenueLocationSummary = {
  locationId: string;
  locationName: string;
  revenue: number;
  appointments: number;
  workers: RevenueWorkerSummary[];
};

export type MonthRevenueSummary = {
  monthStart: string;
  monthEnd: string;
  monthLabel: string;
  totalRevenue: number;
  totalAppointments: number;
  locations: RevenueLocationSummary[];
  workers: RevenueWorkerSummary[];
  isSnapshot: boolean;
  savedAt: string | null;
};

type OwnerRevenueOverviewProps = {
  currentMonth: MonthRevenueSummary;
  savedMonths: MonthRevenueSummary[];
  historyStorageEnabled: boolean;
};

type MonthCardProps = {
  month: MonthRevenueSummary;
  titleBadge: string;
  isLive?: boolean;
};

const formatCurrency = (value: number) => `${value.toLocaleString("sr-RS")} RSD`;

const formatSavedAt = (value: string | null) => {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("sr-RS", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
};

const pluralizeAppointments = (count: number) => {
  if (count % 10 === 1 && count % 100 !== 11) {
    return "termin";
  }
  if (
    count % 10 >= 2 &&
    count % 10 <= 4 &&
    (count % 100 < 12 || count % 100 > 14)
  ) {
    return "termina";
  }
  return "termina";
};

function RevenueHistoryMonthCard({ month, titleBadge, isLive = false }: MonthCardProps) {
  return (
    <article
      className={`revenue-history-card ${isLive ? "revenue-history-card--live" : ""}`.trim()}
    >
      <div className="revenue-history-card__header">
        <div>
          <strong>{month.monthLabel}</strong>
          <span>
            {month.totalAppointments} {pluralizeAppointments(month.totalAppointments)}
          </span>
        </div>
        <div className="revenue-history-card__meta">
          <strong>{formatCurrency(month.totalRevenue)}</strong>
          <span className={`status-pill ${isLive ? "confirmed" : "pending"}`}>{titleBadge}</span>
        </div>
      </div>

      {month.savedAt && !isLive && (
        <div className="revenue-history-card__saved">Sacuvano: {formatSavedAt(month.savedAt)}</div>
      )}
      {isLive && (
        <div className="revenue-history-card__saved">
          Tekuci mesec se racuna uzivo i jos nije zatvoren snapshot.
        </div>
      )}

      <div className="revenue-history-card__workers">
        {month.workers.map((worker) => (
          <div key={`${month.monthStart}-${worker.workerId}`} className="revenue-history-worker">
            <div className="revenue-history-worker__identity">
              <WorkerAvatar
                name={worker.workerName}
                imageUrl={worker.profileImageUrl}
                size="sm"
              />
              <div>
                <strong>{worker.workerName}</strong>
                <span>
                  {worker.appointments} {pluralizeAppointments(worker.appointments)}
                </span>
              </div>
            </div>
            <strong>{formatCurrency(worker.revenue)}</strong>
          </div>
        ))}
      </div>
    </article>
  );
}

export default function OwnerRevenueOverview({
  currentMonth,
  savedMonths,
  historyStorageEnabled,
}: OwnerRevenueOverviewProps) {
  return (
    <div className="admin-grid dashboard-grid">
      <div className="dashboard-main-grid">
        <section className="admin-card dashboard-card">
          <div className="dashboard-section-header">
            <div>
              <h3>Tekuci mesec</h3>
              <p>{currentMonth.monthLabel}</p>
            </div>
            <div className="status-pill confirmed">Live pregled</div>
          </div>

          <div className="revenue-metrics">
            <div className="revenue-metric-card">
              <span>Ukupna zarada</span>
              <strong>{formatCurrency(currentMonth.totalRevenue)}</strong>
            </div>
            <div className="revenue-metric-card">
              <span>Ukupno termina</span>
              <strong>{currentMonth.totalAppointments}</strong>
            </div>
            <div className="revenue-metric-card">
              <span>Aktivni radnici u pregledu</span>
              <strong>{currentMonth.workers.length}</strong>
            </div>
          </div>
        </section>

        <section className="admin-card dashboard-card">
          <div className="dashboard-section-header">
            <div>
              <h3>Zarada po radnji</h3>
              <p>Ukupno za mesec po lokaciji.</p>
            </div>
          </div>

          <div className="dashboard-list">
            {currentMonth.locations.map((location) => (
              <div key={location.locationId} className="dashboard-list-item revenue-list-item">
                <div>
                  <strong>{location.locationName}</strong>
                  <span>
                    {location.appointments} {pluralizeAppointments(location.appointments)}
                  </span>
                </div>
                <strong>{formatCurrency(location.revenue)}</strong>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="admin-card dashboard-card">
        <div className="dashboard-section-header">
          <div>
            <h3>Radnici u ovom mesecu</h3>
            <p>Zarada i broj termina po radniku.</p>
          </div>
        </div>

        <div className="revenue-worker-grid">
          {currentMonth.workers.map((worker) => (
            <article key={worker.workerId} className="revenue-worker-card">
              <div className="revenue-worker-card__header">
                <div className="revenue-worker-card__identity">
                  <WorkerAvatar
                    name={worker.workerName}
                    imageUrl={worker.profileImageUrl}
                    size="sm"
                  />
                  <div>
                    <strong>{worker.workerName}</strong>
                    <span>{worker.locationName}</span>
                  </div>
                </div>
                <strong>{formatCurrency(worker.revenue)}</strong>
              </div>

              <div className="revenue-worker-card__stats">
                <div>
                  <span>Termini</span>
                  <strong>{worker.appointments}</strong>
                </div>
                <div>
                  <span>Prosek po terminu</span>
                  <strong>
                    {formatCurrency(
                      worker.appointments > 0
                        ? Math.round(worker.revenue / worker.appointments)
                        : 0
                    )}
                  </strong>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="admin-card dashboard-card">
        <div className="dashboard-section-header">
          <div>
            <h3>Tekuci i zatvoreni meseci</h3>
            <p>
              {currentMonth.monthLabel} je live pregled, a ispod su sacuvani zatvoreni meseci.
            </p>
          </div>
          {historyStorageEnabled ? (
            <div className="status-pill confirmed">Arhiva aktivna</div>
          ) : (
            <div className="status-pill pending">Migracija potrebna</div>
          )}
        </div>

        <div className="revenue-history-grid">
          <RevenueHistoryMonthCard
            month={currentMonth}
            titleBadge="Tekuci mesec"
            isLive
          />
        </div>

        {!historyStorageEnabled && (
          <p className="form-status">
            Pokreni migraciju za `monthly_revenue_snapshots` da bi istorija ostala sacuvana.
          </p>
        )}

        {historyStorageEnabled && savedMonths.length === 0 && (
          <p className="form-status">Prvi zatvoren snapshot ce se pojaviti po zavrsetku ovog meseca.</p>
        )}

        {historyStorageEnabled && savedMonths.length > 0 && (
          <div className="revenue-history-grid revenue-history-grid--archived">
            {savedMonths.map((month) => (
              <RevenueHistoryMonthCard
                key={month.monthStart}
                month={month}
                titleBadge="Zatvoren mesec"
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
