'use client';
import { useEffect, useId, useState } from 'react';
import { Input } from './input';

export type SearchOption = { value: string; label: string; disabled?: boolean; reason?: string };
export function SearchPicker({
  label,
  value,
  onChange,
  options,
  loadOptions,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: SearchOption[];
  loadOptions?: (query: string) => Promise<SearchOption[]>;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [remote, setRemote] = useState<SearchOption[]>(options);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [active, setActive] = useState(-1);
  useEffect(() => {
    if (!open || !loadOptions) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      setLoading(true);
      setError(false);
      void loadOptions(query)
        .then((rows) => {
          if (!cancelled) setRemote(rows);
        })
        .catch(() => {
          if (!cancelled) {
            setError(true);
            setRemote([]);
          }
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 150);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, open, loadOptions]);
  const normalize = (text: string) =>
    text.replace(/ي/g, 'ی').replace(/ك/g, 'ک').trim().toLocaleLowerCase();
  const rows = loadOptions
    ? remote
    : options.filter((o) => normalize(o.label).includes(normalize(query)));
  const selected = options.find((o) => o.value === value) ?? remote.find((o) => o.value === value);
  const choose = (option: SearchOption) => {
    if (option.disabled) return;
    onChange(option.value);
    setOpen(false);
    setQuery('');
    setActive(-1);
  };
  return (
    <div
      className="relative"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setOpen(false);
          setQuery('');
        }
      }}
    >
      <label htmlFor={id} className="mb-2 block text-sm font-bold">
        {label}
      </label>
      <Input
        id={id}
        role="combobox"
        aria-expanded={open}
        aria-controls={`${id}-options`}
        aria-autocomplete="list"
        aria-activedescendant={open && active >= 0 ? `${id}-${active}` : undefined}
        autoComplete="off"
        placeholder="انتخاب کنید یا بنویسید…"
        value={open ? query : (selected?.label ?? '')}
        onFocus={() => {
          setOpen(true);
          setQuery('');
          setActive(-1);
        }}
        onClick={() => setOpen(true)}
        onChange={(event) => {
          setLoading(Boolean(loadOptions));
          setQuery(event.target.value);
          setActive(-1);
          onChange('');
        }}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            setOpen(false);
            return;
          }
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            setOpen(true);
            const step = event.key === 'ArrowDown' ? 1 : -1;
            let next = active + step;
            while (next >= 0 && next < rows.length && rows[next].disabled) next += step;
            if (next >= 0 && next < rows.length) setActive(next);
          }
          if (event.key === 'Enter' && open) {
            event.preventDefault();
            if (!loading && rows[active]) choose(rows[active]);
          }
        }}
      />
      {open && (
        <div className="absolute z-50 mt-1 max-h-72 w-full overflow-auto rounded-xl border border-border bg-white p-1 shadow-lg">
          {loading && (
            <p role="status" className="p-3 text-sm text-muted">
              در حال جست‌وجو…
            </p>
          )}
          {error && (
            <p role="alert" className="p-3 text-sm text-danger">
              دریافت فهرست انجام نشد؛ دوباره تلاش کنید.
            </p>
          )}
          {!loading && !error && !rows.length && (
            <p role="status" className="p-3 text-sm text-muted">
              موردی پیدا نشد.
            </p>
          )}
          <ul id={`${id}-options`} role="listbox" aria-label={label}>
            {!loading &&
              rows.map((option, index) => (
                <li
                  id={`${id}-${index}`}
                  key={option.value}
                  role="option"
                  aria-selected={value === option.value}
                  aria-disabled={option.disabled || undefined}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => choose(option)}
                  className={`cursor-pointer rounded-lg p-3 text-sm ${option.disabled ? 'cursor-not-allowed text-muted' : 'hover:bg-primary-soft'} ${active === index ? 'bg-primary-soft' : ''}`}
                >
                  {option.label}
                  {option.reason && <span className="mt-1 block text-xs">{option.reason}</span>}
                </li>
              ))}
          </ul>
        </div>
      )}
    </div>
  );
}
