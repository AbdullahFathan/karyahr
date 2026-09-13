import { Button } from '@/components/ui/button'
import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
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

type KeyResultsEditorProps = {
  readonly drafts: readonly KeyResultDraft[]
  readonly onChange: (drafts: KeyResultDraft[]) => void
}

export function KeyResultsEditor({ drafts, onChange }: KeyResultsEditorProps) {
  const weightSum = drafts.reduce((sum, item) => sum + (Number(item.weight) || 0), 0)

  return (
    <div className="flex flex-col gap-3">
      {drafts.map((draft, index) => (
        <div key={index} className="grid gap-2 rounded-lg border p-3 sm:grid-cols-2">
          <Field className="sm:col-span-2">
            <FieldLabel>Key result title</FieldLabel>
            <Input
              value={draft.title}
              onChange={(event) => {
                const next = drafts.map((item, itemIndex) =>
                  itemIndex === index ? { ...item, title: event.target.value } : item,
                )
                onChange(next)
              }}
            />
          </Field>
          <Field>
            <FieldLabel>Target</FieldLabel>
            <Input
              type="number"
              min="0"
              step="any"
              value={draft.targetValue}
              onChange={(event) => {
                const next = drafts.map((item, itemIndex) =>
                  itemIndex === index ? { ...item, targetValue: event.target.value } : item,
                )
                onChange(next)
              }}
            />
          </Field>
          <Field>
            <FieldLabel>Current</FieldLabel>
            <Input
              type="number"
              min="0"
              step="any"
              value={draft.currentValue}
              onChange={(event) => {
                const next = drafts.map((item, itemIndex) =>
                  itemIndex === index ? { ...item, currentValue: event.target.value } : item,
                )
                onChange(next)
              }}
            />
          </Field>
          <Field>
            <FieldLabel>Weight</FieldLabel>
            <Input
              type="number"
              min="0"
              max="100"
              value={draft.weight}
              onChange={(event) => {
                const next = drafts.map((item, itemIndex) =>
                  itemIndex === index ? { ...item, weight: event.target.value } : item,
                )
                onChange(next)
              }}
            />
          </Field>
          <div className="flex items-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={drafts.length <= 1}
              onClick={() => onChange(drafts.filter((_, itemIndex) => itemIndex !== index))}
            >
              Remove
            </Button>
          </div>
        </div>
      ))}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Weights sum {weightSum} (must be 100 when used)</p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onChange([...drafts, emptyKeyResultDraft()])}
        >
          Add key result
        </Button>
      </div>
    </div>
  )
}
