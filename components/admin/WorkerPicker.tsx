"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import WorkerAvatar from "@/components/admin/WorkerAvatar";

export type WorkerPickerOption = {
  id: string;
  name: string;
  profile_image_url?: string | null;
  subtitle?: string;
  disabled?: boolean;
};

type WorkerPickerProps = {
  workers: WorkerPickerOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyLabel?: string;
  disabled?: boolean;
};

export default function WorkerPicker({
  workers,
  value,
  onChange,
  placeholder = "Izaberi radnika",
  searchPlaceholder = "Pretrazi radnika",
  emptyLabel = "Nema dostupnih radnika.",
  disabled = false,
}: WorkerPickerProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const closePicker = () => {
    setIsOpen(false);
    setQuery("");
  };

  const selectedWorker = useMemo(
    () => workers.find((worker) => worker.id === value) || null,
    [value, workers]
  );

  const filteredWorkers = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) {
      return workers;
    }

    return workers.filter((worker) => {
      const haystack = `${worker.name} ${worker.subtitle || ""}`.toLowerCase();
      return haystack.includes(term);
    });
  }, [query, workers]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        closePicker();
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [isOpen]);

  return (
    <div
      ref={rootRef}
      className={`worker-picker ${disabled ? "is-disabled" : ""} ${isOpen ? "is-open" : ""}`.trim()}
    >
      <button
        className="worker-picker__trigger"
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={() => {
          if (isOpen) {
            closePicker();
            return;
          }
          setIsOpen(true);
        }}
      >
        {selectedWorker ? (
          <span className="worker-picker__selected">
            <WorkerAvatar
              name={selectedWorker.name}
              imageUrl={selectedWorker.profile_image_url}
              size="sm"
            />
            <span className="worker-picker__text">
              <strong>{selectedWorker.name}</strong>
              {selectedWorker.subtitle && <small>{selectedWorker.subtitle}</small>}
            </span>
          </span>
        ) : (
          <span className="worker-picker__placeholder">{placeholder}</span>
        )}
        <span className="worker-picker__chevron" aria-hidden="true">
          {isOpen ? "▴" : "▾"}
        </span>
      </button>

      {isOpen && (
        <div className="worker-picker__panel">
          {workers.length > 5 && (
            <div className="worker-picker__search">
              <input
                className="input"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={searchPlaceholder}
                autoComplete="off"
              />
            </div>
          )}

          <div className="worker-picker__options" role="listbox">
            {filteredWorkers.length === 0 && (
              <div className="worker-picker__empty">{emptyLabel}</div>
            )}

            {filteredWorkers.map((worker) => {
              const isActive = worker.id === value;
              return (
                <button
                  key={worker.id}
                  className={`worker-picker__option ${isActive ? "is-active" : ""}`.trim()}
                  type="button"
                  role="option"
                  aria-selected={isActive}
                  disabled={worker.disabled}
                  onClick={() => {
                    onChange(worker.id);
                    closePicker();
                  }}
                >
                  <WorkerAvatar name={worker.name} imageUrl={worker.profile_image_url} size="sm" />
                  <span className="worker-picker__text">
                    <strong>{worker.name}</strong>
                    {worker.subtitle && <small>{worker.subtitle}</small>}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
