import { Button } from '@/components/ui/button'

type ListPaginationProps = {
  readonly page: number
  readonly totalPages: number
  readonly onPageChange: (page: number) => void
}

/**
 * Prev/Next controls for paginated list pages.
 */
export function ListPagination({ page, totalPages, onPageChange }: ListPaginationProps) {
  const pages = Math.max(1, totalPages)
  return (
    <div className="flex items-center gap-2">
      <Button type="button" variant="outline" size="sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
        Previous
      </Button>
      <p className="text-sm text-muted-foreground">
        Page {page} of {pages}
      </p>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={page >= pages}
        onClick={() => onPageChange(page + 1)}
      >
        Next
      </Button>
    </div>
  )
}
