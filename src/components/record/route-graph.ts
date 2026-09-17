/**
 * route-graph.ts — deferred enhancement for the RouteGraph topology.
 *
 * The SVG is complete server-rendered markup with operable links, so this
 * module only adds focus-dim, ranking pins, pan/zoom, and the
 * Enter-moves-to-the-inventory-row contract. Without scripts the graph is
 * plain navigation and the details table carries the same data as text.
 */

function preview(path: string): void {
  document.dispatchEvent(new CustomEvent('record:preview-route', { detail: { path } }));
}

function initGraph(root: HTMLElement): void {
  const svg = root.querySelector<SVGSVGElement>('[data-graph-svg]');
  if (!svg) return;
  const nodeLinks = [...root.querySelectorAll<HTMLAnchorElement>('a[data-graph-node]')];
  const nodes = new Set(nodeLinks.map((link) => link.dataset.graphNode ?? ''));

  /** Paths linked to `path` by any rendered edge, including itself. */
  const neighbourhood = (path: string): Set<string> => {
    const near = new Set([path]);
    for (const edge of root.querySelectorAll<HTMLElement>('[data-graph-edge]')) {
      const [source, target] = (edge.dataset.graphEdge ?? '').split(' ');
      if (source === path && target) near.add(target);
      if (target === path && source) near.add(source);
    }
    return near;
  };

  const dimExcept = (keep: Set<string> | null): void => {
    svg.classList.toggle('is-focus', keep !== null);
    for (const link of nodeLinks) {
      const dim = keep !== null && !keep.has(link.dataset.graphNode ?? '');
      link.classList.toggle('is-dim', dim);
    }
  };

  let pinned: string | null = null;
  const applyPin = (path: string | null): void => {
    pinned = path;
    // `aria-pressed` is not a valid state for links (axe aria-allowed-attr),
    // so the pinned ranking row is exposed as the current item in the
    // ranking set instead. The rows stay plain links, so without scripts
    // they navigate.
    for (const link of document.querySelectorAll<HTMLAnchorElement>('[data-inbound-link]')) {
      if (link.dataset.inboundLink === path && path !== null) link.setAttribute('aria-current', 'true');
      else link.removeAttribute('aria-current');
    }
    dimExcept(path ? neighbourhood(path) : null);
    if (path) preview(path);
  };

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && pinned) {
      event.preventDefault();
      applyPin(null);
    }
  });

  // Ranking rows pin the topology instead of navigating. Rows stay plain
  // links, so without scripts (or with this module failing) they navigate.
  for (const row of document.querySelectorAll<HTMLAnchorElement>('[data-inbound-link]')) {
    row.addEventListener('click', (event) => {
      const path = row.dataset.inboundLink ?? '';
      if (!nodes.has(path)) return;
      event.preventDefault();
      applyPin(pinned === path ? null : path);
    });
  }

  const focusNode = (link: HTMLAnchorElement): void => {
    const path = link.dataset.graphNode ?? '';
    dimExcept(neighbourhood(path));
  };
  const blurNode = (): void => {
    dimExcept(pinned ? neighbourhood(pinned) : null);
  };

  for (const link of nodeLinks) {
    const path = link.dataset.graphNode ?? '';
    link.addEventListener('mouseenter', () => focusNode(link));
    link.addEventListener('mouseleave', blurNode);
    link.addEventListener('focus', () => focusNode(link));
    link.addEventListener('blur', blurNode);
    // Activating a node previews it; Enter additionally honours the
    // documented contract of moving to the matching inventory-table row.
    // Journey-only stops have no table row, so Enter follows their link.
    link.addEventListener('click', (event) => {
      event.preventDefault();
      preview(path);
      applyPin(path);
    });
    link.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter') return;
      const row = [...document.querySelectorAll<HTMLTableRowElement>('[data-route-item]')].find((item) =>
        item.querySelector('code')?.textContent?.trim() === path,
      );
      if (!row) return;
      event.preventDefault();
      preview(path);
      row.querySelector<HTMLAnchorElement>('a[href]')?.focus();
      row.scrollIntoView({ block: 'nearest' });
    });
  }

  // Pan and zoom. Instant viewBox changes only — no animation to gate under
  // prefers-reduced-motion.
  const base = svg.viewBox.baseVal;
  const home = { x: base.x, y: base.y, width: base.width, height: base.height };
  const setView = (view: { x: number; y: number; width: number; height: number }): void => {
    svg.setAttribute('viewBox', `${view.x} ${view.y} ${view.width} ${view.height}`);
  };
  const current = (): { x: number; y: number; width: number; height: number } => {
    const view = svg.viewBox.baseVal;
    return { x: view.x, y: view.y, width: view.width, height: view.height };
  };
  const zoom = (factor: number): void => {
    const view = current();
    const cx = view.x + view.width / 2;
    const cy = view.y + view.height / 2;
    const width = Math.min(home.width * 2, Math.max(home.width / 8, view.width * factor));
    const height = (width * home.height) / home.width;
    setView({ x: cx - width / 2, y: cy - height / 2, width, height });
  };
  root.querySelector('[data-graph-zoom-in]')?.addEventListener('click', () => zoom(0.75));
  root.querySelector('[data-graph-zoom-out]')?.addEventListener('click', () => zoom(1.33));
  root.querySelector('[data-graph-reset]')?.addEventListener('click', () => setView(home));

  let dragging: { x: number; y: number } | null = null;
  svg.addEventListener('pointerdown', (event) => {
    dragging = { x: event.clientX, y: event.clientY };
    svg.setPointerCapture(event.pointerId);
  });
  svg.addEventListener('pointermove', (event) => {
    if (!dragging) return;
    const rect = svg.getBoundingClientRect();
    const view = current();
    const dx = ((dragging.x - event.clientX) / rect.width) * view.width;
    const dy = ((dragging.y - event.clientY) / rect.height) * view.height;
    dragging = { x: event.clientX, y: event.clientY };
    setView({ ...view, x: view.x + dx, y: view.y + dy });
  });
  for (const done of ['pointerup', 'pointercancel', 'pointerleave']) {
    svg.addEventListener(done, () => {
      dragging = null;
    });
  }
}

for (const root of document.querySelectorAll<HTMLElement>('[data-route-graph]')) initGraph(root);
