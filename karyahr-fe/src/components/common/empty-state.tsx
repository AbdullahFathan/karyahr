type EmptyStateProps = {
  readonly title: string
  readonly description?: string
}

export function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <div>
      <h2 style={{ margin: 0, fontSize: 16 }}>{title}</h2>
      {description ? <p>{description}</p> : null}
    </div>
  )
}
