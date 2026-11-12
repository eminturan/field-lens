import * as React from "react";
import { Field, searchFields } from "./logic";

interface Props {
  /** Liste kutusunun id'si; sayfadaki her seçici için farklı olmalı. */
  id: string;
  fields: Field[];
  placeholder: string;
  empty: string;
  onPick: (referenceName: string) => void;
  /** Tek seçim modu: kutuda seçili alanın adı durur. Verilmezse her seçimden sonra kutu temizlenir (kolon ekleme). */
  single?: boolean;
  selected?: Field;
}

/**
 * Aranabilir alan seçici (kolon ekleme ve tarih alanı). Tarayıcının datalist'i yerine: listenin konumu ve satır görünümü
 * (görünen ad büyük, referans adı küçük) her tarayıcıda aynı olsun diye.
 */
export function FieldPicker({ id, fields, placeholder, empty, onPick, single, selected }: Props) {
  const shownName = single ? selected?.name ?? "" : "";
  const [text, setText] = React.useState(shownName);
  const [open, setOpen] = React.useState(false);
  const [active, setActive] = React.useState(0);
  const listRef = React.useRef<HTMLUListElement>(null);
  // Kutuda yalnızca seçili alanın adı varsa tüm liste gösterilir.
  const query = text === shownName ? "" : text;
  const matches = React.useMemo(() => searchFields(fields, query), [fields, query]);

  React.useEffect(() => setText(shownName), [shownName]);
  React.useEffect(() => setActive(0), [query]);
  React.useEffect(() => {
    listRef.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  const pick = (f: Field | undefined) => {
    if (!f) return;
    onPick(f.referenceName);
    setText(single ? f.name : "");
    setActive(0);
    if (single) setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((i) => Math.min(i + 1, matches.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && open) {
      e.preventDefault();
      pick(matches[active]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div className="fl-picker">
      <input
        className="fl-input fl-search"
        role="combobox"
        aria-expanded={open}
        aria-controls={id}
        aria-autocomplete="list"
        aria-activedescendant={open && matches[active] ? `${id}-${active}` : undefined}
        aria-label={placeholder}
        placeholder={placeholder}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setOpen(true);
        }}
        onFocus={(e) => {
          e.target.select();
          setOpen(true);
        }}
        onClick={(e) => {
          // Seçimden sonra odak kutuda kalır; yeniden tıklanınca yazılan, adın yerine geçsin.
          if (text === shownName) e.currentTarget.select();
          setOpen(true);
        }}
        onBlur={() => {
          setOpen(false);
          setText(shownName);
        }}
        onKeyDown={onKeyDown}
      />
      {open && (
        <ul className="fl-picker-list" id={id} role="listbox" ref={listRef}>
          {matches.length === 0 && <li className="fl-picker-empty">{empty}</li>}
          {matches.map((f, i) => (
            <li
              key={f.referenceName}
              id={`${id}-${i}`}
              data-index={i}
              role="option"
              aria-selected={i === active}
              className={i === active ? "fl-picker-item fl-picker-active" : "fl-picker-item"}
              // mousedown: input'un blur'u listeyi kapatmadan önce seçim yapılsın
              onMouseDown={(e) => {
                e.preventDefault();
                pick(f);
              }}
              onMouseEnter={() => setActive(i)}
            >
              <span className="fl-picker-name">{f.name}</span>
              <span className="fl-picker-ref">{f.referenceName}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
