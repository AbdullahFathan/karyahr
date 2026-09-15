import { EmptyState } from '@/components/common/empty-state'
import { getApiErrorMessage, getApiErrorStatus } from '@/lib/api-error'

type QueryErrorStateProps = {
  readonly error: unknown
  readonly notFoundTitle?: string
}

/**
 * Maps 403/404 (and other query failures) to an honest empty state.
 */
export function QueryErrorState({ error, notFoundTitle = 'Not found' }: QueryErrorStateProps) {
  const status = getApiErrorStatus(error)
  const message = getApiErrorMessage(error)

  if (status === 403) {
    return <EmptyState title="Forbidden" description={message} />
  }

  if (status === 404) {
    return <EmptyState title={notFoundTitle} description={message} />
  }

  return <EmptyState title="Could not load" description={message} />
}
