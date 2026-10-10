export const COLLECTIONS = ['tasks', 'goals', 'ideas', 'days', 'awards', 'wishes', 'purchases'];
export const LEVELS = ['strategy', 'quarter', 'month', 'week', 'project'];
export function emptyState() { return { version: 2, tasks: [], goals: [], ideas: [], days: [], awards: [], wishes: [], purchases: [] }; }
export function dateKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export function shiftDate(key, count) { const d = new Date(key + 'T12:00:00'); d.setDate(d.getDate() + count); return dateKey(d); }
export function validDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(value + 'T12:00:00');
  return Number.isFinite(d.getTime()) && dateKey(d) === value;
}
export function planningPeriod(kind, index, year) {
  if (!['half', 'quarter'].includes(kind) || !Number.isInteger(index) || index < 1 || index > (kind === 'half' ? 2 : 4) || !Number.isInteger(year) || year < 1900 || year > 2200) throw new Error('Выберите полугодие или квартал, его номер и год.');
  return `${['I', 'II', 'III', 'IV'][index - 1]} ${kind === 'half' ? 'полугодие' : 'квартал'} ${year}`;
}
export function parsePlanningPeriod(value) {
  if (typeof value !== 'string') return null;
  const match = value.trim().match(/^(I{1,3}|IV|[1-4])(?:-?[ей])?\s+(полугодие|квартал)\s+(\d{4})(?:\s*г(?:од(?:а)?)?\.?)?$/i);
  if (!match) return null;
  const kind = match[2].toLowerCase() === 'полугодие' ? 'half' : 'quarter';
  const index = ['I', 'II', 'III', 'IV'].indexOf(match[1].toUpperCase()) + 1 || Number(match[1]), year = Number(match[3]);
  try { planningPeriod(kind, index, year); return { kind, index, year }; } catch { return null; }
}
export function planningPeriodRange(kind, index) {
  planningPeriod(kind, index, 2000);
  return (kind === 'half' ? ['январь — июнь', 'июль — декабрь'] : ['январь — март', 'апрель — июнь', 'июль — сентябрь', 'октябрь — декабрь'])[index - 1];
}
export function calendarPeriod(kind, start, end = '') {
  if (kind === 'month') {
    if (!/^\d{4}-\d{2}$/.test(start) || !validDate(start + '-01')) throw new Error('Выберите месяц и год.');
    const next = new Date(start + '-01T12:00:00'); next.setMonth(next.getMonth() + 1);
    return { kind, start: start + '-01', end: shiftDate(dateKey(next), -1), period: `Месяц ${start}` };
  }
  if (!validDate(start)) throw new Error('Укажите дату начала.');
  if (kind === 'week') {
    start = shiftDate(start, -((new Date(start + 'T12:00:00').getDay() + 6) % 7));
    end = shiftDate(start, 6);
  } else if (kind !== 'range' || !validDate(end) || end < start) throw new Error('Дата окончания должна быть не раньше начала.');
  return { kind, start, end, period: `${kind === 'week' ? 'Неделя ' : ''}${start} — ${end}` };
}
export function parseCalendarPeriod(value) {
  if (typeof value !== 'string') return null;
  try {
    const month = value.match(/^Месяц (\d{4}-\d{2})$/);
    if (month) return calendarPeriod('month', month[1]);
    const range = value.match(/^(Неделя )?(\d{4}-\d{2}-\d{2}) — (\d{4}-\d{2}-\d{2})$/);
    if (range) {
      const result = calendarPeriod(range[1] ? 'week' : 'range', range[2], range[3]);
      return result.start === range[2] && result.end === range[3] ? result : null;
    }
  } catch { return null; }
  return null;
}
export function calendarPeriodLabel(value) {
  const period = parseCalendarPeriod(value);
  if (!period) return value;
  const format = key => new Date(key + 'T12:00:00').toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
  if (period.kind === 'month') return new Date(period.start + 'T12:00:00').toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
  return `${period.kind === 'week' ? 'Неделя: ' : ''}${format(period.start)} — ${format(period.end)}`;
}
export function periodOverlaps(value, start, end) {
  const period = parseCalendarPeriod(value);
  return !!period && period.start <= end && period.end >= start;
}
export function validateState(input) {
  if (!input || ![1, 2].includes(input.version)) throw new Error('Это не резервная копия Опоры поддерживаемой версии.');
  const result = emptyState();
  const string = (v, limit) => typeof v === 'string' && v.length <= limit;
  for (const collection of COLLECTIONS) {
    const records = input[collection] ?? (input.version === 1 && ['awards', 'wishes', 'purchases'].includes(collection) ? [] : undefined);
    if (!Array.isArray(records) || records.length > 10000) throw new Error('Неверный формат или слишком много записей.');
    const ids = new Set();
    result[collection] = records.map(record => {
      if (!record || !string(record.id, collection === 'awards' ? 110 : 100) || !/^[a-zA-Z0-9_.:-]+$/.test(record.id) || ids.has(record.id) || !string(record.updatedAt, 40) || !Number.isFinite(Date.parse(record.updatedAt))) throw new Error('В копии есть повреждённые записи.');
      ids.add(record.id);
      const base = { id: record.id, updatedAt: record.updatedAt, deleted: record.deleted === true };
      if (base.deleted) return base;
      if (collection === 'days') {
        if (!validDate(record.id) || !string(record.focus, 500) || !string(record.review, 5000) || (record.closed !== undefined && typeof record.closed !== 'boolean')) throw new Error('Неверный формат плана дня.');
        return { ...base, focus: record.focus, review: record.review, closed: record.closed === true };
      }
      if (!string(record.title, 500) || !record.title.trim() || !string(record.notes || '', 5000)) throw new Error('Неверный формат текста записи.');
      const text = { ...base, title: record.title, notes: record.notes || '' };
      if (collection === 'awards') {
        if (!['tasks', 'goals'].includes(record.sourceType) || !string(record.sourceId, 100) || record.id !== `${record.sourceType}.${record.sourceId}` || !/^[a-zA-Z0-9_.:-]+$/.test(record.sourceId) || typeof record.earned !== 'boolean' || !['xp', 'coins', 'gold'].every(k => Number.isSafeInteger(record[k]) && record[k] >= 0 && record[k] <= 1000)) throw new Error('Неверный формат игровой награды.');
        return { ...text, sourceType: record.sourceType, sourceId: record.sourceId, earned: record.earned, xp: record.xp, coins: record.coins, gold: record.gold };
      }
      if (collection === 'wishes' || collection === 'purchases') {
        if (!['coins', 'gold'].includes(record.currency) || !Number.isSafeInteger(record.cost) || record.cost < 1 || record.cost > 1000000) throw new Error('Укажите валюту и целую цену от 1 до 1000000.');
        if (collection === 'wishes') {
          if (typeof record.repeatable !== 'boolean') throw new Error('Неверный формат желания.');
          return { ...text, currency: record.currency, cost: record.cost, repeatable: record.repeatable };
        }
        if (!string(record.wishId, 100) || !/^[a-zA-Z0-9_.:-]+$/.test(record.wishId) || typeof record.fulfilled !== 'boolean') throw new Error('Неверный формат покупки.');
        return { ...text, currency: record.currency, cost: record.cost, wishId: record.wishId, fulfilled: record.fulfilled };
      }
      if (['tasks', 'goals'].includes(collection) && ((record.profitable !== undefined && typeof record.profitable !== 'boolean') || (record.effort !== undefined && ![1, 3, 5].includes(record.effort)))) throw new Error('Неверный формат награды за дело.');
      const game = { ...(record.profitable === undefined ? {} : { profitable: record.profitable }), ...(record.effort === undefined ? {} : { effort: record.effort }) };
      if (collection === 'tasks') {
        if (!validDate(record.date) || typeof record.done !== 'boolean' || typeof record.hot !== 'boolean' || !string(record.goalId || '', 100) || !string(record.parentTaskId || '', 100)) throw new Error('Неверный формат задачи.');
        return { ...text, ...game, date: record.date, done: record.done, hot: record.hot, goalId: record.goalId || '', parentTaskId: record.parentTaskId || '' };
      }
      if (collection === 'goals') {
        if (!LEVELS.includes(record.level) || !string(record.period, 100) || !string(record.parentId || '', 100) || !Number.isFinite(record.progress) || record.progress < 0 || record.progress > 100) throw new Error('Неверный формат цели.');
        return { ...text, ...game, level: record.level, period: record.period, parentId: record.parentId || '', progress: record.progress };
      }
      if (!['inbox', 'later', 'archived'].includes(record.status)) throw new Error('Неверный формат мысли.');
      return { ...text, status: record.status };
    });
  }
  return result;
}
export function mergeStates(left, right) {
  const a = validateState(left), b = validateState(right), merged = emptyState();
  for (const key of COLLECTIONS) {
    const records = new Map(a[key].map(record => [record.id, record]));
    for (const record of b[key]) {
      const previous = records.get(record.id);
      const sameTime = previous && Date.parse(record.updatedAt) === Date.parse(previous.updatedAt);
      if (!previous || Date.parse(record.updatedAt) > Date.parse(previous.updatedAt) || (sameTime && ((record.deleted && !previous.deleted) || (record.deleted === previous.deleted && JSON.stringify(record) > JSON.stringify(previous))))) records.set(record.id, record);
    }
    merged[key] = [...records.values()].sort((x, y) => x.id.localeCompare(y.id));
  }
  return merged;
}
export function active(records) { return records.filter(record => !record.deleted); }
export function encodeState(state) {
  const bytes = new TextEncoder().encode(JSON.stringify(validateState(state), null, 2));
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}
export function decodeState(content) {
  const bytes = Uint8Array.from(atob(content.replace(/\s/g, '')), char => char.charCodeAt(0));
  return validateState(JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)));
}
