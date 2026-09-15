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
import { OrgEntityFormDialog } from '@/features/organization/components/org-entity-form-dialog'
import {
  useCreateDepartment,
  useDeleteDepartment,
  useDepartments,
  useUpdateDepartment,
} from '@/features/organization/hooks/use-organization'
import { departmentFormSchema } from '@/features/organization/schema'
import type { Department } from '@/features/organization/types'
import { useHasPermission } from '@/features/auth/hooks/use-has-permission'
import { PERMISSIONS } from '@/lib/permissions'

export function DepartmentsPage() {
  const { data, isPending, isError, error } = useDepartments()
  const canWrite = useHasPermission(PERMISSIONS.ORG_WRITE)
  const createMutation = useCreateDepartment()
  const updateMutation = useUpdateDepartment()
  const deleteMutation = useDeleteDepartment()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Department | null>(null)

  if (isPending) {
    return <Loader />
  }
  if (isError) {
    return <QueryErrorState error={error} />
  }

  const departments = data ?? []
  const nameById = new Map(departments.map((item) => [item.id, item.name]))

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{departments.length} departments</p>
        {canWrite ? (
          <Button
            type="button"
            onClick={() => {
              setEditing(null)
              setDialogOpen(true)
            }}
          >
            Add department
          </Button>
        ) : null}
      </div>
      {departments.length === 0 ? (
        <EmptyState title="No departments" description="Create a department to start the org tree." />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Code</TableHead>
              <TableHead>Parent</TableHead>
              <TableHead>Status</TableHead>
              {canWrite ? <TableHead>Actions</TableHead> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {departments.map((department) => (
              <TableRow key={department.id}>
                <TableCell>{department.name}</TableCell>
                <TableCell>{department.code}</TableCell>
                <TableCell>{department.parentId ? (nameById.get(department.parentId) ?? '—') : '—'}</TableCell>
                <TableCell>
                  <Badge variant={department.isActive ? 'secondary' : 'outline'}>
                    {department.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </TableCell>
                {canWrite ? (
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditing(department)
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
                            id: department.id,
                            input: { isActive: !department.isActive },
                          })
                        }
                      >
                        {department.isActive ? 'Deactivate' : 'Activate'}
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => void deleteMutation.mutate(department.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                ) : null}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      <OrgEntityFormDialog
        key={editing?.id ?? 'new-department'}
        open={dialogOpen}
        title={editing ? 'Edit department' : 'Create department'}
        description="Name, code, and optional parent."
        submitting={createMutation.isPending || updateMutation.isPending}
        initialName={editing?.name}
        initialCode={editing?.code}
        initialParentId={editing?.parentId ?? null}
        parentOptions={departments.filter((item) => item.id !== editing?.id)}
        parentLabel="Parent"
        onOpenChange={setDialogOpen}
        onSubmit={(input) => {
          const parsed = departmentFormSchema.safeParse(input)
          if (!parsed.success) {
            return
          }
          if (editing) {
            updateMutation.mutate(
              { id: editing.id, input: parsed.data },
              { onSuccess: () => setDialogOpen(false) },
            )
            return
          }
          createMutation.mutate(parsed.data, { onSuccess: () => setDialogOpen(false) })
        }}
      />
    </div>
  )
}
