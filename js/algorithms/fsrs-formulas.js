/* ============================================================
   FSRS-6 FORMULAS — công thức toán thuần (không đụng progress/DOM): trọng số chính
   thức, stability/difficulty/retrievability, khoảng ôn tiếp theo có fuzz. Dùng bởi
   algorithms/fsrs-scheduler.js. Đổi tham số thuật toán (trọng số, ngưỡng) thì sửa ở đây.
   Depends on: core/utils.js (clamp), core/state.js (settings — cho learningSteps/
               relearningSteps/leechThreshold)
   ============================================================ */

/* ---- Tham số FSRS-6 mặc định chính thức (21 trọng số) ---- */
const FSRS_W = [
  0.212, 1.2931, 2.3065, 8.2956, 6.4133, 0.8334, 3.0194, 0.001, 1.8722, 0.1666,
  0.796, 1.4835, 0.0614, 0.2629, 1.6483, 0.6014, 1.8729, 0.5425, 0.0912, 0.0658,
  0.1542,
];
const FSRS_DECAY = -FSRS_W[20];
const FSRS_FACTOR = Math.pow(0.9, 1 / FSRS_DECAY) - 1;
const DESIRED_RETENTION = 0.9;
const MAX_INTERVAL_DAYS = 36500;

const GRADE = { again: 1, hard: 2, good: 3, easy: 4 };

function learningSteps() {
  return settings.learningSteps && settings.learningSteps.length
    ? settings.learningSteps
    : [1, 10];
}
function relearningSteps() {
  return settings.relearningSteps && settings.relearningSteps.length
    ? settings.relearningSteps
    : [10];
}
function leechThreshold() {
  return settings.leechThreshold || 8;
}

function addMinutes(date, min) {
  return new Date(date.getTime() + min * 60000);
}

/* ---- Công thức toán FSRS-6 ---- */
function fsrsInitialStability(grade) {
  return Math.max(0.1, FSRS_W[grade - 1]);
}
function fsrsInitialDifficulty(grade) {
  return clamp(FSRS_W[4] - Math.exp(FSRS_W[5] * (grade - 1)) + 1, 1, 10);
}
function fsrsMeanReversion(init, current) {
  return FSRS_W[7] * init + (1 - FSRS_W[7]) * current;
}
function fsrsNextDifficulty(d, grade) {
  const next = d - FSRS_W[6] * (grade - 3);
  return clamp(fsrsMeanReversion(fsrsInitialDifficulty(4), next), 1, 10);
}
function fsrsRetrievability(elapsedDays, stability) {
  if (stability <= 0) return 0;
  return Math.pow(1 + (FSRS_FACTOR * elapsedDays) / stability, FSRS_DECAY);
}
function fsrsNextRecallStability(d, s, r, grade) {
  const hardPenalty = grade === GRADE.hard ? FSRS_W[15] : 1;
  const easyBonus = grade === GRADE.easy ? FSRS_W[16] : 1;
  return (
    s *
    (1 +
      Math.exp(FSRS_W[8]) *
        (11 - d) *
        Math.pow(s, -FSRS_W[9]) *
        (Math.exp((1 - r) * FSRS_W[10]) - 1) *
        hardPenalty *
        easyBonus)
  );
}
function fsrsNextForgetStability(d, s, r) {
  return Math.min(
    FSRS_W[11] *
      Math.pow(d, -FSRS_W[12]) *
      (Math.pow(s + 1, FSRS_W[13]) - 1) *
      Math.exp((1 - r) * FSRS_W[14]),
    s,
  );
}

/* ---- Khoảng ôn tiếp theo (ngày), có "fuzz" ngẫu nhiên nhẹ giống Anki ---- */
const FUZZ_RANGES = [
  { start: 2.5, end: 7.0, factor: 0.15 },
  { start: 7.0, end: 20.0, factor: 0.1 },
  { start: 20.0, end: Infinity, factor: 0.05 },
];
function fuzzedInterval(interval) {
  if (interval < 2.5) return Math.max(1, Math.round(interval));
  let delta = 1.0;
  FUZZ_RANGES.forEach((r) => {
    delta += r.factor * Math.max(0, Math.min(interval, r.end) - r.start);
  });
  const lo = Math.max(1, Math.round(interval - delta));
  const hi = Math.min(MAX_INTERVAL_DAYS, Math.round(interval + delta));
  return lo + Math.floor(Math.random() * (Math.max(lo, hi) - lo + 1));
}
function fsrsNextIntervalDays(stability, retention = DESIRED_RETENTION) {
  const raw =
    (stability / FSRS_FACTOR) * (Math.pow(retention, 1 / FSRS_DECAY) - 1);
  return fuzzedInterval(clamp(raw, 1, MAX_INTERVAL_DAYS));
}
