import { useState } from 'react'
import { EmptyState } from '@/components/common/empty-state'
import { Loader } from '@/components/common/loader'
import { QueryErrorState } from '@/components/common/query-error-state'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { SalaryComponentFormDialog } from '@/features/payroll/components/salary-component-form-dialog'
import {
  useCreateSalaryComponent,
  useSalaryComponents,
  useUpdateSalaryComponent,
} from '@/features/payroll/hooks/use-payroll'
import type { SalaryComponent } from '@/features/payroll/types'

export function SalaryComponentsPage() {
  const { data, isPending, isError, error } = useSalaryComponents()
  const createMutation = useCreateSalaryComponent()
  const updateMutation = useUpdateSalaryComponent()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<SalaryComponent | null>(null)

  if (isPending) {
    return <Loader />
  }
  if (isError) {
    return <QueryErrorState error={error} />
  }

  const components = data ?? []

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{components.length} salary components</p>
        <Button
          type="button"
          onClick={() => {
            setEditing(null)
            setDialogOpen(true)
          }}
        >
          Add component
        </Button>
      </div>
      {components.length === 0 ? (
        <EmptyState title="No salary components" />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Kind</TableHead>
              <TableHead>Taxable</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {components.map((component) => (
              <TableRow key={component.id}>
                <TableCell>{component.code}</TableCell>
                <TableCell>{component.name}</TableCell>
                <TableCell>
                  <Badge variant="secondary">{component.kind}</Badge>
                </TableCell>
                <TableCell>{component.isTaxable ? 'Yes' : 'No'}</TableCell>
                <TableCell>
                  <Badge variant={component.isActive ? 'secondary' : 'outline'}>
                    {component.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditing(component)
                        setDialogOpen(true)
                      }}
                    >
                      Edit
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        void updateMutation.mutate({
                          id: component.id,
                          input: { isActive: !component.isActive },
                        })
                      }
                    >
                      {component.isActive ? 'Deactivate' : 'Activate'}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      {dialogOpen ? (
        <SalaryComponentFormDialog
          key={editing?.id ?? 'new-component'}
          open={dialogOpen}
          component={editing}
          submitting={createMutation.isPending || updateMutation.isPending}
          onOpenChange={setDialogOpen}
          onSubmit={(input) => {
            if (editing) {
              updateMutation.mutate({ id: editing.id, input }, { onSuccess: () => setDialogOpen(false) })
              return
            }
            createMutation.mutate(input, { onSuccess: () => setDialogOpen(false) })
          }}
        />
      ) : null}
    </div>
  )
}
