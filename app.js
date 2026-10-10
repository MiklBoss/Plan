import { emptyState, dateKey, shiftDate, validDate, validateState, mergeStates, active, encodeState, decodeState, LEVELS, planningPeriod, parsePlanningPeriod, planningPeriodRange, calendarPeriod, parseCalendarPeriod, calendarPeriodLabel, periodOverlaps, COLLECTIONS } from './core.js';
import { updateAward, gameTotals, rewardFor, purchaseWish, earnedAwards, resetGame } from './game.js';

const KEY = 'opora.data.v1', CONFIG = 'opora.github.v1', TIMER = 'opora.timer.v1';
const app = document.querySelector('#app'), dialog = document.querySelector('#dialog');
const icons = {
  day: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 3v4m10-4v4M3 11h18m-12 4h3"/>',
  strategy: '<path d="m3 20 6-14 4 7 3-4 5 11H3Zm6-14V3m0 0h5l-2 2h-3"/>',
  quarter: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  month: '<path d="M4 5h16M4 12h16M4 19h16M8 3v18m8-18v18"/>',
  project: '<rect x="3" y="7" width="18" height="14" rx="3"/><path d="M8 7V4h8v3M3 12h18m-11 0v3h4v-3"/>',
  inbox: '<path d="M4 4h16l2 13v3H2v-3L4 4Zm-2 12h6l2 3h4l2-3h6M8 8h8m-7 4h6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>', check: '<path d="m5 12 4 4 10-10"/>', arrow: '<path d="M5 12h14m-5-5 5 5-5 5"/>',
  flame: '<path d="M12 3c1 5 6 5 6 11a6 6 0 0 1-12 0c0-3 2-5 3-6 0 3 1 4 2 4 2-2 2-5 1-9Z"/>',
  focus: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><path d="M12 1v4m0 14v4M1 12h4m14 0h4"/>',
  cloud: '<path d="M7 18H5a4 4 0 0 1-1-8 7 7 0 0 1 13-2 5 5 0 0 1 2 10h-2m-5 3V11m-4 4 4-4 4 4"/>',
  settings: '<path d="M4 6h16M4 12h16M4 18h16"/><circle cx="8" cy="6" r="2" fill="currentColor"/><circle cx="16" cy="12" r="2" fill="currentColor"/><circle cx="10" cy="18" r="2" fill="currentColor"/>',
  leaf: '<path d="M5 19C-2 7 9 4 20 3c1 13-6 20-15 16Zm0 0L16 8"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>', chevron: '<path d="m9 5 7 7-7 7"/>', back: '<path d="m15 5-7 7 7 7"/>',
  play: '<path d="m9 5 11 7-11 7V5Z"/>', pause: '<path d="M8 5v14M16 5v14"/>', reset: '<path d="M3 10a9 9 0 1 1 2 8M3 4v6h6"/>',
  edit: '<path d="m15 4 5 5M4 20l4-1L20 7a3 3 0 0 0-4-4L4 15v5Z"/>', trash: '<path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7"/>',
  moon: '<path d="M20 15A9 9 0 0 1 9 4a9 9 0 1 0 11 11Z"/>', book: '<path d="M12 5C8 2 3 4 3 4v15s5-2 9 1c4-3 9-1 9-1V4s-5-2-9 1Zm0 0v15"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1 1m12 12 1 1M5 19l1-1M18 6l1-1"/>',
  download: '<path d="M12 3v12m-5-5 5 5 5-5M4 17v4h16v-4"/>', upload: '<path d="M12 16V4m-5 5 5-5 5 5M4 17v4h16v-4"/>',
  dot: '<circle cx="12" cy="12" r="3"/>', spark: '<path d="m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3 3-7Z"/>'
};
const icon = (name, cls = '') => `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name] || icons.dot}</svg>`;
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const labels = { strategy: 'Стратегия', quarter: 'Полугодие · квартал', month: 'Месяц', week: 'Неделя', project: 'Проекты' };
const captions = { strategy: '1–10 лет', quarter: 'Большие шаги', month: 'Ближайшие планы', week: 'Следующие шаги', project: 'От замысла к действию' };
let state = emptyState(), storageFailed = false;
try { const saved = localStorage.getItem(KEY); if (saved) state = validateState(JSON.parse(saved)); }
catch { storageFailed = true; }
let config = {};
try { config = JSON.parse(localStorage.getItem(CONFIG) || '{}'); } catch { /* Keep planner usable. */ }
let dayStartDraft = null, focusTaskId = '';
let page = 'day', planLevel = 'month', selectedDate = dateKey(), ideaFilter = 'inbox', focusMode = false, syncing = false, lastStamp = 0, dialogReturnFocus;
const periodView = { kind: 'quarter', year: new Date().getFullYear(), half: Math.floor(new Date().getMonth() / 6) + 1, quarter: Math.floor(new Date().getMonth() / 3) + 1 };
const planView = { month: dateKey().slice(0, 7), week: dateKey(), scope: 'period' };
let timer = { remaining: 25 * 60, end: null, sessions: 0 };
try { timer = { ...timer, ...JSON.parse(sessionStorage.getItem(TIMER) || '{}') }; } catch { /* Reset invalid timer. */ }
if (!Number.isFinite(timer.remaining) || timer.remaining < 0 || (timer.end !== null && !Number.isFinite(timer.end))) timer = { remaining: 1500, end: null, sessions: 0 };
const stamp = () => { lastStamp = Math.max(Date.now(), lastStamp + 1, ...COLLECTIONS.map(key => Math.max(0, ...state[key].map(r => Date.parse(r.updatedAt) + 1)))); return new Date(lastStamp).toISOString(); };
const uid = () => crypto.randomUUID();
const visible = key => active(state[key]);
const goal = id => visible('goals').find(g => g.id === id);
const task = id => visible('tasks').find(t => t.id === id);
const isHot = t => t.hot || visible('tasks').some(c => c.parentTaskId === t.id && c.date === t.date && c.hot && (!c.done || !visible('days').find(d => d.id === t.date)?.closed));
const day = () => visible('days').find(d => d.id === selectedDate) || { id: selectedDate, focus: '', review: '', closed: false };
function save() {
  try { if (storageFailed && localStorage.getItem(KEY)) return; localStorage.setItem(KEY, JSON.stringify(state)); storageFailed = false; }
  catch { storageFailed = true; toast('Не удалось сохранить в браузере. Скачайте резервную копию.'); }
  updateSaved();
}
function updateSaved() {
  const status = document.querySelector('#saved-status');
  if (status) status.innerHTML = `${icon(storageFailed ? 'close' : 'check')} ${storageFailed ? 'Есть несохранённые данные' : 'Сохранено на устройстве'}`;
}
function put(collection, record, { game = true } = {}) {
  const value = { ...record, updatedAt: stamp(), deleted: false };
  const index = state[collection].findIndex(r => r.id === value.id);
  const previous = state[collection][index];
  if (index === -1) state[collection].push(value); else state[collection][index] = value;
  if (game) updateAward(state, collection, value, previous);
  save(); return value;
}
function remove(collection, id) {
  const record = state[collection].find(r => r.id === id);
  if (!record) return;
  updateAward(state, collection, { ...record, updatedAt: stamp() }, record);
  state[collection] = state[collection].map(r => r.id === id ? { id, deleted: true, updatedAt: stamp() } : r);
  if (collection === 'tasks') visible('tasks').filter(t => t.parentTaskId === id).forEach(t => put('tasks', { ...t, parentTaskId: '' }));
  if (collection === 'goals') {
    visible('goals').filter(g => g.parentId === id).forEach(g => put('goals', { ...g, parentId: '' }));
    visible('tasks').filter(t => t.goalId === id).forEach(t => put('tasks', { ...t, goalId: '' }));
  }
  save(); render(); toast('Запись удалена');
}
let toastTimeout;
function toast(message) {
  const box = document.querySelector('#toast'); box.textContent = message; box.classList.add('show');
  clearTimeout(toastTimeout); toastTimeout = setTimeout(() => box.classList.remove('show'), 4200);
}
const button = (action, text, name = '', cls = '', attrs = '') => `<button type="button" data-action="${action}" class="${cls}" ${attrs}>${name ? icon(name) : ''}${text}</button>`;
const dateLabel = key => new Date(key + 'T12:00:00').toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
function sidebar() {
  const count = visible('ideas').filter(i => i.status === 'inbox').length;
  const mobileLabels = { day: 'Сегодня', strategy: 'Стратегия', quarter: 'Периоды', plans: 'Планы', project: 'Проекты', inbox: 'Мысли' };
  const nav = (id, title, subtitle, name) => `<button class="nav-item ${page === id ? 'active' : ''}" data-action="navigate" data-page="${id}" aria-label="${esc(title)}${id === 'inbox' && count ? `, новых мыслей: ${count}` : ''}" ${page === id ? 'aria-current="page"' : ''}>${icon(name)}<span class="nav-label-full">${title}${subtitle ? `<small>${subtitle}</small>` : ''}</span><span class="nav-label-mobile" aria-hidden="true">${mobileLabels[id]}</span>${id === 'inbox' && count ? `<b class="nav-count" aria-hidden="true">${count > 99 ? '99+' : count}</b>` : ''}</button>`;
  return `<aside class="sidebar"><a class="brand" href="#" data-action="navigate" data-page="day"><span class="brand-symbol"><i></i><i></i><i></i></span>опора<span class="brand-period">.</span></a><p class="brand-caption">Пространство для важного</p>
    <div class="nav-label">МОЙ ДЕНЬ</div>${nav('day', 'Сегодня', 'Один день. Один фокус.', 'day')}
    <div class="nav-label horizons-label">ГОРИЗОНТЫ</div>${nav('strategy', 'Стратегия', '1–10 лет', 'strategy')}${nav('quarter', 'Полугодие · квартал', '', 'quarter')}${nav('plans', 'Месяц · неделя', '', 'month')}${nav('project', 'Проекты', '', 'project')}
    <div class="nav-separator"></div>${nav('inbox', 'Выгрузка мыслей', 'Освободить голову', 'inbox')}
    <div class="sidebar-bottom"><div class="sidebar-note">${icon('leaf')}<p>Не нужно успеть всё.<br><strong>Нужно сделать важное.</strong></p></div>${button('settings', 'Настройки и синхронизация', 'settings', 'settings-nav')}<div class="local-status"><span></span> Личное пространство</div></div>
  </aside>`;
}
function render() {
  document.body.classList.toggle('focus-mode', focusMode);
  if (focusMode) { renderFocus(); return; }
  app.innerHTML = `${sidebar()}<main class="main"><header class="topbar"><span class="breadcrumb">Моё пространство <span>/</span> ${page === 'day' ? 'Сегодня' : page === 'inbox' ? 'Выгрузка мыслей' : page === 'plans' ? 'Месяц · неделя' : labels[page]}</span><div class="topbar-right"><span id="saved-status" class="saved-status"></span>${button('game-shop', '', 'spark', 'icon-button', 'aria-label="Герой и магазин радостей" title="Герой и магазин"')}${button('toggle-theme', '', document.documentElement.dataset.theme === 'dark' ? 'sun' : 'moon', 'icon-button', `aria-label="${document.documentElement.dataset.theme === 'dark' ? 'Включить светлую тему' : 'Включить тёмную тему'}" title="Переключить тему"`)}${button('sync-settings', 'Синхронизация', 'cloud', 'btn btn-small btn-light', 'aria-label="Синхронизация между устройствами"')}${button('capture', 'Записать мысль', 'plus', 'btn btn-small btn-light')}${button('settings', '', 'settings', 'icon-button mobile-settings', 'aria-label="Настройки"')}</div></header>
    <div class="content">${storageFailed ? '<div class="warning">Не удалось прочитать или сохранить данные. Скачайте копию в настройках. Исходные данные в браузере не перезаписываются.</div>' : ''}${localStorage.getItem('opora.example') ? `<div class="demo-banner"><span>${icon('book')} Это пример. Отредактируйте планы или начните со своих.</span>${button('clear-example', 'Убрать пример', '', 'text-button')}</div>` : ''}${page === 'day' ? renderDay() : page === 'inbox' ? renderIdeas() : renderGoals(page === 'plans' ? planLevel : page)}</div><footer class="page-footer"><span>Меньше шума. Больше смысла.</span><span>Опора <span class="footer-dot">·</span> шаг за шагом</span></footer></main>`;
  updateSaved(); updateTimer();
}
function renderDay() {
  const today = dateKey(), record = day(), tasks = visible('tasks').filter(t => t.date === selectedDate), roots = tasks.filter(t => !tasks.some(p => p.id === t.parentTaskId)), completed = tasks.filter(t => t.done).length;
  const shown = record.closed ? roots.filter(t => !t.done) : roots;
  const hot = shown.filter(isHot), ordinary = shown.filter(t => !isHot(t));
  const done = tasks.filter(t => t.done && !tasks.some(p => p.id === t.parentTaskId && p.done));
  const weekday = new Date(selectedDate + 'T12:00:00').toLocaleDateString('ru-RU', { weekday: 'long' });
  return `<section class="page-heading"><div><div class="eyebrow">${selectedDate === today ? 'СЕГОДНЯ — ХОРОШИЙ ДЕНЬ ДЛЯ ВАЖНОГО' : 'У КАЖДОГО ДНЯ СВОЙ РИТМ'}</div><h1>${selectedDate === today ? 'Начнём с главного' : 'План на ' + dateLabel(selectedDate)}<span class="heading-dot">.</span></h1><p>Не весь список жизни. Только то, что имеет значение сегодня.</p></div><div class="date-display"><span>${weekday}</span><strong>${dateLabel(selectedDate)}</strong><small>${new Date(selectedDate + 'T12:00:00').getFullYear()}</small></div></section>
    <div class="day-navigation"><div class="week-strip">${Array.from({ length: 7 }, (_, i) => {
      const d = new Date(selectedDate + 'T12:00:00'), monday = shiftDate(selectedDate, -((d.getDay() + 6) % 7)), key = shiftDate(monday, i);
      const num = visible('tasks').filter(t => t.date === key && !t.done).length;
      return `<button data-action="date" data-date="${key}" class="week-day ${key === selectedDate ? 'selected' : ''} ${key === today ? 'is-today' : ''}" aria-label="${dateLabel(key)}"><span>${['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'][i]}</span><b>${Number(key.slice(-2))}</b><i class="${num ? 'has-tasks' : ''}"></i></button>`;
    }).join('')}</div><div class="date-controls">${button('previous-day', '', 'back', 'icon-button', 'aria-label="Предыдущий день"')}${button('today', 'Сегодня', '', 'btn btn-small btn-light')}${button('next-day', '', 'chevron', 'icon-button', 'aria-label="Следующий день"')}<label class="date-picker" title="Выбрать дату">${icon('day')}<input type="date" id="date-picker" value="${selectedDate}" aria-label="Выбрать дату"></label></div></div>
    <div class="day-grid"><div class="day-main">${record.closed ? '' : `<div class="day-start-entry">${button('start-day', selectedDate === today ? 'Начать мой день' : 'Подготовить этот день', 'sun', 'btn btn-light')}<span>Выбрать главное и первый шаг</span></div>`}${heroCard()}<section class="focus-card"><div class="focus-top"><span class="small-label">${icon('focus')} ФОКУС ДНЯ</span><span class="focus-tag">Одно самое важное</span></div><label class="sr-only" for="day-focus">Фокус дня</label><textarea id="day-focus" rows="2" maxlength="500" placeholder="Что сделает этот день не напрасным?">${esc(record.focus)}</textarea><div class="focus-bottom"><span>${icon('leaf')} Выберите результат, а не список дел</span>${button('focus-mode', 'Сосредоточиться', 'arrow', 'focus-enter')}</div><svg class="focus-decoration" viewBox="0 0 180 180" aria-hidden="true"><g fill="none" stroke="currentColor"><circle cx="130" cy="130" r="95"/><circle cx="130" cy="130" r="72"/><circle cx="130" cy="130" r="49"/><path d="M35 130h190M130 35v190"/></g></svg></section>
    <section class="task-section"><div class="section-heading"><h2>${icon('flame')} Горячие задачи <span class="number-badge">${hot.filter(t => !t.done).length}</span></h2><span class="section-caption">До 3 главных — уже достаточно</span></div>${hot.length ? `<div class="task-list hot-list">${hot.map(t => taskRow(t, { hideCompleted: record.closed })).join('')}</div>` : '<div class="empty-inline">Выберите задачи, которые требуют внимания сегодня.</div>'}</section>
    <section class="task-section"><div class="section-heading"><h2>Остальные задачи <span class="number-badge">${ordinary.filter(t => !t.done).length}</span></h2>${button('new-task', 'Добавить', 'plus', 'text-button')}</div>${ordinary.length ? `<div class="task-list">${ordinary.map(t => taskRow(t, { hideCompleted: record.closed })).join('')}</div>` : '<div class="empty-inline">Здесь может быть пусто. Оставьте место для жизни.</div>'}<form id="quick-task" class="quick-add">${icon('plus')}<input name="title" maxlength="500" placeholder="Небольшой следующий шаг…" aria-label="Новая задача" required autocomplete="off"><button type="submit" class="quick-submit" aria-label="Добавить задачу">${icon('arrow')}</button></form></section>
    ${record.closed && done.length ? `<details class="completed-section"><summary>${icon('check')} Выполненные задачи · архив <span>${completed}</span></summary><div class="task-list">${done.map(taskRow).join('')}</div></details>` : ''}
    ${overduePanel()}${datedPlansPanel()}
    <section class="review-card"><div class="section-heading"><h2>${icon('moon')} Закрыть день</h2><span class="section-caption">Без оценок. С заботой о себе.</span></div><label for="day-review">Что получилось? Что хочется взять в завтра?</label><textarea id="day-review" rows="2" maxlength="5000" placeholder="Даже маленький шаг — это движение вперёд.">${esc(record.review)}</textarea>${dayClosureControls(record)}</section>
    </div><aside class="day-aside"><section class="card progress-card"><div class="section-heading"><h3>Ритм дня</h3>${icon('spark')}</div><div class="progress-ring" style="--progress:${tasks.length ? completed / tasks.length * 100 : 0}%"><div><strong>${completed}<span> / ${tasks.length}</span></strong><small>задач завершено</small></div></div><p>${completed && completed === tasks.length ? 'Важное сделано. Можно выдохнуть.' : 'Каждый маленький шаг считается.'}</p></section>
    ${timerCard()}
    <section class="card capture-card"><span class="capture-illustration">${icon('inbox')}</span><h3>Мысль пришла не вовремя?</h3><p>Запишите её и вернитесь к делу.<br>Она никуда не потеряется.</p>${button('capture', 'Освободить голову', 'plus', 'btn btn-light')}</section>
    <div class="keyboard-hint"><kbd>N</kbd> задача <span>·</span> <kbd>I</kbd> мысль <span>·</span> <kbd>F</kbd> фокус</div></aside></div>
    ${visible('tasks').length === 0 && visible('goals').length === 0 ? `<section class="welcome"><div>${icon('book')}<span><strong>Ваше пространство начинается с одного шага</strong><small>Запишите фокус дня или посмотрите, как связаны цели, проекты и задачи.</small></span></div>${button('example', 'Посмотреть пример', 'arrow', 'text-button')}</section>` : ''}`;
}
function overduePanel() {
  const overdue = visible('tasks').filter(t => !t.done && t.date < dateKey() && !t.parentTaskId);
  if (!overdue.length || selectedDate !== dateKey()) return '';
  return `<details class="overdue-section"><summary>${icon('inbox')} Остались с прошлых дней <span>${overdue.length}</span></summary><p class="muted">Перенесите нужное или выгрузите задачу, чтобы она не забирала внимание.</p>${overdue.map(t => `<div class="overdue-row"><span>${esc(t.title)}<small>${dateLabel(t.date)}</small></span>${button('move-today', 'На сегодня', '', 'text-button', `data-id="${t.id}"`)}${button('park-task', 'Отложить', '', 'text-button', `data-id="${t.id}"`)}</div>`).join('')}</details>`;
}
function dayClosureControls(record) {
  return `<div class="day-closure"><p>${record.closed ? 'День закрыт. Выполненные задачи сохранены, незавершённые остаются в плане.' : 'Выполненные задачи остаются в списке зачёркнутыми, пока вы не закроете день.'}</p>${button(record.closed ? 'reopen-day' : 'close-day', record.closed ? 'Открыть день снова' : 'Закрыть день', record.closed ? 'reset' : 'check', record.closed ? 'btn btn-light' : 'btn btn-primary')}</div>`;
}
function taskRow(t, { hideCompleted = false } = {}) {
  const children = visible('tasks').filter(c => c.parentTaskId === t.id && c.date === t.date && (!hideCompleted || !c.done)), linked = goal(t.goalId);
  return `<div class="task-wrapper"><div class="task-row ${t.done ? 'done' : ''} ${t.parentTaskId ? 'subtask' : ''}"><button class="task-check ${t.done ? 'checked' : ''}" data-action="toggle-task" data-id="${t.id}" aria-label="${t.done ? 'Вернуть' : 'Завершить'}: ${esc(t.title)}" aria-pressed="${t.done}">${t.done ? icon('check') : ''}</button><button class="task-text" data-action="edit-task" data-id="${t.id}"><span>${esc(t.title)}</span>${linked || children.length || t.notes ? `<small>${linked ? `${icon('project')}${esc(linked.title)}` : ''}${children.length ? `<span>${children.filter(c => c.done).length}/${children.length} подзадач</span>` : ''}${t.notes ? '<span>Есть заметка</span>' : ''}</small>` : ''}</button><div class="task-actions">${!t.parentTaskId ? button('subtask', '', 'plus', 'icon-button', `data-id="${t.id}" aria-label="Добавить подзадачу"`) : ''}${button('hot-task', '', 'flame', `icon-button ${t.hot ? 'is-hot' : ''}`, `data-id="${t.id}" aria-label="${t.hot ? 'Снять' : 'Добавить'} приоритет" aria-pressed="${t.hot}"`)}</div></div>${children.map(c => taskRow(c, { hideCompleted })).join('')}</div>`;
}
function timerCard() {
  return `<section class="card timer-card"><div class="section-heading"><h3>${icon('focus')} Время для фокуса</h3><span class="timer-dot"></span></div><p>Одно дело. Без переключений.</p><div class="timer-time" id="timer-time">25:00</div><div class="timer-controls">${button('timer-toggle', timer.end ? 'Пауза' : 'Начать 25 минут', timer.end ? 'pause' : 'play', 'btn btn-primary', 'id="timer-toggle"')}${button('timer-reset', '', 'reset', 'icon-button', 'aria-label="Сбросить таймер"')}</div><small id="timer-sessions">${timer.sessions ? `Сегодня в этой вкладке: ${timer.sessions} сессий` : 'Можно начать с одного спокойного отрезка'}</small></section>`;
}
function renderFocus() {
  const tasks = visible('tasks').filter(t => t.date === selectedDate && (!day().closed || !t.done) && (focusTaskId ? t.id === focusTaskId : isHot(t) && !t.parentTaskId));
  app.innerHTML = `<main class="focus-screen"><div class="focus-screen-top"><span class="brand mini-brand">опора.</span>${button('exit-focus', 'Вернуться к плану', 'close', 'btn btn-light')}</div><div class="focus-screen-content"><div class="eyebrow">СЕЙЧАС ЕСТЬ ТОЛЬКО ЭТОТ ШАГ</div><h1>${esc(day().focus || 'Выберите одно дело и побудьте с ним.')}</h1><p class="muted">${dateLabel(selectedDate)} · остальное может подождать</p>${timerCard()}${tasks.length ? `<div class="focus-tasks">${tasks.map(t => taskRow(t, { hideCompleted: day().closed })).join('')}</div>` : ''}${button('capture', 'Записать отвлекающую мысль', 'plus', 'text-button')}<span class="escape-hint">Esc — вернуться к плану</span></div></main>`;
  updateTimer();
}
function datedPlansPanel() {
  const records = visible('goals').filter(g => periodOverlaps(g.period, selectedDate, selectedDate));
  if (!records.length) return '';
  return `<details class="dated-plans"><summary>${icon('day')} Планы на этот день <span>${records.length}</span></summary>${records.map(g => `<button class="linked-goal" data-action="goal-details" data-id="${g.id}"><span>${esc(g.title)}<small>${esc(calendarPeriodLabel(g.period))}</small></span>${icon('arrow')}</button>`).join('')}</details>`;
}
function selectedPlanPeriod(level = planLevel) { return calendarPeriod(level, planView[level]); }
function calendarSelector() {
  const p = selectedPlanPeriod();
  return `<section class="period-selector" aria-label="Выбор месяца или недели"><div class="period-toolbar"><div class="tabs">${[['period', 'Выбранный период'], ['unassigned', 'Без точных дат']].map(([scope, label]) => button('plan-scope', label, '', `tab ${planView.scope === scope ? 'active' : ''}`, `data-scope="${scope}" aria-pressed="${planView.scope === scope}"`)).join('')}</div></div>${planView.scope === 'period' ? `<div class="calendar-navigation">${button('plan-previous', 'Назад', 'back', 'btn btn-light')}<label class="field">${planLevel === 'month' ? 'Месяц и год' : 'Любой день нужной недели'}<input id="plan-date" type="${planLevel === 'month' ? 'month' : 'date'}" value="${planView[planLevel]}" required></label>${button('plan-next', 'Вперёд', 'chevron', 'btn btn-light')}</div><p class="period-current">${icon('day')} ${esc(calendarPeriodLabel(p.period))}</p><p class="period-form-preview">Показаны планы с датами, которые пересекаются с этим периодом.</p>` : '<p class="period-current">Планы с прежним текстом периода сохранены здесь. В редактировании можно выбрать точные даты.</p>'}</section>`;
}
function periodSelector(records) {
  const unassigned = records.filter(g => !parsePlanningPeriod(g.period));
  const tabs = [['half', 'Полугодие'], ['quarter', 'Квартал']];
  if (unassigned.length) tabs.push(['unassigned', `Без периода <span>${unassigned.length}</span>`]);
  return `<section class="period-selector" aria-label="Выбор полугодия или квартала"><div class="period-toolbar"><div class="tabs">${tabs.map(([kind, label]) => button('period-kind', label, '', `tab ${periodView.kind === kind ? 'active' : ''}`, `data-kind="${kind}" aria-pressed="${periodView.kind === kind}"`)).join('')}</div>${periodView.kind !== 'unassigned' ? `<label class="period-year">Год<input id="period-year" type="number" min="1900" max="2200" step="1" value="${periodView.year}" required></label>` : ''}</div>${periodView.kind !== 'unassigned' ? `<div class="period-options">${Array.from({ length: periodView.kind === 'half' ? 2 : 4 }, (_, i) => {
    const index = i + 1, count = records.filter(g => { const p = parsePlanningPeriod(g.period); return p?.kind === periodView.kind && p.index === index && p.year === periodView.year; }).length;
    return `<button type="button" data-action="period-index" data-index="${index}" class="period-option ${index === periodView[periodView.kind] ? 'selected' : ''}" aria-pressed="${index === periodView[periodView.kind]}"><strong>${['I', 'II', 'III', 'IV'][i]} ${periodView.kind === 'half' ? 'полугодие' : 'квартал'}</strong><span>${planningPeriodRange(periodView.kind, index)}</span><small>${count} ${count === 1 ? 'цель' : count > 1 && count < 5 ? 'цели' : 'целей'}</small></button>`;
  }).join('')}</div><p class="period-current">${icon('day')} ${planningPeriod(periodView.kind, periodView[periodView.kind], periodView.year)} · ${planningPeriodRange(periodView.kind, periodView[periodView.kind])}</p>` : '<p class="period-current">Прежние цели с произвольным текстом периода сохранены здесь. Откройте редактирование и выберите точный период.</p>'}</section>`;
}
function renderGoals(level) {
  const allRecords = visible('goals').filter(g => g.level === level);
  const records = level === 'quarter' ? allRecords.filter(g => {
    const p = parsePlanningPeriod(g.period);
    return periodView.kind === 'unassigned' ? !p : p?.kind === periodView.kind && p.index === periodView[periodView.kind] && p.year === periodView.year;
  }) : ['month', 'week'].includes(level) ? (planView.scope === 'unassigned' ? allRecords.filter(g => !parseCalendarPeriod(g.period)) : visible('goals').filter(g => ['month', 'week', 'project'].includes(g.level) && periodOverlaps(g.period, selectedPlanPeriod(level).start, selectedPlanPeriod(level).end))) : allRecords;
  const intros = { strategy: ['Куда я хочу прийти', 'Задайте направление на 1–10 лет. Здесь не нужен подробный список дел.'], quarter: ['От направления к результату', 'Выберите несколько результатов на полугодие или квартал.'], month: ['Большое становится ближе', 'План на месяц и неделю — мост между целями и сегодняшним шагом.'], week: ['Следующая понятная неделя', 'Выберите посильные шаги. Оставьте место для непредвиденного.'], project: ['Замыслы в движении', 'Объединяйте задачи в проекты и связывайте их с вашими целями.'] };
  return `<section class="page-heading"><div><div class="eyebrow">${captions[level].toUpperCase()}</div><h1>${intros[level][0]}<span class="heading-dot">.</span></h1><p>${intros[level][1]}</p></div>${button('new-goal', level === 'project' ? 'Новый проект' : 'Добавить цель', 'plus', 'btn btn-primary', `data-level="${level}"`)}</section>
    ${level === 'quarter' ? periodSelector(allRecords) : ''}${page === 'plans' ? `<div class="tabs">${['month', 'week'].map(l => button('plan-level', labels[l], '', `tab ${level === l ? 'active' : ''}`, `data-level="${l}"`)).join('')}</div>${calendarSelector()}` : ''}
    <div class="horizon-path"><span>${icon('strategy')} Направление</span>${icon('chevron')}<span>Результат</span>${icon('chevron')}<span>План</span>${icon('chevron')}<span>${icon('project')} Проект</span>${icon('chevron')}<span>Шаг сегодня</span></div>
    ${records.length ? `<div class="goals-grid">${records.map(goalCard).join('')}</div>` : `<section class="large-empty">${icon(level === 'week' ? 'month' : level)}<h2>${level === 'project' ? 'Дайте замыслу своё место' : level === 'quarter' ? 'В этом периоде пока нет целей' : 'Начните с одной цели'}</h2><p>Что вы хотите изменить? Как поймёте, что получилось?<br>Свяжите этот результат с более широким направлением.</p>${button('new-goal', level === 'project' ? 'Создать проект' : 'Записать цель', 'plus', 'btn btn-primary', `data-level="${level}"`)}</section>`}
    <div class="soft-note">${icon('leaf')} План — это опора, а не обещание успеть всё. Его можно менять.</div>`;
}
function goalCard(g) {
  const linkedTasks = visible('tasks').filter(t => t.goalId === g.id), children = visible('goals').filter(c => c.parentId === g.id), parent = goal(g.parentId);
  return `<article class="goal-card"><div class="goal-card-top"><span class="period-tag">${esc(calendarPeriodLabel(g.period) || captions[g.level])}</span>${button('edit-goal', '', 'edit', 'icon-button', `data-id="${g.id}" aria-label="Редактировать: ${esc(g.title)}"`)}</div><h2>${esc(g.title)}</h2>${g.notes ? `<p class="goal-notes">${esc(g.notes)}</p>` : '<p class="goal-notes muted">Добавьте критерий результата и следующий шаг.</p>'}${parent ? `<button class="parent-link" data-action="open-goal" data-id="${parent.id}">${icon('strategy')} ${esc(parent.title)} ${icon('arrow')}</button>` : ''}<div class="goal-progress-label"><span>Продвижение</span><b>${g.progress}%</b></div><label class="sr-only" for="progress-${g.id}">Продвижение: ${esc(g.title)}</label><input id="progress-${g.id}" class="goal-progress" type="range" min="0" max="100" step="5" value="${g.progress}" data-goal="${g.id}" style="--progress:${g.progress}%"><div class="goal-card-footer"><span>${children.length} связанных целей · ${linkedTasks.filter(t => t.done).length}/${linkedTasks.length} задач</span>${button('goal-details', 'Открыть', 'arrow', 'text-button', `data-id="${g.id}"`)}</div></article>`;
}
function renderIdeas() {
  const records = visible('ideas').filter(i => i.status === ideaFilter).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return `<section class="page-heading"><div><div class="eyebrow">ПУСТЬ ГОЛОВА БУДЕТ СВОБОДНОЙ</div><h1>Место для всего остального<span class="heading-dot">.</span></h1><p>Мысли, идеи и зависшие задачи. Запишите сейчас — разберёте в своё время.</p></div>${button('capture', 'Записать мысль', 'plus', 'btn btn-primary')}</section>
    <form id="quick-idea" class="idea-capture"><label for="idea-text">Что крутится в голове?</label><textarea id="idea-text" name="title" rows="3" maxlength="500" required placeholder="Идея, обещание себе, дело без срока… Здесь не нужно сразу решать, что с этим делать."></textarea><div><span>${icon('leaf')} Записать — уже освободить немного внимания.</span><button type="submit" class="btn btn-primary">${icon('plus')} Сохранить мысль</button></div></form>
    <div class="inbox-toolbar"><div class="tabs">${[['inbox', 'Входящие'], ['later', 'Когда-нибудь'], ['archived', 'Архив']].map(([key, label]) => button('idea-filter', `${label} <span>${visible('ideas').filter(i => i.status === key).length}</span>`, '', `tab ${ideaFilter === key ? 'active' : ''}`, `data-filter="${key}"`)).join('')}</div><span class="muted">Не всё должно стать задачей</span></div>
    ${records.length ? `<div class="ideas-list">${records.map(i => `<article class="idea-card"><div class="idea-bullet">${icon('inbox')}</div><div class="idea-content"><h3>${esc(i.title)}</h3>${i.notes ? `<p>${esc(i.notes)}</p>` : ''}<small>${new Date(i.updatedAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}</small><div class="idea-actions">${button('idea-to-task', 'В план дня', 'arrow', 'text-button', `data-id="${i.id}"`)}${button('idea-status', ideaFilter === 'later' ? 'Во входящие' : 'Когда-нибудь', '', 'text-button', `data-id="${i.id}" data-status="${ideaFilter === 'later' ? 'inbox' : 'later'}"`)}${button('idea-status', ideaFilter === 'archived' ? 'Вернуть' : 'В архив', '', 'text-button', `data-id="${i.id}" data-status="${ideaFilter === 'archived' ? 'inbox' : 'archived'}"`)}</div></div><div class="idea-controls">${button('edit-idea', '', 'edit', 'icon-button', `data-id="${i.id}" aria-label="Редактировать мысль"`)}${button('delete', '', 'trash', 'icon-button', `data-id="${i.id}" data-collection="ideas" aria-label="Удалить мысль"`)}</div></article>`).join('')}</div>` : `<section class="large-empty inbox-empty">${icon('leaf')}<h2>${ideaFilter === 'inbox' ? 'Здесь спокойно' : ideaFilter === 'later' ? 'Ничего не отложено' : 'Архив пока пуст'}</h2><p>Мысль можно сохранить, не превращая её в обязательство.</p></section>`}`;
}
function openDialog(title, body, formId = '', submitLabel = 'Сохранить', extra = '') {
  dialogReturnFocus = document.activeElement;
  dialog.innerHTML = `<div class="dialog-heading"><h2 id="dialog-title">${title}</h2>${button('close-dialog', '', 'close', 'icon-button', 'aria-label="Закрыть"')}</div>${formId ? `<form id="${formId}">${body}<div class="dialog-footer">${extra}<div>${button('close-dialog', 'Отмена', '', 'btn btn-light')}<button type="submit" class="btn btn-primary">${submitLabel}</button></div></div></form>` : body}`;
  dialog.setAttribute('aria-labelledby', 'dialog-title');
  if (!dialog.open) dialog.showModal();
  dialog.querySelector('input:not([type="hidden"]), textarea, button')?.focus();
}
function closeDialog() { dialog.close(); dialogReturnFocus?.isConnected && dialogReturnFocus.focus(); }
const textField = (name, label, value = '', placeholder = '') => `<label class="field">${label}<input name="${name}" value="${esc(value)}" maxlength="${name === 'title' ? 500 : 100}" ${name === 'title' ? 'required' : ''} placeholder="${esc(placeholder)}"></label>`;
const notesField = value => `<label class="field">Заметка <span class="optional">необязательно</span><textarea name="notes" rows="3" maxlength="5000" placeholder="Детали, ссылки, критерий результата…">${esc(value || '')}</textarea></label>`;
function rewardFields(record, type) {
  const awarded = state.awards.find(a => a.id === `${type}.${record.id}`), r = awarded || rewardFor(type, record);
  return `<fieldset class="goal-calendar game-fields"><legend>Награда за выполнение</legend><label class="field">Размер шага<select name="effort">${[[1, 'Небольшой · ×1'], [3, 'Обычный · ×3'], [5, 'Большой вызов · ×5']].map(([value, label]) => `<option value="${value}" ${(record.effort || 1) === value ? 'selected' : ''}>${label}</option>`).join('')}</select></label><label class="checkbox-label"><input type="checkbox" name="profitable" ${record.profitable ? 'checked' : ''}>Дело связано с доходом · золотые монеты</label><p class="reward-preview" data-reward-type="${type}">${awarded ? 'Награда закреплена при первом выполнении: ' : 'За выполнение: '}${r.xp} XP · ${r.gold ? `${r.gold} золотых` : `${r.coins} монет`}</p></fieldset>`;
}
function wallet(totals) {
  return `<div class="wallet"><span class="currency coins">● <b data-balance="coins">${totals.coins}</b> монет</span><span class="currency gold">◆ <b data-balance="gold">${totals.gold}</b> золотых</span><span class="currency xp">✦ <b data-balance="xp">${totals.xp}</b> XP</span></div>`;
}
function heroCard() {
  const totals = gameTotals(state), titles = ['Искатель пути', 'Следопыт', 'Хранитель фокуса', 'Мастер своего дела'];
  const title = titles[Math.min(3, Math.floor((totals.level - 1) / 5))];
  const completed = earnedAwards(state).filter(a => a.sourceType === 'tasks' && task(a.sourceId)?.date === selectedDate).length;
  return `<section class="hero-card" aria-label="Игровой прогресс"><div class="hero-heading"><div class="hero-emblem">${icon('spark')}</div><div><span class="eyebrow">ВАШ ПУТЬ</span><h2>${title} · уровень <span data-level>${totals.level}</span></h2></div>${button('game-shop', 'Магазин', 'project', 'btn btn-light')}</div>${wallet(totals)}<div class="xp-caption"><span>До следующего уровня — ${totals.next} XP</span><b>${totals.progress} / 100</b></div><progress class="xp-progress" value="${totals.progress}" max="100" aria-label="Опыт до следующего уровня"></progress><p class="daily-quest">${completed >= 3 ? '✦ Три шага сделаны. Можно выбрать радость для себя.' : `Квест дня: завершить три шага · ${completed} / 3`}</p></section>`;
}
function announceReward(before) {
  const after = gameTotals(state), xp = after.xp - before.xp;
  if (xp > 0) toast(`${after.level > before.level ? `Новый уровень ${after.level}! ` : 'Шаг сделан! ' }+${xp} XP${after.coins > before.coins ? ` · +${after.coins - before.coins} монет` : ''}${after.gold > before.gold ? ` · +${after.gold - before.gold} золотых` : ''}`);
  else if (xp < 0) toast('Отметка снята. XP и монеты пересчитаны.');
}
function dayStartFocusDialog() {
  if (!dayStartDraft) return;
  const plans = visible('goals').filter(g => periodOverlaps(g.period, dayStartDraft.date, dayStartDraft.date));
  openDialog('Главное на этот день', `<p class="day-start-progress">1 из 2 · ${esc(dateLabel(dayStartDraft.date))}</p><p class="dialog-intro">Вспомните встречи, семейные дела и время на отдых. Что реально поместится в этот день?</p>${plans.length ? `<details class="game-rules"><summary>Планы на эту дату · ${plans.length}</summary>${plans.map(g => `<p>${esc(g.title)}</p>`).join('')}</details>` : ''}<label class="field">Один результат, который важен вам<textarea name="focus" rows="3" maxlength="500" placeholder="Например: отправить предложение клиенту">${esc(dayStartDraft.focus)}</textarea></label><p class="muted">Можно оставить пустым. Даже одного небольшого шага достаточно.</p>`, 'day-start-focus-form', 'Дальше');
}
function dayStartStepDialog() {
  const tasks = visible('tasks').filter(t => t.date === dayStartDraft.date && !t.done);
  openDialog('С какого шага начнём?', `<p class="day-start-progress">2 из 2 · ${esc(dateLabel(dayStartDraft.date))}</p>${dayStartDraft.focus ? `<p class="dialog-intro">${esc(dayStartDraft.focus)}</p>` : ''}<label class="field">Выберите задачу из плана<select name="taskId"><option value="">Пока без выбора</option>${tasks.map(t => `<option value="${t.id}" ${dayStartDraft.taskId === t.id ? 'selected' : ''}>${t.parentTaskId ? '↳ ' : ''}${esc(t.title)}</option>`).join('')}</select></label><label class="field">Или запишите новый маленький шаг<input name="title" maxlength="500" value="${esc(dayStartDraft.title)}" placeholder="Что можно сделать первым?" autocomplete="off"></label><p class="muted">Новый шаг заменит выбор выше и станет горячей задачей. Остальные дела останутся в плане. Таймер можно запустить, когда будете готовы.</p><div class="button-row">${button('day-start-back', 'Назад', 'back', 'text-button')}<button type="submit" name="intent" value="plan" class="btn btn-light">Сохранить план</button></div>`, 'day-start-step-form', 'Перейти к делу');
}
function shopDialog() {
  const totals = gameTotals(state), wishes = visible('wishes'), purchases = visible('purchases').sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const awards = earnedAwards(state).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 8);
  openDialog('Герой и магазин радостей', `<div class="shop-summary"><h3>Уровень ${totals.level} · ${totals.xp} XP</h3>${wallet(totals)}<p class="muted">Монеты за ваши дела можно обменять на желания и маленькие радости, которые вы выбираете сами.</p>${totals.coins < 0 || totals.gold < 0 ? '<p class="balance-note">Часть наград отменена или покупки сделаны на двух устройствах. Баланс отражает все покупки: отмените ещё не полученную радость или заработайте новые монеты.</p>' : ''}</div><div class="detail-heading"><h3>Банк желаний</h3>${button('new-wish', 'Добавить желание', 'plus', 'btn btn-primary')}</div>${wishes.length ? `<div class="wish-grid">${wishes.map(w => {
    const purchased = !w.repeatable && purchases.some(p => p.wishId === w.id), canBuy = !purchased && totals[w.currency] >= w.cost;
    return `<article class="wish-card"><div class="wish-card-top"><span class="currency ${w.currency}">${w.currency === 'gold' ? '◆' : '●'} ${w.cost} ${w.currency === 'gold' ? 'золотых' : 'монет'}</span>${button('edit-wish', '', 'edit', 'icon-button', `data-id="${w.id}" aria-label="Редактировать желание: ${esc(w.title)}"`)}</div><h3>${esc(w.title)}</h3>${w.notes ? `<p>${esc(w.notes)}</p>` : ''}<small>${w.repeatable ? 'Можно радовать себя снова' : 'Большое желание · одна покупка'}</small>${button('buy-wish', purchased ? 'Уже куплено' : canBuy ? 'Купить за монеты' : `Нужно ещё ${Math.max(0, w.cost - totals[w.currency])}`, '', 'btn btn-light', `data-id="${w.id}" ${canBuy ? '' : 'disabled'}`)}</article>`;
  }).join('')}</div>` : `<div class="empty-inline">Что порадует вас после сделанных дел? Добавьте свои награды или начните с примеров.<div class="button-row">${button('wish-examples', 'Добавить примеры', '', 'btn btn-light')}</div></div>`}<details class="game-rules"><summary>Как зарабатывать XP и монеты</summary><p>Небольшая задача: 10 XP и 1 монета. Цель или проект при 100%: 50 XP и 5 монет. Размер шага умножает награду на 1, 3 или 5. Для дел с доходом начисляются золотые монеты. Награда закрепляется при первом выполнении; снятие отметки убирает её, повторное выполнение возвращает ту же награду. Каждые 100 XP — новый уровень.</p><p>Монеты игровые. Вы сами организуете выбранную радость в жизни и отмечаете, когда получили её. Старые выполненные дела и демонстрационные примеры автоматически монеты не получают.</p></details><div class="detail-heading"><h3>Купленные радости</h3><span>${purchases.length}</span></div>${purchases.length ? purchases.map(p => `<article class="purchase-row"><div><strong>${esc(p.title)}</strong><small>${p.cost} ${p.currency === 'gold' ? 'золотых' : 'монет'} · ${p.fulfilled ? 'Радость получена' : 'Можно получить'}</small></div>${p.fulfilled ? icon('check') : `<div>${button('claim-purchase', 'Получено', 'check', 'text-button', `data-id="${p.id}"`)}${button('refund-purchase', 'Отменить покупку', '', 'text-button', `data-id="${p.id}"`)}</div>`}</article>`).join('') : '<p class="muted">Здесь появятся купленные желания.</p>'}<details class="game-rules"><summary>Заслуженные награды</summary>${awards.length ? awards.map(a => `<p class="award-row"><span>${esc(a.title)}</span><b>+${a.xp} XP · ${a.gold ? `${a.gold} золотых` : `${a.coins} монет`}</b></p>`).join('') : '<p>Следующий выполненный шаг принесёт первую награду.</p>'}</details><div class="button-row">${button('reset-game', 'Сбросить пробные награды', 'reset', 'text-button danger')}</div>`);
}
function resetGameDialog() {
  openDialog('Сбросить пробные награды', `<p class="dialog-intro">Задачи, планы, мысли и банк желаний сохранятся.</p><label class="field">Что обнулить?<select name="mode"><option value="coins">Только монеты — XP и уровень сохранить</option><option value="all">Всю игру — монеты, XP и уровень</option></select></label><p class="muted">В обоих вариантах обычные и золотые монеты станут нулевыми, история покупок очистится. При полном сбросе уровень станет первым, история наград очистится. Изменение уже выполненных задач не вернёт старые награды.</p><p class="settings-help">Для телефона и ПК: синхронизируйтесь перед сбросом, затем отправьте изменения через синхронизацию и получите их на втором устройстве.</p><div class="button-row">${button('export', 'Скачать копию перед сбросом', 'download', 'btn btn-light')}</div>`, 'game-reset-form', 'Обнулить');
}
function wishDialog(record = {}) {
  openDialog(record.id ? 'Редактировать желание' : 'Новое желание', `<input type="hidden" name="id" value="${record.id || ''}">${textField('title', 'Что порадует вас?', record.title, 'Например: прогулка, десерт, новая книга')}<div class="form-columns"><label class="field">Цена в игровых монетах<input name="cost" type="number" min="1" max="1000000" step="1" value="${record.cost || 5}" required></label><label class="field">Валюта<select name="currency"><option value="coins" ${record.currency !== 'gold' ? 'selected' : ''}>Обычные монеты</option><option value="gold" ${record.currency === 'gold' ? 'selected' : ''}>Золотые монеты</option></select></label></div>${notesField(record.notes)}<label class="checkbox-label"><input name="repeatable" type="checkbox" ${record.repeatable !== false ? 'checked' : ''}>Можно покупать повторно</label>`, 'wish-form', 'Сохранить желание', record.id ? button('delete', 'Удалить', 'trash', 'text-button danger', `data-id="${record.id}" data-collection="wishes"`) : '');
}
function buyWishDialog(id) {
  const wish = visible('wishes').find(w => w.id === id); if (!wish) return;
  const totals = gameTotals(state);
  openDialog('Порадовать себя?', `<h3>${esc(wish.title)}</h3><p class="dialog-intro">${wish.cost} ${wish.currency === 'gold' ? 'золотых' : 'монет'} · сейчас в банке ${totals[wish.currency]}</p><p class="muted">После покупки желание появится в «Купленных радостях». Отметьте «Получено», когда порадуете себя в жизни.</p><div class="dialog-footer"><div>${button('game-shop', 'Вернуться', '', 'btn btn-light')}${button('confirm-buy-wish', 'Купить желание', 'check', 'btn btn-primary', `data-id="${id}"`)}</div></div>`);
}
function taskDialog(record = {}, fromIdea = '', parent = '') {
  const parentTask = task(parent || record.parentTaskId), defaults = { id: '', title: '', notes: '', date: selectedDate, hot: false, goalId: '', ...record };
  openDialog(parentTask ? 'Подзадача' : defaults.id ? 'Редактировать задачу' : 'Новый шаг', `${parentTask ? `<p class="dialog-intro">Часть задачи: ${esc(parentTask.title)}</p>` : ''}<input type="hidden" name="id" value="${defaults.id}"><input type="hidden" name="ideaId" value="${fromIdea}"><input type="hidden" name="parentTaskId" value="${parentTask?.id || ''}">${textField('title', 'Что нужно сделать?', defaults.title, 'Сформулируйте понятное действие')}<div class="form-columns"><label class="field">Дата<input type="date" name="date" value="${parentTask?.date || defaults.date}" required ${parentTask ? 'readonly' : ''}></label><label class="field">Цель или проект<select name="goalId"><option value="">Без привязки</option>${visible('goals').map(g => `<option value="${g.id}" ${(parentTask?.goalId || defaults.goalId) === g.id ? 'selected' : ''}>${esc(g.title)} · ${labels[g.level]}</option>`).join('')}</select></label></div>${notesField(defaults.notes)}${rewardFields(defaults, 'tasks')}<label class="checkbox-label"><input type="checkbox" name="hot" ${defaults.hot ? 'checked' : ''}>${icon('flame')} Горячая задача — важна сегодня</label>`, 'task-form', 'Сохранить', defaults.id ? button('delete', 'Удалить', 'trash', 'text-button danger', `data-id="${defaults.id}" data-collection="tasks"`) : '');
}
function goalPeriodFields(record) {
  if (['month', 'week', 'project'].includes(record.level)) return calendarGoalFields(record);
  if (record.level !== 'quarter') return textField('period', 'Горизонт или период', record.period, ({ strategy: 'Например: 2027–2031 · 5 лет', month: 'Например: октябрь 2026', week: 'Например: 5–11 октября 2026', project: 'Например: до декабря 2026' })[record.level]);
  const parsed = parsePlanningPeriod(record.period), kind = parsed?.kind || (record.id ? 'legacy' : periodView.kind === 'half' ? 'half' : 'quarter');
  const selectedKind = kind === 'legacy' ? 'quarter' : kind, year = parsed?.year || periodView.year, index = parsed?.index || periodView[selectedKind];
  return `<fieldset class="goal-calendar"><legend>Точный период</legend><input type="hidden" name="period" value="${esc(record.period)}"><label class="field">Горизонт<select name="periodKind"><option value="half" ${kind === 'half' ? 'selected' : ''}>Полугодие</option><option value="quarter" ${kind === 'quarter' ? 'selected' : ''}>Квартал</option>${kind === 'legacy' ? '<option value="legacy" selected>Сохранить прежний текст периода</option>' : ''}</select></label><div class="form-columns"><label class="field">Год<input type="number" name="periodYear" min="1900" max="2200" step="1" value="${year}" required ${kind === 'legacy' ? 'disabled' : ''}></label><label class="field">Номер периода<select name="periodIndex" ${kind === 'legacy' ? 'disabled' : ''}>${Array.from({ length: selectedKind === 'half' ? 2 : 4 }, (_, i) => `<option value="${i + 1}" ${i + 1 === index ? 'selected' : ''}>${['I', 'II', 'III', 'IV'][i]} · ${planningPeriodRange(selectedKind, i + 1)}</option>`).join('')}</select></label></div><p id="goal-period-preview" class="period-form-preview">${esc(kind === 'legacy' ? record.period || 'Период ещё не указан' : planningPeriod(kind, index, year))}</p></fieldset>`;
}
function calendarGoalFields(record) {
  const parsed = parseCalendarPeriod(record.period), kind = parsed?.kind || (record.id || record.level === 'project' ? 'text' : record.level);
  const start = parsed?.start || (record.level === 'week' ? selectedPlanPeriod('week').start : dateKey()), end = parsed?.end || start;
  return `<fieldset class="goal-calendar"><legend>Период плана</legend><input type="hidden" name="period" value="${esc(record.period)}"><label class="field">Как задать период<select name="calendarKind"><option value="month" ${kind === 'month' ? 'selected' : ''}>Конкретный месяц</option><option value="week" ${kind === 'week' ? 'selected' : ''}>Конкретная неделя · пн–вс</option><option value="range" ${kind === 'range' ? 'selected' : ''}>Даты с — по · отпуск, каникулы</option><option value="text" ${kind === 'text' ? 'selected' : ''}>Без точных дат / прежний текст</option></select></label><label class="field" data-calendar-field="month" ${kind !== 'month' ? 'hidden' : ''}>Месяц и год<input type="month" name="calendarMonth" value="${parsed?.start.slice(0, 7) || planView.month}" required ${kind !== 'month' ? 'disabled' : ''}></label><label class="field" data-calendar-field="week" ${kind !== 'week' ? 'hidden' : ''}>Любой день нужной недели<input type="date" name="calendarWeek" value="${start}" required ${kind !== 'week' ? 'disabled' : ''}></label><div class="form-columns" data-calendar-field="range" ${kind !== 'range' ? 'hidden' : ''}><label class="field">Дата начала<input type="date" name="calendarStart" value="${start}" required ${kind !== 'range' ? 'disabled' : ''}></label><label class="field">Дата окончания<input type="date" name="calendarEnd" value="${end}" min="${start}" required ${kind !== 'range' ? 'disabled' : ''}></label></div><label class="field" data-calendar-field="text" ${kind !== 'text' ? 'hidden' : ''}>Текст периода <span class="optional">необязательно</span><input name="periodText" maxlength="100" value="${esc(record.period)}" placeholder="Например: когда появится время" ${kind !== 'text' ? 'disabled' : ''}></label><p id="calendar-period-preview" class="period-form-preview">${esc(parsed ? calendarPeriodLabel(parsed.period) : kind === 'text' ? record.period || 'План без точных дат' : calendarPeriodLabel(selectedPlanPeriod(record.level).period))}</p></fieldset>`;
}
function calendarPeriodFromForm(form) {
  const value = name => form.querySelector(`[name="${name}"]`).value;
  const kind = value('calendarKind');
  if (kind === 'text') return value('periodText').trim();
  return calendarPeriod(kind, value(kind === 'month' ? 'calendarMonth' : kind === 'week' ? 'calendarWeek' : 'calendarStart'), kind === 'range' ? value('calendarEnd') : '').period;
}
function updateCalendarFields(form) {
  const kind = form.querySelector('[name="calendarKind"]').value;
  form.querySelectorAll('[data-calendar-field]').forEach(group => {
    group.hidden = group.dataset.calendarField !== kind;
    group.querySelectorAll('input').forEach(input => { input.disabled = group.hidden; });
  });
  form.querySelector('[name="calendarEnd"]').min = form.querySelector('[name="calendarStart"]').value;
  try { form.querySelector('#calendar-period-preview').textContent = calendarPeriodLabel(calendarPeriodFromForm(form)) || 'План без точных дат'; }
  catch (error) { form.querySelector('#calendar-period-preview').textContent = error.message; }
}
function updateGoalPeriodFields(form) {
  const kind = form.querySelector('[name="periodKind"]')?.value;
  if (!kind) return;
  const year = form.querySelector('[name="periodYear"]'), number = form.querySelector('[name="periodIndex"]'), preview = form.querySelector('#goal-period-preview');
  year.disabled = number.disabled = kind === 'legacy';
  if (kind === 'legacy') { preview.textContent = form.querySelector('[name="period"]').value || 'Период ещё не указан'; return; }
  const count = kind === 'half' ? 2 : 4, index = Math.min(Number(number.value) || 1, count);
  if (number.options.length !== count) number.innerHTML = Array.from({ length: count }, (_, i) => `<option value="${i + 1}" ${i + 1 === index ? 'selected' : ''}>${['I', 'II', 'III', 'IV'][i]} · ${planningPeriodRange(kind, i + 1)}</option>`).join('');
  try { preview.textContent = `${planningPeriod(kind, Number(number.value), Number(year.value))} · ${planningPeriodRange(kind, Number(number.value))}`; }
  catch { preview.textContent = 'Укажите год от 1900 до 2200 и номер периода.'; }
}
function goalDialog(record = {}, level = 'strategy') {
  const defaults = { id: '', title: '', notes: '', period: '', parentId: '', progress: 0, level, ...record };
  const parents = visible('goals').filter(g => LEVELS.indexOf(g.level) < LEVELS.indexOf(defaults.level));
  openDialog(defaults.id ? 'Редактировать ' + (defaults.level === 'project' ? 'проект' : 'цель') : defaults.level === 'project' ? 'Новый проект' : 'Новая цель', `<p class="dialog-intro">${labels[defaults.level]} · ${captions[defaults.level]}</p><input type="hidden" name="id" value="${defaults.id}"><input type="hidden" name="level" value="${defaults.level}">${textField('title', 'Какой результат вы хотите получить?', defaults.title, 'Что изменится, когда это получится?')}${goalPeriodFields(defaults)}<label class="field">Связь с более широкой целью<select name="parentId"><option value="">Самостоятельная цель</option>${parents.map(g => `<option value="${g.id}" ${g.id === defaults.parentId ? 'selected' : ''}>${esc(g.title)} · ${labels[g.level]}</option>`).join('')}</select></label>${notesField(defaults.notes)}${rewardFields(defaults, 'goals')}<label class="field">Продвижение, %<input type="number" name="progress" min="0" max="100" step="1" value="${defaults.progress}" required></label>`, 'goal-form', 'Сохранить', defaults.id ? button('delete', 'Удалить', 'trash', 'text-button danger', `data-id="${defaults.id}" data-collection="goals"`) : '');
}
function ideaDialog(record = {}) {
  openDialog(record.id ? 'Редактировать мысль' : 'Оставьте мысль здесь', `<p class="dialog-intro">Не нужно разбирать её прямо сейчас. Вернитесь к своему фокусу.</p><input type="hidden" name="id" value="${record.id || ''}">${textField('title', 'Что крутится в голове?', record.title, 'Запишите как есть…')}${notesField(record.notes)}`, 'idea-form', 'Сохранить мысль');
}
function detailsDialog(id) {
  const g = goal(id); if (!g) return;
  const children = visible('goals').filter(c => c.parentId === id), tasks = visible('tasks').filter(t => t.goalId === id && !t.parentTaskId);
  openDialog(esc(g.title), `<p class="dialog-intro">${esc(calendarPeriodLabel(g.period))} · ${g.progress}%</p>${g.notes ? `<p class="detail-notes">${esc(g.notes)}</p>` : ''}<div class="detail-heading"><h3>Связанные цели и проекты</h3>${button('edit-goal', 'Редактировать', 'edit', 'text-button', `data-id="${g.id}"`)}</div>${children.length ? children.map(c => `<button class="linked-goal" data-action="open-goal" data-id="${c.id}"><span>${esc(c.title)}<small>${labels[c.level]} · ${c.progress}%</small></span>${icon('arrow')}</button>`).join('') : '<p class="muted">Связанных целей пока нет. Укажите эту цель как родительскую при создании следующего уровня.</p>'}<div class="detail-heading"><h3>Задачи проекта</h3>${button('project-task', 'Добавить задачу', 'plus', 'text-button', `data-id="${g.id}"`)}</div>${tasks.length ? `<div class="task-list">${tasks.map(t => `<div class="detail-task">${taskRow(t)}<small>${dateLabel(t.date)}</small></div>`).join('')}</div>` : '<p class="muted">Какой первый небольшой шаг приблизит результат?</p>'}`);
}
function settingsDialog() {
  openDialog('Ваше личное пространство', `<div class="settings-section"><h3>${icon('download')} Перенести планы без переписывания</h3><p>Можно сразу перенести уже введённые планы на другое устройство.</p><ol class="settings-steps"><li>На ПК нажмите «Скачать копию» в приложении, где вы вводили планы.</li><li>Передайте скачанный JSON-файл на телефон удобным способом.</li><li>На телефоне откройте Опору → настройки → «Импортировать» и выберите этот файл.</li></ol><p>Импорт объединяет копию с текущими планами. Если на ПК вы работали через localhost, скачайте копию именно там, затем импортируйте её в приложение по опубликованной ссылке.</p><div class="button-row">${button('export', 'Скачать копию', 'download', 'btn btn-light')}<label class="btn btn-light file-label">${icon('upload')} Импортировать<input id="import-file" type="file" accept=".json,application/json"></label></div></div>
    <div class="settings-section"><h3>${icon('cloud')} Синхронизация через GitHub</h3><p>Один закрытый репозиторий и файл планов для телефона и компьютера. Нажимайте «Синхронизировать» перед и после работы на каждом устройстве.</p><form id="sync-form"><div class="form-columns">${textField('owner', 'Владелец', config.owner || '', 'Ваш логин GitHub')}${textField('repo', 'Репозиторий', config.repo || '', 'opora-private')}</div>${textField('path', 'Файл', config.path || 'opora-data.json')}<label class="field">Токен GitHub<input type="password" name="token" autocomplete="off" placeholder="Fine-grained token" value="${esc(sessionStorage.getItem('opora.token') || '')}" required></label><p class="settings-help">Создайте репозиторий с README и fine-grained token только для него: <strong>Contents — Read and write</strong>. Токен хранится в этой вкладке до её закрытия. <a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noopener noreferrer">Создать токен ↗</a></p><button type="submit" class="btn btn-primary" ${syncing ? 'disabled' : ''}>${icon('cloud')} ${syncing ? 'Синхронизация…' : 'Синхронизировать'}</button><p id="sync-status" role="status" class="settings-help">${config.lastSync ? `Последняя синхронизация: ${esc(new Date(config.lastSync).toLocaleString('ru-RU'))}` : 'Ещё не подключено'}</p></form></div>
    <div class="settings-section"><h3>${icon('book')} Установить как приложение</h3><p>На телефоне откройте опубликованный адрес и выберите «Добавить на главный экран» в меню браузера. На компьютере используйте установку приложения в браузере. После первого открытия доступна работа без интернета.</p><p class="settings-help">Локальные планы принадлежат этому браузеру. Резервная копия помогает сохранить их при очистке данных браузера.</p></div>`);
}
function downloadBackup() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' }), url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = `opora-${dateKey()}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 2000); toast('Резервная копия скачана');
}
async function synchronize(form) {
  if (syncing) return;
  const values = Object.fromEntries(new FormData(form)), status = form.querySelector('#sync-status'), submit = form.querySelector('[type="submit"]');
  const owner = values.owner.trim(), repo = values.repo.trim(), path = values.path.trim(), token = values.token.trim();
  if (!/^[a-zA-Z0-9-]+$/.test(owner) || !/^[a-zA-Z0-9_.-]+$/.test(repo) || !path || path.split('/').some(p => !p || p === '.' || p === '..') || !token) { status.textContent = 'Проверьте владельца, репозиторий, путь к файлу и токен.'; return; }
  syncing = true; submit.disabled = true; status.textContent = 'Получаем и объединяем планы…';
  try {
    sessionStorage.setItem('opora.token', token);
    const url = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${path.split('/').map(encodeURIComponent).join('/')}`;
    const headers = { Accept: 'application/vnd.github+json', Authorization: `Bearer ${token}`, 'X-GitHub-Api-Version': '2022-11-28' };
    let completed = false;
    for (let attempt = 0; attempt < 3; attempt++) {
      const response = await fetch(url, { headers, cache: 'no-store', signal: AbortSignal.timeout(20000) });
      if (!response.ok && response.status !== 404) throw new Error(apiError(response.status));
      let sha, remote = emptyState();
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data) || data.encoding !== 'base64' || !data.content || data.size > 5 * 1024 * 1024) throw new Error('По этому пути нужен JSON-файл Опоры размером до 5 МБ.');
        sha = data.sha; remote = decodeState(data.content);
      }
      const snapshot = mergeStates(state, remote);
      const upload = await fetch(url, { method: 'PUT', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ message: 'Обновить планы Опоры', content: encodeState(snapshot), ...(sha ? { sha } : {}) }), signal: AbortSignal.timeout(20000) });
      if (upload.status === 409 || upload.status === 422) continue;
      if (!upload.ok) throw new Error(apiError(upload.status));
      state = mergeStates(state, snapshot); save();
      config = { owner, repo, path, lastSync: new Date().toISOString() }; localStorage.setItem(CONFIG, JSON.stringify(config));
      const newChanges = JSON.stringify(mergeStates(state, emptyState())) !== JSON.stringify(snapshot);
      status.textContent = newChanges ? 'Планы объединены. Новые изменения во время синхронизации сохранены здесь; нажмите ещё раз для отправки.' : 'Готово. Планы на этом устройстве и GitHub совпадают.';
      completed = true; render(); toast('Планы синхронизированы'); break;
    }
    if (!completed) throw new Error('Файл изменяется на другом устройстве или репозиторий пуст. Повторите синхронизацию; убедитесь, что в репозитории есть README.');
  } catch (error) {
    status.textContent = error.name === 'TimeoutError' ? 'GitHub не ответил вовремя. Ваши планы остаются на устройстве.' : error.message === 'Failed to fetch' ? 'Нет соединения с GitHub. Проверьте интернет; планы сохранены локально.' : error.message;
  } finally { syncing = false; submit.disabled = false; }
}
function apiError(status) {
  return ({ 401: 'Токен недействителен или истёк.', 403: 'Нет доступа. Проверьте разрешение Contents: Read and write и доступ токена к репозиторию.', 404: 'Репозиторий не найден или недоступен.', 413: 'Файл слишком большой.' })[status] || `GitHub вернул ошибку ${status}. Локальные планы сохранены.`;
}
function example() {
  if (visible('tasks').length || visible('goals').length) return;
  const before = Object.fromEntries(['tasks', 'goals', 'ideas', 'days'].map(key => [key, new Set(state[key].map(r => r.id))]));
  const strategy = put('goals', { id: uid(), title: 'Построить жизнь с местом для важного', level: 'strategy', period: '2027–2031 · 5 лет', notes: 'Больше самостоятельности, времени для близких и работы, которая имеет смысл.', progress: 10, parentId: '' });
  const quarter = put('goals', { id: uid(), title: 'Создать устойчивую систему планирования', level: 'quarter', period: 'IV квартал 2026', notes: 'Планировать спокойно и доводить выбранное до результата.', progress: 20, parentId: strategy.id });
  const month = put('goals', { id: uid(), title: 'Освободить внимание от незакрытых дел', level: 'month', period: calendarPeriod('month', dateKey().slice(0, 7)).period, notes: 'У всех обещаний себе есть понятное место.', progress: 25, parentId: quarter.id });
  const week = put('goals', { id: uid(), title: 'Попробовать новый утренний ритуал', level: 'week', period: calendarPeriod('week', dateKey()).period, notes: 'Пять минут на план, один главный результат дня.', progress: 40, parentId: month.id });
  const project = put('goals', { id: uid(), title: 'Личная система планирования', level: 'project', period: 'Октябрь 2026', notes: 'Собрать цели и мысли в одном спокойном месте.', progress: 30, parentId: week.id });
  const existingDay = day();
  put('days', { id: selectedDate, focus: existingDay.focus || 'Сделать первый шаг к своей системе планирования', review: existingDay.review });
  const first = put('tasks', { id: uid(), title: 'Определить три главных результата на месяц', notes: '', date: selectedDate, done: false, hot: true, goalId: project.id, parentTaskId: '' });
  put('tasks', { id: uid(), title: 'Выбрать один результат на эту неделю', notes: '', date: selectedDate, done: false, hot: false, goalId: project.id, parentTaskId: first.id });
  put('tasks', { id: uid(), title: 'Выгрузить незакрытые дела из головы', notes: '', date: selectedDate, done: false, hot: true, goalId: project.id, parentTaskId: '' });
  put('tasks', { id: uid(), title: 'Прогуляться без телефона', notes: '', date: selectedDate, done: false, hot: false, goalId: '', parentTaskId: '' });
  put('tasks', { id: uid(), title: 'Выделить 5 минут на утренний план', notes: '', date: selectedDate, done: true, hot: false, goalId: project.id, parentTaskId: '' }, { game: false });
  put('ideas', { id: uid(), title: 'Подумать о небольшом личном проекте', notes: 'Вернуться, когда появится место и интерес.', status: 'later' });
  const exampleIds = Object.fromEntries(Object.entries(before).map(([key, ids]) => [key, state[key].filter(r => !ids.has(r.id)).map(r => r.id)]));
  localStorage.setItem('opora.example', JSON.stringify(exampleIds)); render(); toast('Добавлены примерные планы. Их можно удалить или заменить своими.');
}
function updateTimer() {
  let remaining = timer.end ? Math.max(0, Math.ceil((timer.end - Date.now()) / 1000)) : timer.remaining;
  if (timer.end && !remaining) { timer.end = null; timer.remaining = 0; timer.sessions++; sessionStorage.setItem(TIMER, JSON.stringify(timer)); toast('25 минут завершены. Выдохните и сделайте небольшой перерыв.'); }
  const display = document.querySelector('#timer-time');
  if (display) display.textContent = `${String(Math.floor(remaining / 60)).padStart(2, '0')}:${String(remaining % 60).padStart(2, '0')}`;
  const btn = document.querySelector('#timer-toggle');
  if (btn) btn.innerHTML = `${icon(timer.end ? 'pause' : 'play')}${timer.end ? 'Пауза' : remaining === 1500 ? 'Начать 25 минут' : remaining ? 'Продолжить' : 'Ещё 25 минут'}`;
  const sessions = document.querySelector('#timer-sessions'); if (sessions && timer.sessions) sessions.textContent = `В этой вкладке: ${timer.sessions} сессий`;
  document.title = timer.end ? `${display?.textContent || ''} · Фокус — Опора` : 'Опора — пространство для важного';
}
function handleAction(event) {
  const target = event.target.closest('[data-action]'); if (!target) return;
  event.preventDefault(); const action = target.dataset.action, id = target.dataset.id;
  if (action === 'navigate') { page = target.dataset.page; render(); window.scrollTo(0, 0); }
  else if (action === 'toggle-theme') {
    const theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = theme; localStorage.setItem('opora.theme', theme);
    document.querySelector('meta[name="theme-color"]').content = theme === 'dark' ? '#101c1d' : '#314d40'; render();
  }
  else if (action === 'game-shop') shopDialog();
  else if (action === 'reset-game') resetGameDialog();
  else if (action === 'new-wish') wishDialog();
  else if (action === 'edit-wish') wishDialog(visible('wishes').find(w => w.id === id));
  else if (action === 'buy-wish') buyWishDialog(id);
  else if (action === 'confirm-buy-wish') {
    try { put('purchases', purchaseWish(state, id, uid(), stamp())); render(); shopDialog(); toast('Желание куплено. Теперь пора порадовать себя!'); }
    catch (error) { toast(error.message); }
  }
  else if (action === 'claim-purchase') { const p = visible('purchases').find(p => p.id === id); if (p) put('purchases', { ...p, fulfilled: true }); shopDialog(); toast('Радость получена. Пусть останется хорошее воспоминание.'); }
  else if (action === 'refund-purchase') { const p = visible('purchases').find(p => p.id === id); if (p && !p.fulfilled) { remove('purchases', id); shopDialog(); toast('Покупка отменена, монеты возвращены.'); } }
  else if (action === 'wish-examples') {
    [['Кофе или любимый десерт', 'coins', 5, true], ['Вечер с любимым фильмом', 'coins', 10, true], ['Книга из списка желаний', 'gold', 10, false]].forEach(([title, currency, cost, repeatable]) => put('wishes', { id: uid(), title, currency, cost, repeatable, notes: '' })); shopDialog();
  }
  else if (action === 'date') { selectedDate = target.dataset.date; render(); }
  else if (action === 'previous-day' || action === 'next-day') { selectedDate = shiftDate(selectedDate, action === 'previous-day' ? -1 : 1); render(); }
  else if (action === 'today') { selectedDate = dateKey(); render(); }
  else if (action === 'close-day' || action === 'reopen-day') {
    put('days', { ...day(), closed: action === 'close-day' }); render();
    toast(action === 'close-day' ? 'День закрыт. Выполненные задачи в архиве.' : 'День открыт. Все задачи снова видны.');
  }
  else if (action === 'new-task') taskDialog();
  else if (action === 'edit-task') taskDialog(task(id));
  else if (action === 'subtask') taskDialog({}, '', id);
  else if (action === 'toggle-task' || action === 'hot-task') {
    const t = task(id); if (!t) return;
    const before = gameTotals(state);
    if (action === 'toggle-task' && t.done) {
      const taskDay = visible('days').find(d => d.id === t.date);
      if (taskDay?.closed) put('days', { ...taskDay, closed: false });
    }
    put('tasks', { ...t, [action === 'toggle-task' ? 'done' : 'hot']: !t[action === 'toggle-task' ? 'done' : 'hot'] }); render();
    if (action === 'toggle-task' && !t.done) { visible('tasks').filter(c => c.parentTaskId === id && !c.done).forEach(c => put('tasks', { ...c, done: true })); render(); }
    if (dialog.open && dialog.querySelector('.detail-task')) detailsDialog(t.goalId);
    if (action === 'toggle-task') announceReward(before);
  }
  else if (action === 'start-day') { dayStartDraft = { date: selectedDate, focus: day().focus, taskId: '', title: '' }; dayStartFocusDialog(); }
  else if (action === 'day-start-back') { const form = dialog.querySelector('form'); dayStartDraft.taskId = form.elements.taskId.value; dayStartDraft.title = form.elements.title.value; dayStartFocusDialog(); }
  else if (action === 'focus-mode' || action === 'exit-focus') { focusTaskId = ''; focusMode = action === 'focus-mode'; render(); }
  else if (action === 'capture') ideaDialog();
  else if (action === 'close-dialog') closeDialog();
  else if (action === 'settings') settingsDialog();
  else if (action === 'sync-settings') { settingsDialog(); dialog.querySelector('#sync-form').closest('.settings-section').scrollIntoView({ block: 'start' }); }
  else if (action === 'new-goal') goalDialog({}, target.dataset.level);
  else if (action === 'edit-goal') goalDialog(goal(id));
  else if (action === 'plan-level') { planLevel = target.dataset.level; render(); }
  else if (action === 'plan-scope') { planView.scope = target.dataset.scope; render(); }
  else if (action === 'plan-previous' || action === 'plan-next') {
    const direction = action === 'plan-previous' ? -1 : 1;
    if (planLevel === 'week') planView.week = shiftDate(planView.week, direction * 7);
    else { const d = new Date(planView.month + '-01T12:00:00'); d.setMonth(d.getMonth() + direction); planView.month = dateKey(d).slice(0, 7); }
    render();
  }
  else if (action === 'period-kind') { periodView.kind = target.dataset.kind; render(); }
  else if (action === 'period-index') { periodView[periodView.kind] = Number(target.dataset.index); render(); }
  else if (action === 'goal-details') detailsDialog(id);
  else if (action === 'open-goal') {
    const g = goal(id); if (!g) return; closeDialog(); page = ['week', 'month'].includes(g.level) ? 'plans' : g.level; if (['week', 'month'].includes(g.level)) planLevel = g.level;
    if (g.level === 'quarter') { const p = parsePlanningPeriod(g.period); if (p) { periodView.kind = p.kind; periodView.year = p.year; periodView[p.kind] = p.index; } else periodView.kind = 'unassigned'; }
    if (['month', 'week'].includes(g.level)) { const p = parseCalendarPeriod(g.period); planView.scope = p ? 'period' : 'unassigned'; if (p) { planView.month = p.start.slice(0, 7); planView.week = p.start; } }
    render();
  }
  else if (action === 'project-task') taskDialog({ goalId: id });
  else if (action === 'idea-filter') { ideaFilter = target.dataset.filter; render(); }
  else if (action === 'edit-idea') ideaDialog(visible('ideas').find(i => i.id === id));
  else if (action === 'idea-status') { const i = visible('ideas').find(i => i.id === id); put('ideas', { ...i, status: target.dataset.status }); render(); }
  else if (action === 'idea-to-task') { const i = visible('ideas').find(i => i.id === id); taskDialog({ title: i.title, notes: i.notes }, id); }
  else if (action === 'delete') {
    openDialog('Удалить запись?', `<p class="dialog-intro">Запись будет удалена. Связанные задачи и цели останутся самостоятельными.</p><div class="dialog-footer"><div>${button('close-dialog', 'Отмена', '', 'btn btn-light')}${button('confirm-delete', 'Удалить', 'trash', 'btn btn-danger', `data-id="${id}" data-collection="${target.dataset.collection}"`)}</div></div>`);
  }
  else if (action === 'confirm-delete') { remove(target.dataset.collection, id); closeDialog(); }
  else if (action === 'move-today') {
    const t = task(id); put('tasks', { ...t, date: dateKey() }); visible('tasks').filter(c => c.parentTaskId === id).forEach(c => put('tasks', { ...c, date: dateKey() })); render();
  }
  else if (action === 'park-task') {
    const t = task(id), children = visible('tasks').filter(c => c.parentTaskId === id);
    [t, ...children].forEach(c => { put('ideas', { id: uid(), title: c.title, notes: c.notes, status: 'later' }); remove('tasks', c.id); }); render(); toast('Задача перенесена в «Когда-нибудь»');
  }
  else if (action === 'export') downloadBackup();
  else if (action === 'example') example();
  else if (action === 'clear-example') {
    openDialog('Убрать пример?', `<p class="dialog-intro">Будут удалены записи, добавленные кнопкой «Посмотреть пример», включая ваши изменения этих записей. Созданные вами отдельные записи останутся.</p><div class="dialog-footer"><div>${button('close-dialog', 'Отмена', '', 'btn btn-light')}${button('confirm-clear-example', 'Убрать пример', '', 'btn btn-primary')}</div></div>`);
  }
  else if (action === 'confirm-clear-example') {
    try { const ids = JSON.parse(localStorage.getItem('opora.example') || '{}'); for (const key of ['tasks', 'goals', 'ideas', 'days']) if (Array.isArray(ids[key])) ids[key].forEach(id => remove(key, id)); }
    catch { toast('Не удалось прочитать список записей примера.'); }
    localStorage.removeItem('opora.example'); closeDialog(); render();
  }
  else if (action === 'timer-toggle') {
    if (timer.end) { timer.remaining = Math.max(0, Math.ceil((timer.end - Date.now()) / 1000)); timer.end = null; }
    else { if (!timer.remaining) timer.remaining = 1500; timer.end = Date.now() + timer.remaining * 1000; }
    sessionStorage.setItem(TIMER, JSON.stringify(timer)); updateTimer();
  }
  else if (action === 'timer-reset') { timer.remaining = 1500; timer.end = null; sessionStorage.setItem(TIMER, JSON.stringify(timer)); updateTimer(); }
}
document.addEventListener('click', handleAction);
document.addEventListener('submit', event => {
  event.preventDefault(); const form = event.target, formId = form.getAttribute('id'), values = Object.fromEntries(new FormData(form));
  if (formId === 'sync-form') { synchronize(form); return; }
  if (formId === 'day-start-focus-form') {
    if (!dayStartDraft) return;
    dayStartDraft.focus = values.focus.trim(); dayStartStepDialog();
  }
  else if (formId === 'day-start-step-form') {
    if (!dayStartDraft || storageFailed) return;
    const draft = dayStartDraft, title = values.title.trim();
    const existing = task(values.taskId);
    let first = existing && !existing.done && existing.date === draft.date ? existing : null;
    if (title) first = put('tasks', { id: uid(), title, notes: '', date: draft.date, hot: true, done: false, goalId: '', parentTaskId: '' });
    else if (first && !first.hot) first = put('tasks', { ...first, hot: true });
    const record = visible('days').find(d => d.id === draft.date) || { id: draft.date, review: '', closed: false };
    put('days', { ...record, focus: draft.focus });
    selectedDate = draft.date; page = 'day'; focusTaskId = first?.id || '';
    focusMode = event.submitter?.value !== 'plan'; dayStartDraft = null;
    closeDialog(); render(); toast(focusMode ? 'Можно начать спокойно. Таймер — по желанию.' : 'Главное сохранено в плане дня.');
  }
  else if (formId === 'quick-task') {
    const title = values.title.trim(); if (!title) return;
    put('tasks', { id: uid(), title, notes: '', date: selectedDate, done: false, hot: false, goalId: '', parentTaskId: '' }); render(); document.querySelector('#quick-task input')?.focus();
  }
  else if (formId === 'task-form') {
    const title = values.title.trim(); if (!title || !validDate(values.date)) return;
    const previous = task(values.id), parentTask = task(values.parentTaskId), date = parentTask?.date || values.date;
    const newTask = put('tasks', { id: values.id || uid(), title, notes: values.notes.trim(), date, hot: values.hot === 'on', done: previous?.done || false, goalId: values.goalId, parentTaskId: parentTask?.id || '', profitable: values.profitable === 'on', effort: Number(values.effort) });
    if (previous && previous.date !== date) visible('tasks').filter(t => t.parentTaskId === previous.id).forEach(t => put('tasks', { ...t, date }));
    if (values.ideaId) { const i = visible('ideas').find(i => i.id === values.ideaId); if (i) put('ideas', { ...i, status: 'archived' }); }
    closeDialog(); render(); toast(values.ideaId ? 'Мысль стала задачей. Исходная запись в архиве.' : 'Задача сохранена');
  }
  else if (formId === 'goal-form') {
    const before = gameTotals(state);
    const title = values.title.trim(); if (!title) return;
    let period = (values.period || '').trim();
    if (values.calendarKind) {
      try { period = calendarPeriodFromForm(form); }
      catch (error) { toast(error.message); return; }
      const p = parseCalendarPeriod(period);
      if (['month', 'week'].includes(values.level)) {
        planView.scope = p ? 'period' : 'unassigned';
        if (p) { planView.month = p.start.slice(0, 7); planView.week = p.start; }
      }
    }
    if (values.level === 'quarter' && values.periodKind !== 'legacy') {
      try { period = planningPeriod(values.periodKind, Number(values.periodIndex), Number(values.periodYear)); }
      catch (error) { toast(error.message); return; }
      periodView.kind = values.periodKind; periodView.year = Number(values.periodYear); periodView[values.periodKind] = Number(values.periodIndex);
    }
    put('goals', { id: values.id || uid(), title, notes: values.notes.trim(), level: values.level, period, parentId: values.parentId, progress: Number(values.progress), profitable: values.profitable === 'on', effort: Number(values.effort) }); closeDialog(); render(); toast('План сохранён'); announceReward(before);
  }
  else if (formId === 'game-reset-form') {
    state = resetGame(state, values.mode, stamp()); save(); render(); shopDialog();
    toast(values.mode === 'all' ? 'Игра начата заново. Планы и желания сохранены.' : 'Монеты обнулены. XP, планы и желания сохранены.');
  }
  else if (formId === 'wish-form') {
    const wish = { id: values.id || uid(), title: values.title.trim(), notes: values.notes.trim(), cost: Number(values.cost), currency: values.currency, repeatable: values.repeatable === 'on' };
    if (!wish.title || !Number.isSafeInteger(wish.cost) || wish.cost < 1 || wish.cost > 1000000) return;
    put('wishes', wish); render(); shopDialog(); toast('Желание добавлено в магазин');
  }
  else if (formId === 'idea-form' || formId === 'quick-idea') {
    const title = values.title.trim(); if (!title) return;
    const previous = visible('ideas').find(i => i.id === values.id);
    put('ideas', { id: values.id || uid(), title, notes: values.notes?.trim() || '', status: previous?.status || 'inbox' }); closeDialog(); render(); toast('Мысль сохранена. Можно вернуться к важному.');
  }
});
document.addEventListener('input', event => {
  const target = event.target;
  if (['effort', 'profitable'].includes(target.name)) {
    const form = target.closest('form'), preview = form?.querySelector('.reward-preview');
    if (preview && !state.awards.some(a => a.id === `${preview.dataset.rewardType}.${form.querySelector('[name="id"]').value}`)) {
      const r = rewardFor(preview.dataset.rewardType, { effort: Number(form.querySelector('[name="effort"]').value), profitable: form.querySelector('[name="profitable"]').checked });
      preview.textContent = `За выполнение: ${r.xp} XP · ${r.gold ? `${r.gold} золотых` : `${r.coins} монет`}`;
    }
  }
  if (target.closest('#goal-form') && (target.name.startsWith('calendar') || target.name === 'periodText')) updateCalendarFields(target.closest('form'));
  if (target.closest('#goal-form') && ['periodKind', 'periodYear', 'periodIndex'].includes(target.name)) updateGoalPeriodFields(target.closest('form'));
  if (target.id === 'day-focus' || target.id === 'day-review') put('days', { ...day(), [target.id === 'day-focus' ? 'focus' : 'review']: target.value });
  if (target.dataset.goal) {
    const before = gameTotals(state), g = goal(target.dataset.goal); put('goals', { ...g, progress: Number(target.value) }); target.style.setProperty('--progress', `${target.value}%`); target.previousElementSibling.previousElementSibling.querySelector('b').textContent = `${target.value}%`; announceReward(before);
  }
});
document.addEventListener('change', async event => {
  if (event.target.id === 'plan-date') {
    try { const p = calendarPeriod(planLevel, event.target.value); planView[planLevel] = planLevel === 'month' ? p.start.slice(0, 7) : p.start; render(); }
    catch (error) { event.target.value = planView[planLevel]; toast(error.message); }
  }
  if (event.target.closest('#goal-form') && (event.target.name.startsWith('calendar') || event.target.name === 'periodText')) updateCalendarFields(event.target.closest('form'));
  if (event.target.id === 'period-year') { const year = Number(event.target.value); if (Number.isInteger(year) && year >= 1900 && year <= 2200) { periodView.year = year; render(); } else { event.target.value = periodView.year; toast('Год должен быть от 1900 до 2200.'); } }
  if (event.target.closest('#goal-form') && ['periodKind', 'periodYear', 'periodIndex'].includes(event.target.name)) updateGoalPeriodFields(event.target.closest('form'));
  if (event.target.id === 'date-picker' && validDate(event.target.value)) { selectedDate = event.target.value; render(); }
  if (event.target.id === 'import-file') {
    const file = event.target.files[0]; if (!file) return;
    try {
      if (file.size > 5 * 1024 * 1024) throw new Error('Копия слишком большая. Максимум — 5 МБ.');
      const imported = validateState(JSON.parse(await file.text())); state = mergeStates(state, imported); storageFailed = false; save(); render(); toast('Копия объединена с текущими планами');
    } catch (error) { toast(error instanceof SyntaxError ? 'Не удалось прочитать JSON. Выберите резервную копию Опоры.' : error.message); }
    event.target.value = '';
  }
});
document.addEventListener('keydown', event => {
  if (event.ctrlKey || event.metaKey || event.altKey || /INPUT|TEXTAREA|SELECT/.test(event.target.tagName) || event.target.isContentEditable) return;
  if (dialog.open) return;
  if (event.key === 'Escape' && focusMode) { focusTaskId = ''; focusMode = false; render(); }
  else if (['n', 'т'].includes(event.key.toLowerCase())) taskDialog();
  else if (['i', 'ш'].includes(event.key.toLowerCase())) ideaDialog();
  else if (['f', 'а'].includes(event.key.toLowerCase())) { focusTaskId = ''; focusMode = !focusMode; render(); }
});
window.addEventListener('storage', event => {
  if (event.key !== KEY || !event.newValue) return;
  try { state = mergeStates(state, validateState(JSON.parse(event.newValue))); render(); toast('Планы обновлены из другой вкладки'); } catch { toast('Не удалось прочитать изменения из другой вкладки'); }
});
dialog.addEventListener('click', event => { if (event.target === dialog) { const r = dialog.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) closeDialog(); } });
setInterval(updateTimer, 1000);
render();
if ('serviceWorker' in navigator && ['http:', 'https:'].includes(location.protocol)) navigator.serviceWorker.register('./sw.js').catch(() => {});
