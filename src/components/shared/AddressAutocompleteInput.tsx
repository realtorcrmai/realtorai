"use client";

import { useState, useRef, useEffect, useCallback } from "react";

export type AddressSuggestion = {
  fullAddress: string;
  streetAddress: string;
  city: string;
  province: string;
  postalCode: string;
};

interface Props {
  value: string;
  onChange: (value: string) => void;
  onSelect?: (suggestion: AddressSuggestion) => void;
  placeholder?: string;
  className?: string;
  id?: string;
  name?: string;
  disabled?: boolean;
}

export function AddressAutocompleteInput({
  value,
  onChange,
  onSelect,
  placeholder = "Start typing an address…",
  className = "",
  id,
  name,
  disabled = false,
}: Props) {
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const fetchSuggestions = useCallback(async (q: string) => {
    if (q.length < 3) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/address-autocomplete?q=${encodeURIComponent(q)}`);
      const json = await res.json();
      const results: AddressSuggestion[] = json.suggestions ?? [];
      setSuggestions(results);
      setOpen(results.length > 0);
      setActiveIndex(-1);
    } catch {
      setSuggestions([]);
      setOpen(false);
    } finally {
      setLoading(false);
    }
  }, []);

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const q = e.target.value;
    onChange(q);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(q), 300);
  }

  function handleSelect(s: AddressSuggestion) {
    onChange(s.fullAddress);
    onSelect?.(s);
    setOpen(false);
    setSuggestions([]);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      handleSelect(suggestions[activeIndex]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <input
          id={id}
          name={name}
          type="text"
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete="off"
          className={`lf-input w-full pr-8 ${className}`}
          role="combobox"
          aria-expanded={open}
          aria-autocomplete="list"
          aria-activedescendant={activeIndex >= 0 ? `addr-opt-${activeIndex}` : undefined}
        />
        {loading && (
          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground">
            <svg className="animate-spin h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </span>
        )}
      </div>

      {open && suggestions.length > 0 && (
        <ul
          role="listbox"
          className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden"
        >
          {suggestions.map((s, i) => (
            <li
              key={s.fullAddress}
              id={`addr-opt-${i}`}
              role="option"
              aria-selected={i === activeIndex}
              onMouseDown={(e) => {
                e.preventDefault(); // prevent blur before click
                handleSelect(s);
              }}
              onMouseEnter={() => setActiveIndex(i)}
              className={`
                flex items-start gap-2 px-3 py-2.5 cursor-pointer text-sm transition-colors
                ${i === activeIndex ? "bg-indigo-50" : "hover:bg-gray-50"}
                ${i < suggestions.length - 1 ? "border-b border-gray-100" : ""}
              `}
            >
              <span className="text-base shrink-0 mt-0.5">📍</span>
              <div className="min-w-0">
                <p className="font-medium text-foreground truncate">{s.streetAddress || s.fullAddress}</p>
                {(s.city || s.postalCode) && (
                  <p className="text-xs text-muted-foreground">
                    {[s.city, s.province, s.postalCode].filter(Boolean).join(", ")}
                  </p>
                )}
              </div>
            </li>
          ))}
          <li className="px-3 py-1.5 text-[10px] text-muted-foreground/50 border-t border-gray-100 text-right">
            Powered by BC Geocoder
          </li>
        </ul>
      )}
    </div>
  );
}
