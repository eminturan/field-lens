import * as React from "react";
import { QueryStrings } from "./i18n";
import { canEdit, nameError, parseQueries, SavedQuery, Settings, settingsKey } from "./logic";

/** Belge deposu: shared=false kullanıcının kendi listesi, true proje genelindeki liste. */
export interface Docs {
  get(shared: boolean): Promise<unknown[]>;
  /** Yazılan belgeyi (yeni __etag ile) döner; __etag eskiyse hata fırlatır. */
  set(shared: boolean, doc: SavedQuery): Promise<unknown>;
  del(shared: boolean, id: string): Promise<void>;
}

export interface User {
  id: string;
  name: string;
}

export interface QueryStore {
  user: User;
  list(): Promise<SavedQuery[]>;
  put(q: SavedQuery): Promise<SavedQuery>;
  remove(q: SavedQuery): Promise<void>;
}

/** Örnek veri modunda sorgular tarayıcıda; sahiplik denensin diye ortak listede başkasının bir sorgusu hazır gelir. */
export function localDocs(): Docs {
  const key = (shared: boolean) => `field-lens-queries-${shared ? "shared" : "user"}`;
  const read = (shared: boolean): Record<string, unknown>[] => {
    try {
      const raw = localStorage.getItem(key(shared));
      if (raw) return JSON.parse(raw);
    } catch {
      return [];
    }
    return shared
      ? [{ id: "seed", name: "Ekip – açık buglar", ownerId: "someone", ownerName: "Ayşe Yılmaz", settings: { type: "Bug", preset: "last30", states: ["New", "Active"] }, __etag: 1 }]
      : [];
  };
  const write = (shared: boolean, docs: unknown[]) => {
    try {
      localStorage.setItem(key(shared), JSON.stringify(docs));
    } catch {
      // saklanamıyor
    }
  };
  return {
    get: async (shared) => read(shared),
    async set(shared, doc) {
      const docs = read(shared);
      const old = docs.find((d) => d.id === doc.id);
      if (old && doc.__etag !== undefined && old.__etag !== doc.__etag) throw new Error("409 etag conflict");
      const next = { ...doc, __etag: ((old?.__etag as number) ?? 0) + 1 };
      write(shared, [...docs.filter((d) => d.id !== doc.id), next]);
      return next;
    },
    del: async (shared, id) => write(shared, read(shared).filter((d) => d.id !== id)),
  };
}

export function queryStore(docs: Docs, user: User): QueryStore {
  // shortcut: okunamayan liste boş sayılır (henüz hiç belge yokken servis 404 dönebiliyor); ağ hatası da boş liste gibi görünür.
  const read = (shared: boolean) => docs.get(shared).then((d) => parseQueries(d, shared), () => []);
  return {
    user,
    list: async () => [...(await read(false)), ...(await read(true))],
    put: async (q) => parseQueries([await docs.set(q.shared, q)], q.shared)[0] ?? q,
    remove: (q) => docs.del(q.shared, q.id),
  };
}

const newId = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);
const message = (e: unknown) => (e instanceof Error ? e.message : String(e));
/** Extension Data Service eski __etag'li yazımı reddeder; mesajda "etag"/409 geçer. */
const isConflict = (e: unknown) => /etag|conflict|409/i.test(message(e));

interface Props {
  store: QueryStore;
  t: QueryStrings;
  /** Formdaki o anki ayarlar. */
  current: Settings;
  selectedId?: string;
  /** run: bağlantıyla açıldı, sorgu yüklenince rapor çalıştırılsın. */
  onSelect(q: SavedQuery | undefined, run?: boolean): void;
  /** Sayfa bir sorgu bağlantısıyla açıldıysa o sorgunun id'si. */
  initialId?: string;
  linkFor(id: string): string;
}

/** Panoya yazar; iframe'de Clipboard API engelliyse eski yöntemi dener. Başarısızsa false. */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const box = document.createElement("textarea");
    box.value = text;
    document.body.appendChild(box);
    box.select();
    try {
      return document.execCommand("copy");
    } catch {
      return false;
    } finally {
      box.remove();
    }
  }
}

type Mode = { kind: "new" | "rename"; name: string; share: boolean; error?: string } | { kind: "remove" } | undefined;

export function QueryBar({ store, t, current, selectedId, onSelect, initialId, linkFor }: Props) {
  const [list, setList] = React.useState<SavedQuery[]>([]);
  const [mode, setMode] = React.useState<Mode>();
  const [busy, setBusy] = React.useState(false);
  const [note, setNote] = React.useState<{ text: string; error?: boolean; link?: string }>();

  const reload = React.useCallback(() => store.list().then((l) => (setList(l), l)), [store]);
  React.useEffect(() => {
    reload().then((l) => {
      if (!initialId) return;
      const q = l.find((x) => x.id === initialId);
      if (q) onSelect(q, true);
      else setNote({ text: t.notFound, error: true });
    });
  }, [reload]);

  const copyLink = async () => {
    if (!selected) return;
    const link = linkFor(selected.id);
    const hint = selected.shared ? "" : " " + t.linkPersonal;
    setNote((await copyText(link)) ? { text: t.linkCopied + hint } : { text: t.linkManual + hint, link });
  };

  const open = (m: Mode) => {
    setNote(undefined);
    setMode(m);
  };

  const selected = list.find((q) => q.id === selectedId);
  const editable = !!selected && canEdit(selected, store.user.id);
  const dirty = !!selected && settingsKey(current) !== settingsKey(selected.settings);
  const mine = list.filter((q) => !q.shared);
  const shared = list.filter((q) => q.shared);

  /** Yazar ve listeyi yeniler; çakışmada güncel listeyi yükleyip uyarır. */
  const write = async (q: SavedQuery, done: string) => {
    setBusy(true);
    setNote(undefined);
    try {
      const saved = await store.put(q);
      setList((l) => [...l.filter((x) => x.id !== saved.id), saved].sort((a, b) => a.name.localeCompare(b.name, "tr")));
      onSelect(saved);
      setMode(undefined);
      setNote({ text: done });
    } catch (e) {
      if (isConflict(e)) {
        await reload();
        setMode(undefined);
        setNote({ text: t.conflict, error: true });
      } else setNote({ text: t.failed(message(e)), error: true });
    } finally {
      setBusy(false);
    }
  };

  const confirmName = () => {
    if (mode?.kind !== "new" && mode?.kind !== "rename") return;
    const err = nameError(mode.name, list, mode.kind === "rename" ? selected?.id : undefined);
    if (err) return setMode({ ...mode, error: t.errors[err] });
    const name = mode.name.trim();
    if (mode.kind === "rename" && selected) write({ ...selected, name }, t.saved);
    else write({ id: newId(), name, shared: mode.share, ownerId: store.user.id, ownerName: store.user.name, settings: current }, t.saved);
  };

  const remove = async () => {
    if (!selected) return;
    setBusy(true);
    try {
      await store.remove(selected);
      setList((l) => l.filter((x) => x.id !== selected.id));
      onSelect(undefined);
      setMode(undefined);
      setNote(undefined);
    } catch (e) {
      setNote({ text: t.failed(message(e)), error: true });
    } finally {
      setBusy(false);
    }
  };

  const label = (q: SavedQuery) => (q.shared && q.ownerId !== store.user.id && q.ownerName ? `${q.name} — ${q.ownerName}` : q.name);

  return (
    <section className="fl-panel fl-queries">
      <div className="fl-actions">
        <label className="fl-qpick">
          <span className="fl-muted">{t.label}</span>
          <select
            className="fl-input"
            value={selected ? selected.id : ""}
            disabled={busy}
            onChange={(e) => {
              setMode(undefined);
              setNote(undefined);
              onSelect(list.find((q) => q.id === e.target.value));
            }}
          >
            <option value="">{t.none}</option>
            {mine.length > 0 && (
              <optgroup label={t.mine}>
                {mine.map((q) => (
                  <option key={q.id} value={q.id}>
                    {label(q)}
                  </option>
                ))}
              </optgroup>
            )}
            {shared.length > 0 && (
              <optgroup label={t.shared}>
                {shared.map((q) => (
                  <option key={q.id} value={q.id}>
                    {label(q)}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
        </label>
        {dirty && (
          <span className="fl-qchanged" title={t.changedTip}>
            {t.changed}
          </span>
        )}
        <span className="fl-qspacer" />
        {editable && (
          <button className="fl-button" disabled={busy || !dirty} onClick={() => selected && write({ ...selected, settings: current }, t.saved)}>
            {t.save}
          </button>
        )}
        {selected && (
          <button className="fl-button" disabled={busy} title={t.linkTip} onClick={copyLink}>
            {t.copyLink}
          </button>
        )}
        <button className="fl-button" disabled={busy} onClick={() => open({ kind: "new", name: "", share: false })}>
          {t.saveAs}
        </button>
        {editable && (
          <>
            <button className="fl-button" disabled={busy} onClick={() => selected && open({ kind: "rename", name: selected.name, share: selected.shared })}>
              {t.rename}
            </button>
            <button className="fl-button" disabled={busy} onClick={() => open({ kind: "remove" })}>
              {t.remove}
            </button>
          </>
        )}
      </div>

      {selected && !editable && <span className="fl-muted">{t.ownerOnly(selected.ownerName || "?")}</span>}

      {(mode?.kind === "new" || mode?.kind === "rename") && (
        <form
          className="fl-actions fl-qform"
          onSubmit={(e) => {
            e.preventDefault();
            confirmName();
          }}
        >
          <input
            className="fl-input fl-qname"
            autoFocus
            maxLength={120}
            placeholder={t.namePlaceholder}
            value={mode.name}
            onChange={(e) => setMode({ ...mode, name: e.target.value, error: undefined })}
          />
          {mode.kind === "new" && (
            <label className="fl-check" title={t.shareTip}>
              <input type="checkbox" checked={mode.share} onChange={(e) => setMode({ ...mode, share: e.target.checked })} />
              {t.share}
            </label>
          )}
          <button className="fl-button" type="submit" disabled={busy}>
            {t.ok}
          </button>
          <button className="fl-button" type="button" onClick={() => setMode(undefined)}>
            {t.cancel}
          </button>
          {mode.error && <span className="fl-qerror">{mode.error}</span>}
        </form>
      )}

      {mode?.kind === "remove" && selected && (
        <div className="fl-actions fl-qform">
          <span className="fl-qerror">{t.confirmRemove(selected.name)}</span>
          <button className="fl-button" disabled={busy} onClick={remove}>
            {t.remove}
          </button>
          <button className="fl-button" onClick={() => setMode(undefined)}>
            {t.cancel}
          </button>
        </div>
      )}

      {note && (note.error || !dirty) && <span className={note.error ? "fl-qerror" : "fl-muted"}>{note.text}</span>}
      {note?.link && <input className="fl-input fl-qname" readOnly value={note.link} onFocus={(e) => e.target.select()} autoFocus />}
    </section>
  );
}
