import { useState } from 'react'
import { EmptyState } from '@/components/common/empty-state'
import { Loader } from '@/components/common/loader'
import { QueryErrorState } from '@/components/common/query-error-state'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { LeavePolicyFormDialog } from '@/features/leave/components/leave-policy-form-dialog'
import {
  useCreateLeavePolicy,
  useLeavePolicies,
  useLeaveTypes,
  useUpdateLeavePolicy,
} from '@/features/leave/hooks/use-leave'
import type { LeavePolicy } from '@/features/leave/types'
import { useDepartments, usePositions } from '@/features/organization/hooks/use-organization'

export function LeavePoliciesPage() {
  const { data, isPending, isError, error } = useLeavePolicies()
  const { data: types } = useLeaveTypes()
  const { data: departments } = useDepartments()
  const { data: positions } = usePositions()
  const createMutation = useCreateLeavePolicy()
  const updateMutation = useUpdateLeavePolicy()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<LeavePolicy | null>(null)

  if (isPending) {
    return <Loader />
  }
  if (isError) {
    return <QueryErrorState error={error} />
  }

  const policies = data ?? []
  const typeName = new Map((types ?? []).map((item) => [item.id, item.name]))
  const departmentName = new Map((departments ?? []).map((item) => [item.id, item.name]))
  const positionName = new Map((positions ?? []).map((item) => [item.id, item.name]))

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{policies.length} policies</p>
        <Button
          type="button"
          onClick={() => {
            setEditing(null)
            setDialogOpen(true)
          }}
        >
          Add policy
        </Button>
      </div>
      {policies.length === 0 ? (
        <EmptyState title="No leave policies" />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Type</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Position</TableHead>
              <TableHead>Allowance</TableHead>
              <TableHead>Levels</TableHead>
              <TableHead>Accrual</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {policies.map((policy) => (
              <TableRow key={policy.id}>
                <TableCell>{typeName.get(policy.leaveTypeId) ?? policy.leaveTypeId}</TableCell>
                <TableCell>
                  {policy.departmentId ? (departmentName.get(policy.departmentId) ?? policy.departmentId) : 'Any'}
                </TableCell>
                <TableCell>
                  {policy.positionId ? (positionName.get(policy.positionId) ?? policy.positionId) : 'Any'}
                </TableCell>
                <TableCell>{policy.annualAllowanceDays}</TableCell>
                <TableCell>{policy.approvalLevelCount}</TableCell>
                <TableCell>{policy.accrualPerMonth}</TableCell>
                <TableCell>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditing(policy)
                      setDialogOpen(true)
                    }}
                  >
                    Edit
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      {dialogOpen ? (
        <LeavePolicyFormDialog
          key={editing?.id ?? 'new-policy'}
          open={dialogOpen}
          policy={editing}
          types={types ?? []}
          departments={departments ?? []}
          positions={positions ?? []}
          submitting={createMutation.isPending || updateMutation.isPending}
          onOpenChange={setDialogOpen}
          onSubmit={(input) => {
            if (editing) {
              updateMutation.mutate(
                {
                  id: editing.id,
                  input: {
                    departmentId: input.departmentId,
                    positionId: input.positionId,
                    annualAllowanceDays: input.annualAllowanceDays,
                    approvalLevelCount: input.approvalLevelCount,
                    accrualPerMonth: input.accrualPerMonth,
                  },
                },
                { onSuccess: () => setDialogOpen(false) },
              )
              return
            }
            createMutation.mutate(input, { onSuccess: () => setDialogOpen(false) })
          }}
        />
      ) : null}
    </div>
  )
}
