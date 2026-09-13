import { type FormEvent, useState } from 'react'
import { useParams } from 'react-router-dom'
import { EmptyState } from '@/components/common/empty-state'
import { Loader } from '@/components/common/loader'
import { Button } from '@/components/ui/button'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { assignShiftSchema } from '@/features/attendance/schema'
import { useAssignShift, useShift, useShiftAssignments, useShifts } from '@/features/attendance/hooks/use-attendance'
import { useEmployees } from '@/features/employees/hooks/use-employees'
import { useHasPermission } from '@/features/auth/hooks/use-has-permission'
import { PERMISSIONS } from '@/lib/permissions'
import { todayJakarta, toDateInputValue } from '@/lib/dates'
import { useDebounce } from '@/hooks/use-debounce'

export function ShiftAssignmentsPage() {
  const { id } = useParams()
  const shiftId = id ?? ''
  const canWrite = useHasPermission(PERMISSIONS.ATTENDANCE_SHIFTS_WRITE)
  const canReadEmployees = useHasPermission(PERMISSIONS.EMPLOYEES_READ)
  const { data: shift, isPending: shiftPending } = useShift(shiftId)
  const { data: shifts } = useShifts()
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 300)
  const { data: employees } = useEmployees(
    {
      search: debouncedSearch,
      page: 1,
      pageSize: 50,
    },
    canReadEmployees,
  )
  const [employeeId, setEmployeeId] = useState('')
  const [listEmployeeId, setListEmployeeId] = useState('')
  const [effectiveFrom, setEffectiveFrom] = useState(todayJakarta())
  const [formError, setFormError] = useState<string | null>(null)
  const assignMutation = useAssignShift()
  const { data: assignments, isPending: listPending } = useShiftAssignments(listEmployeeId)
  const shiftName = new Map((shifts ?? []).map((item) => [item.id, item.name]))

  function handleAssign(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(null)
    const parsed = assignShiftSchema.safeParse({ employeeId, effectiveFrom })
    if (!parsed.success) {
      setFormError('Select an employee and effective date.')
      return
    }
    assignMutation.mutate(
      { shiftId, input: parsed.data },
      {
        onSuccess: () => {
          setListEmployeeId(parsed.data.employeeId)
        },
      },
    )
  }

  if (shiftPending) {
    return <Loader />
  }

  if (!shift) {
    return <EmptyState title="Shift not found" />
  }

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-muted-foreground">
        Assign employees to {shift.name} ({shift.code}).
      </p>
      {canWrite && canReadEmployees ? (
        <form onSubmit={handleAssign} className="flex max-w-xl flex-col gap-3">
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="assign-search">Search employees</FieldLabel>
              <Input
                id="assign-search"
                placeholder="Name or number"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel>Employee</FieldLabel>
              <Select value={employeeId || undefined} onValueChange={setEmployeeId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {(employees?.data ?? []).map((employee) => (
                      <SelectItem key={employee.id} value={employee.id}>
                        {employee.fullName} ({employee.employeeNumber})
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="effective-from">Effective from</FieldLabel>
              <Input
                id="effective-from"
                type="date"
                value={effectiveFrom}
                onChange={(event) => setEffectiveFrom(event.target.value)}
              />
            </Field>
            {formError ? <FieldError>{formError}</FieldError> : null}
          </FieldGroup>
          <Button type="submit" disabled={assignMutation.isPending}>
            Assign to this shift
          </Button>
        </form>
      ) : null}
      <div className="flex max-w-xl flex-col gap-3">
        <Field>
          <FieldLabel>List assignments for employee</FieldLabel>
          <Select
            value={listEmployeeId || undefined}
            onValueChange={setListEmployeeId}
            disabled={!canReadEmployees}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select employee" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {(employees?.data ?? []).map((employee) => (
                  <SelectItem key={employee.id} value={employee.id}>
                    {employee.fullName} ({employee.employeeNumber})
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>
        {!listEmployeeId ? (
          <EmptyState title="Pick an employee" description="Assignments are listed per employee." />
        ) : listPending ? (
          <Loader />
        ) : !assignments || assignments.length === 0 ? (
          <EmptyState title="No assignments" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Shift</TableHead>
                <TableHead>Effective from</TableHead>
                <TableHead>Effective to</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assignments.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{shiftName.get(item.shiftId) ?? item.shiftId}</TableCell>
                  <TableCell>{toDateInputValue(item.effectiveFrom)}</TableCell>
                  <TableCell>{item.effectiveTo ? toDateInputValue(item.effectiveTo) : '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  )
}
