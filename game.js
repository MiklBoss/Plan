// The journal is shared by backups, GitHub and tabs. Task IDs make earnings idempotent.
import { active } from './core.js';
export const EFFORTS = [{ coins: 3, title: 'Небольшой шаг' }, { coins: 10, title: 'Обычное дело' }, { coins: 25, title: 'Большое усилие' }];
export function gameTotals(state, month) {
  const records = active(state.ledger), earnings = effectiveEarnings(state);
  const earned = [...earnings.values()].reduce((a, b) => a + b, 0);
  const spent = records.filter(r => r.kind === 'buy').reduce((n, r) => n + r.coins, 0);
  const euroSpent = records.filter(r => r.kind === 'buy' && r.date.startsWith(month)).reduce((n, r) => n + r.euroCents, 0);
  const budgetCents = active(state.gameSettings).find(r => r.id === 'budget:' + month)?.budgetCents || 0;
  const xp = earned * 5, level = Math.floor(xp / 500) + 1;
  return { earned, spent, balance: earned - spent, xp, level, next: level * 500, progress: xp % 500 / 5, euroSpent, budgetCents, remainingCents: budgetCents - euroSpent };
}
export function earningFor(state, task, today) {
  if (state.ledger.some(r => r.id === 'earn:' + task.id)) return null;
  const tasks = active(state.tasks), groupId = task.gameGroupId || task.parentTaskId || task.id;
  const root = tasks.find(t => t.id === groupId) || { ...task, id: groupId };
  const existing = active(state.ledger).filter(r => r.kind === 'earn' && r.groupId === root.id);
  const cap = existing.length ? Math.min(...existing.map(r => r.cap)) : ([3, 10, 25].includes(root.effort) ? root.effort : 10);
  const children = tasks.filter(t => t.parentTaskId === root.id);
  const coins = task.id === root.id ? cap : Math.max(1, Math.floor(cap / (children.length + 1)));
  return { id: 'earn:' + task.id, kind: 'earn', title: task.title, date: today, groupId: root.id, cap, coins };
}
export function canBuy(state, reward, today) {
  const t = gameTotals(state, today.slice(0, 7));
  if (t.balance < reward.cost) return 'Пока не хватает монет.';
  if (reward.euroCents > 0 && t.remainingCents < reward.euroCents) return 'Не хватает бюджета на этот месяц. Накопленные монеты остаются у вас.';
  return '';
}

export function effectiveEarnings(state) {
  const rows = active(state.ledger).filter(r => r.kind === 'earn');
  const caps = new Map();
  for (const r of rows) caps.set(r.groupId, Math.min(caps.get(r.groupId) ?? r.cap, r.cap));
  const used = new Map(), amounts = new Map();
  for (const r of rows.sort((a,b) => a.updatedAt.localeCompare(b.updatedAt) || a.id.localeCompare(b.id))) {
    const amount = Math.min(r.coins, Math.max(0, caps.get(r.groupId) - (used.get(r.groupId) || 0)));
    used.set(r.groupId, (used.get(r.groupId) || 0) + amount); amounts.set(r.id, amount);
  }
  return amounts;
}
export function dayBattle(state, date) {
  const names = ['Хранитель рассеянности', 'Дракон откладывания', 'Король хаоса', 'Паук незавершённых дел', 'Пожиратель времени', 'Туман сомнений', 'Страж рутины'];
  const tasks = active(state.tasks).filter(t => t.date === date);
  const roots = tasks.filter(t => !tasks.some(p => p.id === t.parentTaskId));
  let max = 0, damage = 0;
  for (const root of roots) {
    const effort = [3, 10, 25].includes(root.effort) ? root.effort : 10;
    const children = tasks.filter(t => t.parentTaskId === root.id);
    max += effort;
    damage += root.done ? effort : effort * children.filter(t => t.done).length / (children.length + 1);
  }
  const remaining = Math.max(0, Math.ceil(max - damage));
  return { name: names[new Date(date + 'T12:00:00').getDay()], max, remaining, progress: max ? Math.floor((max - remaining) / max * 100) : 0, defeated: max > 0 && remaining === 0 };
}
