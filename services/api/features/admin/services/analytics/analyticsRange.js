const RANGE_TO_DAYS = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
};

const DEFAULT_RANGE = '30d';

function parseRangeDays(range) {
  return RANGE_TO_DAYS[range] || RANGE_TO_DAYS[DEFAULT_RANGE];
}

/** `YYYY-MM-DD` label per day, oldest first, ending today. */
function buildDailyLabels(days) {
  const labels = [];
  const now = new Date();
  now.setHours(23, 59, 59, 999);
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = new Date(now);
    date.setDate(now.getDate() - offset);
    labels.push(date.toISOString().slice(0, 10));
  }
  return labels;
}

/** Fills gaps so a chart always has one point per day, even with no data. */
function toDailySeries(labels, rows, key = 'count') {
  const byDate = new Map(rows.map((row) => [String(row._id), Number(row[key]) || 0]));
  return labels.map((date) => ({ date, value: byDate.get(date) || 0 }));
}

function buildDateRange(days) {
  const labels = buildDailyLabels(days);
  return { labels, startDate: new Date(`${labels[0]}T00:00:00.000Z`) };
}

/** Single entry point: query string -> `{ range, days, labels, startDate }`. */
function resolveRange(range = DEFAULT_RANGE) {
  const days = parseRangeDays(range);
  return { range, days, ...buildDateRange(days) };
}

/** Percentage with one decimal, e.g. 12.3. */
function toRate(value, total) {
  if (!total) return 0;
  return Math.round((value / total) * 1000) / 10;
}

/** Adds `conversionFromStart` / `conversionFromPrev` to ordered funnel steps. */
function withConversionRates(steps) {
  const first = steps[0]?.value || 1;
  return steps.map((step, index) => ({
    ...step,
    conversionFromStart: toRate(step.value, first),
    conversionFromPrev:
      index === 0 ? 100 : toRate(step.value, Math.max(1, steps[index - 1].value)),
  }));
}

module.exports = {
  RANGE_TO_DAYS,
  DEFAULT_RANGE,
  parseRangeDays,
  buildDailyLabels,
  buildDateRange,
  toDailySeries,
  resolveRange,
  toRate,
  withConversionRates,
};
