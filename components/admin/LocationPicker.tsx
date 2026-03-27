"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export type LocationPickerOption = {
  id: string;
  name: string;
  subtitle?: string;
  disabled?: boolean;
};

type LocationPickerProps = {
  locations: LocationPickerOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  emptyLabel?: string;
  disabled?: boolean;
};

const getBadgeLabel = (name: string) =>
  (name || "")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("") || "?";

export default function LocationPicker({
  locations,
  value,
  onChange,
  placeholder = "Izaberite radnju",
  emptyLabel = "Nema dostupnih radnji.",
  disabled = false,
}: LocationPickerProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const selectedLocation = useMemo(
    () => locations.find((location) => location.id === value) || null,
    [locations, value]
  );

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [isOpen]);

  return (
    <div
      ref={rootRef}
      className={`worker-picker location-picker ${disabled ? "is-disabled" : ""} ${
        isOpen ? "is-open" : ""
      }`.trim()}
    >
      <button
        className="worker-picker__trigger"
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((prev) => !prev)}
      >
        {selectedLocation ? (
          <span className="worker-picker__selected">
            <span className="location-picker__badge" aria-hidden="true">
              {getBadgeLabel(selectedLocation.name)}
            </span>
            <span className="worker-picker__text">
              <strong>{selectedLocation.name}</strong>
              {selectedLocation.subtitle && <small>{selectedLocation.subtitle}</small>}
            </span>
          </span>
        ) : (
          <span className="worker-picker__placeholder">{placeholder}</span>
        )}
        <span className="worker-picker__chevron" aria-hidden="true">
          {isOpen ? "^" : "v"}
        </span>
      </button>

      {isOpen && (
        <div className="worker-picker__panel">
          <div className="worker-picker__options" role="listbox">
            {locations.length === 0 && <div className="worker-picker__empty">{emptyLabel}</div>}

            {locations.map((location) => {
              const isActive = location.id === value;
              return (
                <button
                  key={location.id}
                  className={`worker-picker__option ${isActive ? "is-active" : ""}`.trim()}
                  type="button"
                  role="option"
                  aria-selected={isActive}
                  disabled={location.disabled}
                  onClick={() => {
                    onChange(location.id);
                    setIsOpen(false);
                  }}
                >
                  <span className="location-picker__badge" aria-hidden="true">
                    {getBadgeLabel(location.name)}
                  </span>
                  <span className="worker-picker__text">
                    <strong>{location.name}</strong>
                    {location.subtitle && <small>{location.subtitle}</small>}
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
