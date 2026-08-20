interface PagefindResultData {
  readonly url?: string;
  readonly excerpt?: string;
  readonly meta?: Readonly<Record<string, string | undefined>>;
}

interface PagefindResult {
  readonly data: () => Promise<PagefindResultData>;
}

interface PagefindSearchResponse {
  readonly results: readonly PagefindResult[];
}

interface PagefindModule {
  readonly init: () => Promise<void>;
  readonly debouncedSearch: (query: string) => Promise<PagefindSearchResponse | null>;
}

let pagefindPromise: Promise<PagefindModule> | undefined;

function loadPagefind(url: string): Promise<PagefindModule> {
  pagefindPromise ??= import(/* @vite-ignore */ url) as Promise<PagefindModule>;
  return pagefindPromise;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };
    return entities[character];
  });
}

function excerptMarkup(excerpt: string): string {
  return escapeHtml(excerpt)
    .replaceAll('&lt;mark&gt;', '<mark>')
    .replaceAll('&lt;/mark&gt;', '</mark>');
}

function setupSearch(root: HTMLElement): void {
  if (root.dataset.searchReady === 'true') return;
  root.dataset.searchReady = 'true';

  const form = root.querySelector<HTMLFormElement>('#site-search-form');
  const input = root.querySelector<HTMLInputElement>('#search-query');
  const status = root.querySelector<HTMLElement>('#search-status');
  const resultsList = root.querySelector<HTMLOListElement>('#search-results');
  const browse = root.querySelector<HTMLElement>('#search-browse');
  const empty = root.querySelector<HTMLElement>('#search-empty');
  const error = root.querySelector<HTMLElement>('#search-error');
  const pagefindUrl = root.dataset.pagefindUrl;

  if (!form || !input || !status || !resultsList || !browse || !empty || !error || !pagefindUrl) return;

  let searchSequence = 0;
  let inputTimer: number | undefined;

  const clearResults = () => {
    resultsList.replaceChildren();
    resultsList.hidden = true;
    empty.hidden = true;
    error.hidden = true;
    browse.hidden = false;
    status.textContent = 'Browse the index or enter a search term.';
  };

  const updateUrl = (query: string) => {
    const url = new URL(window.location.href);
    if (query) url.searchParams.set('q', query);
    else url.searchParams.delete('q');
    window.history.replaceState({}, '', url);
  };

  const renderResults = async (query: string, response: PagefindSearchResponse) => {
    const currentSequence = searchSequence;
    const resultData = await Promise.all(response.results.map((result) => result.data()));
    if (currentSequence !== searchSequence) return;

    resultsList.replaceChildren();
    const resultItems = resultData.flatMap((result) => {
      const rawUrl = result.url ?? result.meta?.url;
      if (!rawUrl) return [];

      const resultUrl = new URL(rawUrl, window.location.origin);
      if (resultUrl.origin !== window.location.origin) return [];

      const item = document.createElement('li');
      item.className = 'search-page__result';
      const link = document.createElement('a');
      link.href = resultUrl.href;

      const title = document.createElement('span');
      title.className = 'search-page__result-title';
      title.textContent = result.meta?.title ?? resultUrl.pathname;
      link.append(title);

      const url = document.createElement('span');
      url.className = 'search-page__result-url';
      url.textContent = resultUrl.pathname;
      link.append(url);

      if (result.excerpt) {
        const excerpt = document.createElement('span');
        excerpt.className = 'search-page__result-excerpt';
        excerpt.innerHTML = excerptMarkup(result.excerpt);
        link.append(excerpt);
      }

      item.append(link);
      return [item];
    });

    resultItems.forEach((item) => resultsList.append(item));
    const count = resultItems.length;
    resultsList.hidden = count === 0;
    empty.hidden = count !== 0;
    error.hidden = true;
    browse.hidden = true;
    status.textContent = count === 0
      ? `No results for “${query}”.`
      : `${count} result${count === 1 ? '' : 's'} for “${query}”.`;
  };

  const runSearch = async (query: string) => {
    const normalizedQuery = query.trim();
    searchSequence += 1;
    if (!normalizedQuery) {
      clearResults();
      return;
    }

    status.textContent = 'Searching the INSTAR index…';
    browse.hidden = true;
    empty.hidden = true;
    error.hidden = true;

    try {
      const pagefind = await loadPagefind(pagefindUrl);
      await pagefind.init();
      const response = await pagefind.debouncedSearch(normalizedQuery);
      if (response === null) return;
      await renderResults(normalizedQuery, response);
    } catch {
      resultsList.replaceChildren();
      resultsList.hidden = true;
      empty.hidden = true;
      error.hidden = false;
      browse.hidden = false;
      status.textContent = 'Search could not load.';
    }
  };

  input.addEventListener('focus', () => {
    void loadPagefind(pagefindUrl).then((pagefind) => pagefind.init()).catch(() => undefined);
  }, { once: true });

  input.addEventListener('input', () => {
    window.clearTimeout(inputTimer);
    inputTimer = window.setTimeout(() => void runSearch(input.value), 180);
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const query = input.value.trim();
    updateUrl(query);
    void runSearch(query);
  });

  const initialQuery = new URLSearchParams(window.location.search).get('q')?.trim() ?? '';
  if (initialQuery) {
    input.value = initialQuery;
    void runSearch(initialQuery);
  }
}

function initializeSearch(): void {
  const root = document.querySelector<HTMLElement>('[data-search-root]');
  if (root) setupSearch(root);
}

document.addEventListener('astro:page-load', initializeSearch);
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeSearch, { once: true });
} else {
  initializeSearch();
}
