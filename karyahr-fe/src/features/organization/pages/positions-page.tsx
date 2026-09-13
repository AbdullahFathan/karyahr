import { useState } from 'react'
import { EmptyState } from '@/components/common/empty-state'
import { Loader } from '@/components/common/loader'
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
  useCreatePosition,
  useDeletePosition,
  useDepartments,
  usePositions,
  useUpdatePosition,
} from '@/features/organization/hooks/use-organization'
import { positionFormSchema } from '@/features/organization/schema'
import type { Position } from '@/features/organization/types'
import { useHasPermission } from '@/features/auth/hooks/use-has-permission'
import { PERMISSIONS } from '@/lib/permissions'

export function PositionsPage() {
  const { data, isPending } = usePositions()
  const { data: departments } = useDepartments()
  const canWrite = useHasPermission(PERMISSIONS.ORG_WRITE)
  const createMutation = useCreatePosition()
  const updateMutation = useUpdatePosition()
  const deleteMutation = useDeletePosition()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Position | null>(null)
  const [departmentId, setDepartmentId] = useState<string | null>(null)

  if (isPending) {
    return <Loader />
  }

  const positions = data ?? []
  const departmentName = new Map((departments ?? []).map((item) => [item.id, item.name]))
  const positionName = new Map(positions.map((item) => [item.id, item.name]))

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{positions.length} positions</p>
        {canWrite ? (
          <Button
            type="button"
            onClick={() => {
              setEditing(null)
              setDepartmentId(null)
              setDialogOpen(true)
            }}
          >
            Add position
          </Button>
        ) : null}
      </div>
      {positions.length === 0 ? (
        <EmptyState title="No positions" />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Code</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Parent</TableHead>
              <TableHead>Status</TableHead>
              {canWrite ? <TableHead>Actions</TableHead> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {positions.map((position) => (
              <TableRow key={position.id}>
                <TableCell>{position.name}</TableCell>
                <TableCell>{position.code}</TableCell>
                <TableCell>
                  {position.departmentId ? (departmentName.get(position.departmentId) ?? '—') : '—'}
                </TableCell>
                <TableCell>{position.parentId ? (positionName.get(position.parentId) ?? '—') : '—'}</TableCell>
                <TableCell>
                  <Badge variant={position.isActive ? 'secondary' : 'outline'}>
                    {position.isActive ? 'Active' : 'Inactive'}
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
                          setEditing(position)
                          setDepartmentId(position.departmentId)
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
                            id: position.id,
                            input: { isActive: !position.isActive },
                          })
                        }
                      >
                        {position.isActive ? 'Deactivate' : 'Activate'}
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => void deleteMutation.mutate(position.id)}
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
        key={editing?.id ?? 'new-position'}
        open={dialogOpen}
        title={editing ? 'Edit position' : 'Create position'}
        description="Name, code, optional department and parent."
        submitting={createMutation.isPending || updateMutation.isPending}
        initialName={editing?.name}
        initialCode={editing?.code}
        initialParentId={editing?.parentId ?? null}
        parentOptions={positions.filter((item) => item.id !== editing?.id)}
        parentLabel="Parent"
        extraField={{
          label: 'Department',
          value: departmentId,
          options: departments ?? [],
          onChange: setDepartmentId,
        }}
        onOpenChange={setDialogOpen}
        onSubmit={(input) => {
          const parsed = positionFormSchema.safeParse({ ...input, departmentId })
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
