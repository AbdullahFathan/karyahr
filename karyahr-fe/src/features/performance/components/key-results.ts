import type { GoalKeyResult } from '@/features/performance/types'

export type KeyResultDraft = {
  title: string
  targetValue: string
  currentValue: string
  weight: string
}

export function emptyKeyResultDraft(): KeyResultDraft {
  return { title: '', targetValue: '1', currentValue: '0', weight: '0' }
}

export function draftsFromKeyResults(items: readonly GoalKeyResult[]): KeyResultDraft[] {
  if (items.length === 0) {
    return [emptyKeyResultDraft()]
  }
  return items.map((item) => ({
    title: item.title,
    targetValue: String(item.targetValue),
    currentValue: String(item.currentValue),
    weight: String(item.weight),
  }))
}

export function parseKeyResultDrafts(drafts: readonly KeyResultDraft[]) {
  return drafts
    .filter((item) => item.title.trim().length > 0)
    .map((item) => ({
      title: item.title.trim(),
      targetValue: Number(item.targetValue),
      currentValue: Number(item.currentValue || 0),
      weight: Number(item.weight),
    }))
}
