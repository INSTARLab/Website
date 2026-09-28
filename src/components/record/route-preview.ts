/**
 * route-preview.ts — deferred enhancement for the RoutePreview pane.
 *
 * The pane is complete server-rendered HTML; this module only swaps between
 * the build-time rows embedded as JSON. It listens for `record:preview-route`
 * events (dispatched by the ranking, graph, and directory modules), keeps a
 * copy-link action, a maximize overlay, and a browser-local recents rail.
 * Core content never depends on localStorage: history is an enhancement and
 * every storage access is guarded.
 */

interface PreviewVisual {
  src: string;
  alt: string;
  width: number;
  height: number;
  caption: string;
  href: string;
}

interface PreviewEntry {
  path: string;
  number: string;
  title: string;
  description: string;
  family: string | null;
  kind: string | null;
  indexable: boolean | null;
  journeys: string[];
  visual: PreviewVisual | null;
}

const RECENTS_KEY = 'instarlab-record-recent-routes';
const RECENTS_MAX = 6;

function baseHref(root: HTMLElement): string {
  const base = root.dataset.previewBase ?? '/';
  if (base === '/') return '';
  return `/${base.replace(/^\/+|\/+$/g, '')}`;
}

function readRecents(): string[] {
  try {
    const raw = window.localStorage.getItem(RECENTS_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((entry): entry is string => typeof entry === 'string') : [];
  } catch {
    return [];
  }
}

function writeRecents(paths: string[]): void {
  try {
    window.localStorage.setItem(RECENTS_KEY, JSON.stringify(paths.slice(0, RECENTS_MAX)));
  } catch {
    // History is an enhancement; a full or blocked store must not break preview.
  }
}

function initPreview(root: HTMLElement): void {
  const dataEl = root.querySelector<HTMLScriptElement>('[data-preview-data]');
  let routes: PreviewEntry[] = [];
  try {
    routes = dataEl ? (JSON.parse(dataEl.textContent ?? '[]') as PreviewEntry[]) : [];
  } catch {
    routes = [];
  }
  if (routes.length === 0) return;
  const base = baseHref(root);
  const byPath = new Map(routes.map((entry) => [entry.path, entry]));

  const kicker = root.querySelector<HTMLElement>('[data-preview-kicker]');
  const nameLink = root.querySelector<HTMLAnchorElement>('[data-preview-link]');
  const pathEl = root.querySelector<HTMLElement>('[data-preview-path]');
  const visualWrap = root.querySelector<HTMLElement>('[data-preview-visual-wrap]');
  const description = root.querySelector<HTMLElement>('[data-preview-description]');
  const meta = root.querySelector<HTMLElement>('[data-preview-meta]');
  const recents = root.querySelector<HTMLOListElement>('[data-preview-recents]');
  const copyButton = root.querySelector<HTMLButtonElement>('[data-preview-copy]');
  const copyStatus = root.querySelector<HTMLElement>('[data-preview-copy-status]');
  const maxButton = root.querySelector<HTMLButtonElement>('[data-preview-max]');
  let currentPath = nameLink?.getAttribute('href') ?? routes[0].path;

  const renderRecents = (): void => {
    if (!recents) return;
    recents.innerHTML = '';
    const items = readRecents().filter((path) => byPath.has(path));
    if (items.length === 0) {
      const empty = document.createElement('li');
      empty.className = 'text-body-secondary';
      empty.textContent = 'Routes previewed on this page appear here. History stays in this browser.';
      recents.append(empty);
      return;
    }
    for (const path of items) {
      const entry = byPath.get(path);
      if (!entry) continue;
      const item = document.createElement('li');
      const link = document.createElement('a');
      link.href = base + entry.path;
      link.textContent = `${entry.number} · ${entry.title}`;
      link.addEventListener('click', (event) => {
        event.preventDefault();
        show(entry.path, true);
      });
      item.append(link);
      recents.append(item);
    }
  };

  const show = (path: string, record: boolean): void => {
    const entry = byPath.get(path);
    if (!entry || !nameLink) return;
    currentPath = entry.path;
    if (kicker) kicker.textContent = `${entry.number} · ${entry.family ?? 'Journey route'}`;
    nameLink.href = base + entry.path;
    nameLink.textContent = entry.title;
    if (pathEl) pathEl.textContent = entry.path;
    if (description) description.textContent = entry.description;
    if (visualWrap) {
      visualWrap.innerHTML = '';
      if (entry.visual) {
        const link = document.createElement('a');
        link.href = base + entry.visual.href;
        const image = document.createElement('img');
        image.className = 'img-fluid rounded border';
        image.src = base + entry.visual.src;
        image.alt = entry.visual.alt;
        image.width = entry.visual.width;
        image.height = entry.visual.height;
        image.loading = 'lazy';
        link.append(image);
        visualWrap.append(link);
        const caption = document.createElement('p');
        caption.className = 'small text-body-secondary mt-2 mb-0';
        caption.textContent = entry.visual.caption;
        visualWrap.append(caption);
      } else {
        const note = document.createElement('p');
        note.className = 'small text-body-secondary border rounded p-3 mb-0';
        note.textContent =
          'No route visual — this stop is linked from the route inventory and the journey manifest, not from the visual archive.';
        visualWrap.append(note);
      }
    }
    if (meta) {
      meta.innerHTML = '';
      const rows: Array<[string, string]> = [];
      if (entry.kind) rows.push(['Kind', entry.kind.charAt(0).toUpperCase() + entry.kind.slice(1)]);
      if (entry.indexable !== null) rows.push(['Indexability', entry.indexable ? 'Indexable' : 'Noindex']);
      if (entry.journeys.length > 0) rows.push(['Journeys', entry.journeys.join(' · ')]);
      for (const [term, value] of rows) {
        const dt = document.createElement('dt');
        dt.className = 'col-4';
        dt.textContent = term;
        const dd = document.createElement('dd');
        dd.className = 'col-8 mb-1';
        dd.textContent = value;
        meta.append(dt, dd);
      }
    }
    if (record) {
      writeRecents([entry.path, ...readRecents().filter((item) => item !== entry.path)]);
      renderRecents();
    }
  };

  document.addEventListener('record:preview-route', (event) => {
    const path = (event as CustomEvent<{ path?: unknown }>).detail?.path;
    if (typeof path === 'string' && byPath.has(path)) show(path, true);
  });

  copyButton?.addEventListener('click', async () => {
    const url = new URL(base + currentPath, window.location.href).toString();
    let copied = false;
    try {
      await navigator.clipboard.writeText(url);
      copied = true;
    } catch {
      const fallback = document.createElement('textarea');
      fallback.value = url;
      document.body.append(fallback);
      fallback.select();
      try {
        copied = document.execCommand('copy');
      } catch {
        copied = false;
      }
      fallback.remove();
    }
    if (copyStatus) copyStatus.textContent = copied ? 'Link copied.' : `Copy unavailable — the link is ${url}`;
  });

  const setMaximized = (open: boolean): void => {
    const maximized = open && !root.classList.contains('record-preview--max');
    root.classList.toggle('record-preview--max', maximized);
    maxButton?.setAttribute('aria-expanded', String(maximized));
    if (maxButton) maxButton.textContent = maximized ? 'Restore' : 'Maximize';
    if (maximized) nameLink?.focus({ preventScroll: true });
  };
  maxButton?.addEventListener('click', () => setMaximized(!root.classList.contains('record-preview--max')));
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && root.classList.contains('record-preview--max')) {
      event.preventDefault();
      setMaximized(false);
      maxButton?.focus();
    }
  });

  renderRecents();
}

for (const root of document.querySelectorAll<HTMLElement>('[data-route-preview]')) initPreview(root);
