import { useState } from 'react'
import { EmptyState } from '@/components/common/empty-state'
import { Loader } from '@/components/common/loader'
import { QueryErrorState } from '@/components/common/query-error-state'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useDepartments, useOrgTree } from '@/features/organization/hooks/use-organization'
import type { OrgTreeNode } from '@/features/organization/types'

export function OrgTreePage() {
  const { data: departments } = useDepartments()
  const [departmentId, setDepartmentId] = useState<string | undefined>()
  const { data, isPending, isError, error } = useOrgTree(departmentId)

  return (
    <div className="flex flex-col gap-4">
      <Select
        value={departmentId ?? 'all'}
        onValueChange={(value) => setDepartmentId(value === 'all' ? undefined : value)}
      >
        <SelectTrigger className="w-64">
          <SelectValue placeholder="All departments" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectItem value="all">All departments</SelectItem>
            {(departments ?? []).map((department) => (
              <SelectItem key={department.id} value={department.id}>
                {department.name}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
      {isPending ? (
        <Loader />
      ) : isError ? (
        <QueryErrorState error={error} />
      ) : !data || data.length === 0 ? (
        <EmptyState title="No org tree" />
      ) : (
        <div className="flex flex-col gap-3">
          {data.map((node) => (
            <OrgNodeCard key={node.id} node={node} />
          ))}
        </div>
      )}
    </div>
  )
}

function OrgNodeCard({ node }: { readonly node: OrgTreeNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {node.name}
          <Badge variant="outline">{node.code}</Badge>
          {node.isActive ? null : <Badge variant="secondary">Inactive</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {node.employees.length > 0 ? (
          <ul className="flex flex-col gap-1 text-sm">
            {node.employees.map((employee) => (
              <li key={employee.id}>
                {employee.fullName} — {employee.positionName}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No employees in this department.</p>
        )}
        {node.children.length > 0 ? (
          <div className="flex flex-col gap-3 border-l pl-4">
            {node.children.map((child) => (
              <OrgNodeCard key={child.id} node={child} />
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
