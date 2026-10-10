import { active } from './core.js';

export const isComplete = (type, record) => !!record && (type === 'tasks' ? record.done === true : record.progress === 100);
export function rewardFor(type, record) {
  const multiplier = record.effort || 1, amount = (type === 'tasks' ? 1 : 5) * multiplier;
  return { xp: (type === 'tasks' ? 10 : 50) * multiplier, coins: record.profitable ? 0 : amount, gold: record.profitable ? amount : 0 };
}
// One award ID per source: completing again never creates a second credit.
export function updateAward(state, type, record, previous) {
  if (!['tasks', 'goals'].includes(type)) return;
  const id = `${type}.${record.id}`, index = state.awards.findIndex(a => a.id === id), completed = isComplete(type, record);
  if (index === -1 && (!completed || isComplete(type, previous))) return;
  const existing = state.awards[index];
  const award = { id, title: record.title, notes: '', sourceType: type, sourceId: record.id, earned: completed, ...(existing ? { xp: existing.xp, coins: existing.coins, gold: existing.gold } : rewardFor(type, record)), updatedAt: record.updatedAt, deleted: false };
  if (index === -1) state.awards.push(award); else state.awards[index] = award;
}
export function earnedAwards(state) {
  const sources = { tasks: new Map(state.tasks.map(t => [t.id, t])), goals: new Map(state.goals.map(g => [g.id, g])) };
  return active(state.awards).filter(award => {
    const source = sources[award.sourceType].get(award.sourceId);
    return source && !source.deleted ? isComplete(award.sourceType, source) : award.earned;
  });
}
export function gameTotals(state) {
  const totals = earnedAwards(state).reduce((sum, award) => ({ xp: sum.xp + award.xp, coins: sum.coins + award.coins, gold: sum.gold + award.gold }), { xp: 0, coins: 0, gold: 0 });
  for (const purchase of active(state.purchases)) totals[purchase.currency] -= purchase.cost;
  return { ...totals, level: Math.floor(totals.xp / 100) + 1, progress: totals.xp % 100, next: 100 - totals.xp % 100 };
}
export function purchaseWish(state, wishId, id, updatedAt) {
  const wish = active(state.wishes).find(w => w.id === wishId);
  if (!wish) throw new Error('Желание уже удалено.');
  if (!wish.repeatable && active(state.purchases).some(p => p.wishId === wishId)) throw new Error('Это желание уже куплено.');
  if (gameTotals(state)[wish.currency] < wish.cost) throw new Error('Пока не хватает монет. Продолжайте выполнять свои дела.');
  return { id, title: wish.title, notes: wish.notes, wishId, cost: wish.cost, currency: wish.currency, fulfilled: false, updatedAt, deleted: false };
}
