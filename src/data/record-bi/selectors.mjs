/**
 * Pure selectors for the public Record Room BI snapshot.
 *
 * These functions deliberately select by the observation period/as-of date.
 * The snapshot refresh date and source retrieval date describe provenance;
 * neither is allowed to make an older observation look current.
 */

export const observationPeriodKey = (observation) => observation.period
  ? `${observation.period.start}/${observation.period.end}`
  : observation.asOf
    ? `as-of/${observation.asOf}`
    : '';

export const observationPeriodEnd = (observation) => observation.period?.end ?? observation.asOf ?? '';

export const periodLabel = (observation) => observation.period
  ? `${observation.period.start} to ${observation.period.end}`
  : observation.asOf
    ? `As of ${observation.asOf}`
    : 'Undated';

const dimensionKey = (definition, observation) => JSON.stringify(
  (definition?.dimensions ?? Object.keys(observation.dimensions ?? {}).sort())
    .map((key) => [key, observation.dimensions?.[key] ?? '']),
);

const groupKey = (definition, observation, groupByDimensions) => [
  observationPeriodKey(observation),
  groupByDimensions ? dimensionKey(definition, observation) : '',
].join('::');

const sortKey = (observation) => `${observationPeriodEnd(observation)}|${observationPeriodKey(observation)}`;

const uniqueSources = (observations) => {
  const seen = new Set();
  const sources = [];
  const visit = (entry) => {
    if (!entry) return;
    if (Array.isArray(entry.observations)) entry.observations.forEach(visit);
    if (Array.isArray(entry.sources)) entry.sources.forEach(visit);
    const source = entry.source ?? (entry.id && entry.locator ? entry : null);
    if (!source) return;
    const key = JSON.stringify([source.id, source.label, source.locator, source.retrievedAt]);
    if (seen.has(key)) return;
    seen.add(key);
    sources.push(source);
  };
  observations.forEach(visit);
  return sources;
};

export function observationSources(observations) {
  return uniqueSources(observations);
}

export function observationSourceLabel(observations) {
  return uniqueSources(observations)
    .map((source) => `${source.label} · retrieved ${source.retrievedAt} · ${source.locator}`)
    .join('; ');
}

export function observationDimensionsLabel(observation) {
  const dimensions = Object.entries(observation.dimensions ?? {});
  return dimensions.length
    ? dimensions.map(([key, value]) => `${key}: ${value}`).join(' · ')
    : 'All categories';
}

const latestTemporalEnd = (observations) => observations
  .map(observationPeriodEnd)
  .filter(Boolean)
  .sort((left, right) => right.localeCompare(left))[0] ?? '';

const latestTemporalKey = (observations) => {
  const latestEnd = latestTemporalEnd(observations);
  const keys = [...new Set(observations
    .filter((observation) => observationPeriodEnd(observation) === latestEnd)
    .map(observationPeriodKey))]
    .filter(Boolean);
  // A shared end date with different starts is not a comparable period.
  return keys.length === 1 ? keys[0] : null;
};

/**
 * Collapse duplicate observations at the definition's declared grain.
 * A null in a group remains unavailable; it is never treated as zero.
 */
export function aggregateMetricObservations(definition, observations, options = {}) {
  const { latestOnly = false, groupByDimensions = true } = options;
  const matchingMetric = observations.filter((observation) => observation.metricId === definition.id);
  const latestKey = latestTemporalKey(matchingMetric);
  const matching = matchingMetric
    .filter((observation) => !latestOnly || (latestKey !== null && observationPeriodKey(observation) === latestKey))
    .sort((left, right) => sortKey(left).localeCompare(sortKey(right)));
  const groups = new Map();

  for (const observation of matching) {
    const key = groupKey(definition, observation, groupByDimensions);
    const entries = groups.get(key) ?? [];
    entries.push(observation);
    groups.set(key, entries);
  }

  return [...groups.values()].map((entries) => {
    const first = entries[0];
    const unavailable = entries.find((observation) => observation.value === null);
    const value = unavailable
      ? null
      : entries.reduce((total, observation) => total + (observation.value ?? 0), 0);
    return {
      ...first,
      value,
      unavailableReason: unavailable
        ? entries.map((observation) => observation.unavailableReason).filter(Boolean).join('; ')
        : undefined,
      source: first.source,
      sources: uniqueSources(entries),
      observations: entries,
    };
  });
}

export function latestMetricPeriod(definition, observations) {
  const matching = observations.filter((observation) => observation.metricId === definition.id);
  const latest = latestTemporalKey(matching);
  if (latest === null) return [];
  return aggregateMetricObservations(definition, matching, { latestOnly: false })
    .filter((observation) => observationPeriodKey(observation) === latest);
}

export function latestMetricAggregate(definition, observations) {
  const latest = latestMetricPeriod(definition, observations);
  if (latest.length === 0) return null;
  const value = latest.some((observation) => observation.value === null)
    ? null
    : latest.reduce((total, observation) => total + (observation.value ?? 0), 0);
  return {
    ...latest[0],
    value,
    dimensions: {},
    sources: uniqueSources(latest.flatMap((observation) => observation.sources ?? [observation.source])),
    observations: latest.flatMap((observation) => observation.observations ?? [observation]),
    unavailableReason: latest.map((observation) => observation.unavailableReason).filter(Boolean).join('; ') || undefined,
  };
}

const intervalGrain = (observation) => {
  if (!observation.period) return null;
  const startDate = new Date(`${observation.period.start}T00:00:00.000Z`);
  const endDate = new Date(`${observation.period.end}T00:00:00.000Z`);
  const lastDayOfEndMonth = new Date(Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth() + 1, 0)).getUTCDate();
  const isCompleteCalendarSpan = startDate.getUTCDate() === 1 && endDate.getUTCDate() === lastDayOfEndMonth;
  if (isCompleteCalendarSpan) {
    const calendarMonths = (endDate.getUTCFullYear() - startDate.getUTCFullYear()) * 12
      + endDate.getUTCMonth() - startDate.getUTCMonth() + 1;
    return `calendar-months:${calendarMonths}`;
  }
  const elapsedDays = Math.round((endDate.valueOf() - startDate.valueOf()) / 86400000);
  return `elapsed-days:${elapsedDays}`;
};

/**
 * Return the longest single-dimension series with equal period lengths and
 * strictly non-overlapping intervals. This prevents mixed categories or
 * incomparable periods from becoming a misleading line chart.
 */
export function comparableMetricSeries(definition, observations) {
  const aggregates = aggregateMetricObservations(definition, observations, { groupByDimensions: true })
    .filter((observation) => observation.period);
  const byDimensions = new Map();
  for (const observation of aggregates) {
    const key = dimensionKey(definition, observation);
    const entries = byDimensions.get(key) ?? [];
    entries.push(observation);
    byDimensions.set(key, entries);
  }

  const candidates = [...byDimensions.values()].map((series) => series.sort((left, right) => {
    const leftStart = left.period?.start ?? '';
    const rightStart = right.period?.start ?? '';
    return leftStart.localeCompare(rightStart);
  })).filter((series) => {
    if (series.length < 2) return false;
    const lengths = new Set(series.map(intervalGrain));
    return lengths.size === 1 && series.slice(1).every((observation, index) => {
      const previous = series[index];
      return Boolean(previous.period && observation.period && observation.period.start > previous.period.end);
    });
  });

  candidates.sort((left, right) => right.length - left.length || (right.at(-1)?.period?.end ?? '').localeCompare(left.at(-1)?.period?.end ?? ''));
  return candidates[0] ?? [];
}
