/* ============================================================
   STREAK — daily streak with 1 grace/freeze day per ISO week
   Depends on: core/utils.js (todayStr, isoWeekKey), core/state.js (reviewLog)
   ============================================================ */
function computeStreak() {
  let streak = 0,
    d = new Date();
  const usedFreeze = {};
  if (!reviewLog[todayStr(d)]) d.setDate(d.getDate() - 1);
  let guard = 0;
  while (guard++ < 400) {
    const key = todayStr(d);
    if (reviewLog[key]) {
      streak++;
      d.setDate(d.getDate() - 1);
      continue;
    }
    const wk = isoWeekKey(d);
    if (!usedFreeze[wk]) {
      usedFreeze[wk] = true;
      d.setDate(d.getDate() - 1);
      continue;
    }
    break;
  }
  return streak;
}
