export interface AccountSnapshot {
  settings?: Record<string, unknown>;
  progress?: Array<{ algorithmSlug: string; categoryId: string; attempts: number; correct: number; mistakes?: number; lastSeen?: number }>;
  learner?: { xp?: number; streak?: number; gamification?: boolean; achievements?: string[] };
  events?: Array<{ id: string; type: "attempt" | "study"; slug: string; category: string; correct?: boolean; createdAt: number }>;
  savedVisualizations?: Array<{ slug: string; label?: string; payload: unknown }>;
  savedComparisons?: Array<{ key: string; label?: string; payload: unknown }>;
}

const MAX_RECORDS = 1_000;
const MAX_SAVES = 100;
const validText = (value: unknown, max = 160) => typeof value === "string" && value.length > 0 && value.length <= max;
const validCount = (value: unknown) => typeof value === "number" && Number.isSafeInteger(value) && value >= 0 && value <= 1_000_000;
const validTimestamp = (value: unknown) => typeof value === "number" && Number.isSafeInteger(value) && value >= 0 && value <= 4_102_444_800_000;
const optionalCount = (value: unknown) => value === undefined || validCount(value);

export function isValidSnapshot(snapshot: AccountSnapshot | null): snapshot is AccountSnapshot {
  if (!snapshot || typeof snapshot !== "object") return false;
  if ((snapshot.events?.length ?? 0) > MAX_RECORDS || (snapshot.progress?.length ?? 0) > MAX_RECORDS || (snapshot.savedVisualizations?.length ?? 0) > MAX_SAVES || (snapshot.savedComparisons?.length ?? 0) > MAX_SAVES) return false;
  if (snapshot.settings && (typeof snapshot.settings !== "object" || Array.isArray(snapshot.settings) || JSON.stringify(snapshot.settings).length > 32_000)) return false;
  if (snapshot.learner && (!optionalCount(snapshot.learner.xp) || !optionalCount(snapshot.learner.streak) || (snapshot.learner.gamification !== undefined && typeof snapshot.learner.gamification !== "boolean") || (snapshot.learner.achievements !== undefined && (!Array.isArray(snapshot.learner.achievements) || snapshot.learner.achievements.length > MAX_RECORDS || !snapshot.learner.achievements.every((key) => validText(key)))))) return false;
  return (snapshot.progress ?? []).every((record) => validText(record.algorithmSlug) && validText(record.categoryId) && validCount(record.attempts) && validCount(record.correct) && record.correct <= record.attempts && (record.mistakes === undefined || validCount(record.mistakes)) && (record.lastSeen === undefined || validTimestamp(record.lastSeen)))
    && (snapshot.events ?? []).every((event) => validText(event.id) && validText(event.slug) && validText(event.category) && (event.type === "attempt" || event.type === "study") && (event.correct === undefined || typeof event.correct === "boolean") && validTimestamp(event.createdAt))
    && (snapshot.savedVisualizations ?? []).every((save) => validText(save.slug) && (!save.label || validText(save.label)) && JSON.stringify(save.payload).length <= 64_000)
    && (snapshot.savedComparisons ?? []).every((save) => validText(save.key) && (!save.label || validText(save.label)) && JSON.stringify(save.payload).length <= 64_000);
}
