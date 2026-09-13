import { type FormEvent, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { EmptyState } from '@/components/common/empty-state'
import { Loader } from '@/components/common/loader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { EmployeeForm } from '@/features/employees/components/employee-form'
import { downloadDocument } from '@/features/employees/api/employees'
import {
  useCreateMutation,
  useDeleteDocument,
  useEmployee,
  useEmployeeDocuments,
  useEmployeeMutations,
  useEmployees,
  useOffboardEmployee,
  useUpdateEmployee,
  useUploadDocument,
} from '@/features/employees/hooks/use-employees'
import { DOCUMENT_TYPES, type DocumentType } from '@/features/employees/types'
import { mutationFormSchema } from '@/features/employees/schema'
import { useDepartments, usePositions } from '@/features/organization/hooks/use-organization'
import { useHasPermission } from '@/features/auth/hooks/use-has-permission'
import { PERMISSIONS } from '@/lib/permissions'
import { toDateInputValue } from '@/lib/dates'
import { EmployeePayrollTab } from '@/features/payroll'

const EMPLOYEE_TABS = ['profile', 'documents', 'mutations', 'payroll'] as const
type EmployeeTab = (typeof EMPLOYEE_TABS)[number]

function isEmployeeTab(value: string | null): value is EmployeeTab {
  return EMPLOYEE_TABS.some((tab) => tab === value)
}

export function EmployeeDetailPage() {
  const { id = '' } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const { data, isPending, isError } = useEmployee(id)
  const canWrite = useHasPermission(PERMISSIONS.EMPLOYEES_WRITE)
  const canPayroll = useHasPermission(PERMISSIONS.PAYROLL_PROFILE_WRITE)
  const requestedTab = searchParams.get('tab')
  const tab: EmployeeTab =
    requestedTab === 'payroll' && !canPayroll
      ? 'profile'
      : isEmployeeTab(requestedTab)
        ? requestedTab
        : 'profile'

  if (isPending) {
    return <Loader />
  }
  if (isError || !data) {
    return <EmptyState title="Employee not found" />
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-heading text-xl font-semibold">{data.fullName}</h2>
          <p className="text-sm text-muted-foreground">{data.employeeNumber}</p>
        </div>
        <Badge variant="secondary">{data.status}</Badge>
      </div>
      <Tabs
        value={tab}
        onValueChange={(value) => {
          if (!isEmployeeTab(value)) {
            return
          }
          setSearchParams(value === 'profile' ? {} : { tab: value }, { replace: true })
        }}
      >
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="mutations">Mutations</TabsTrigger>
          {canPayroll ? <TabsTrigger value="payroll">Payroll</TabsTrigger> : null}
        </TabsList>
        <TabsContent value="profile" className="pt-4">
          <ProfileTab employeeId={id} canWrite={canWrite} />
        </TabsContent>
        <TabsContent value="documents" className="pt-4">
          <DocumentsTab employeeId={id} />
        </TabsContent>
        <TabsContent value="mutations" className="pt-4">
          <MutationsTab employeeId={id} canWrite={canWrite} />
        </TabsContent>
        {canPayroll ? (
          <TabsContent value="payroll" className="pt-4">
            <EmployeePayrollTab employeeId={id} />
          </TabsContent>
        ) : null}
      </Tabs>
    </div>
  )
}

function ProfileTab({ employeeId, canWrite }: { readonly employeeId: string; readonly canWrite: boolean }) {
  const { data } = useEmployee(employeeId)
  const updateMutation = useUpdateEmployee(employeeId)
  const offboardMutation = useOffboardEmployee(employeeId)
  const { data: departments } = useDepartments()
  const { data: positions } = usePositions()
  const { data: employees } = useEmployees({ page: 1, pageSize: 100 })
  const [reason, setReason] = useState('')

  if (!data) {
    return <Loader />
  }

  return (
    <div className="flex flex-col gap-6">
      <EmployeeForm
        departments={departments ?? []}
        positions={positions ?? []}
        managers={employees?.data ?? []}
        initial={data}
        submitting={updateMutation.isPending || !canWrite}
        submitLabel="Save profile"
        onSubmit={(input) => {
          if (!canWrite) {
            return
          }
          updateMutation.mutate(input)
        }}
      />
      {canWrite && data.status !== 'INACTIVE' ? (
        <AlertDialog>
          <AlertDialogTrigger>
            Offboard
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Offboard this employee?</AlertDialogTitle>
              <AlertDialogDescription>
                Status becomes INACTIVE. The linked user is disabled and sessions are revoked.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="offboard-reason">Reason (optional)</FieldLabel>
                <Textarea id="offboard-reason" value={reason} onChange={(event) => setReason(event.target.value)} />
              </Field>
            </FieldGroup>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                onClick={() => offboardMutation.mutate(reason || undefined)}
              >
                Confirm offboard
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ) : null}
    </div>
  )
}

function DocumentsTab({ employeeId }: { readonly employeeId: string }) {
  const canRead = useHasPermission(PERMISSIONS.EMPLOYEES_DOCUMENTS_READ)
  const canWrite = useHasPermission(PERMISSIONS.EMPLOYEES_DOCUMENTS_WRITE)
  const { data, isPending } = useEmployeeDocuments(employeeId)
  const uploadMutation = useUploadDocument(employeeId)
  const deleteMutation = useDeleteDocument(employeeId)
  const [type, setType] = useState<DocumentType>('KTP')
  const [file, setFile] = useState<File | null>(null)

  if (!canRead) {
    return <EmptyState title="Not allowed" description="You cannot view documents." />
  }
  if (isPending) {
    return <Loader />
  }

  function handleUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!file) {
      return
    }
    uploadMutation.mutate({ file, type }, { onSuccess: () => setFile(null) })
  }

  return (
    <div className="flex flex-col gap-4">
      {canWrite ? (
        <form onSubmit={handleUpload} className="flex flex-wrap items-end gap-3">
          <Field>
            <FieldLabel>Type</FieldLabel>
            <Select value={type} onValueChange={(value) => setType((value ?? 'KTP') as DocumentType)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {DOCUMENT_TYPES.map((item) => (
                    <SelectItem key={item} value={item}>
                      {item}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel htmlFor="document-file">File</FieldLabel>
            <Input
              id="document-file"
              type="file"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />
          </Field>
          <Button type="submit" disabled={!file || uploadMutation.isPending}>
            Upload
          </Button>
        </form>
      ) : null}
      {!data || data.length === 0 ? (
        <EmptyState title="No documents" />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Type</TableHead>
              <TableHead>File</TableHead>
              <TableHead>Size</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((documentRow) => (
              <TableRow key={documentRow.id}>
                <TableCell>{documentRow.type}</TableCell>
                <TableCell>{documentRow.fileName}</TableCell>
                <TableCell>{documentRow.sizeBytes}</TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => void downloadDocument(employeeId, documentRow.id, documentRow.fileName)}
                    >
                      Download
                    </Button>
                    {canWrite ? (
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => deleteMutation.mutate(documentRow.id)}
                      >
                        Delete
                      </Button>
                    ) : null}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}

function MutationsTab({ employeeId, canWrite }: { readonly employeeId: string; readonly canWrite: boolean }) {
  const { data, isPending } = useEmployeeMutations(employeeId)
  const createMutation = useCreateMutation(employeeId)
  const { data: departments } = useDepartments()
  const { data: positions } = usePositions()
  const [toDepartmentId, setToDepartmentId] = useState('')
  const [toPositionId, setToPositionId] = useState('')
  const [effectiveAt, setEffectiveAt] = useState(toDateInputValue(new Date()))
  const [reason, setReason] = useState('')
  const departmentName = new Map((departments ?? []).map((item) => [item.id, item.name]))
  const positionName = new Map((positions ?? []).map((item) => [item.id, item.name]))

  if (isPending) {
    return <Loader />
  }

  return (
    <div className="flex flex-col gap-6">
      {canWrite ? (
        <form
          className="flex max-w-xl flex-col gap-3"
          onSubmit={(event) => {
            event.preventDefault()
            const parsed = mutationFormSchema.safeParse({
              toDepartmentId,
              toPositionId,
              effectiveAt,
              reason,
            })
            if (!parsed.success) {
              return
            }
            createMutation.mutate(parsed.data, {
              onSuccess: () => {
                setReason('')
              },
            })
          }}
        >
          <Field>
            <FieldLabel>To department</FieldLabel>
            <Select value={toDepartmentId || undefined} onValueChange={(value) => setToDepartmentId(value ?? '')}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Department" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {(departments ?? []).map((department) => (
                    <SelectItem key={department.id} value={department.id}>
                      {department.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel>To position</FieldLabel>
            <Select value={toPositionId || undefined} onValueChange={(value) => setToPositionId(value ?? '')}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Position" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {(positions ?? []).map((position) => (
                    <SelectItem key={position.id} value={position.id}>
                      {position.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel htmlFor="effectiveAt">Effective at</FieldLabel>
            <Input
              id="effectiveAt"
              type="date"
              value={effectiveAt}
              onChange={(event) => setEffectiveAt(event.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="mutation-reason">Reason</FieldLabel>
            <Textarea id="mutation-reason" value={reason} onChange={(event) => setReason(event.target.value)} />
          </Field>
          <Button type="submit" disabled={createMutation.isPending}>
            Add mutation
          </Button>
        </form>
      ) : null}
      {!data || data.length === 0 ? (
        <EmptyState title="No mutations" />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>From department</TableHead>
              <TableHead>To department</TableHead>
              <TableHead>From position</TableHead>
              <TableHead>To position</TableHead>
              <TableHead>Effective</TableHead>
              <TableHead>Reason</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((mutation) => (
              <TableRow key={mutation.id}>
                <TableCell>{departmentName.get(mutation.fromDepartmentId) ?? mutation.fromDepartmentId}</TableCell>
                <TableCell>{departmentName.get(mutation.toDepartmentId) ?? mutation.toDepartmentId}</TableCell>
                <TableCell>{positionName.get(mutation.fromPositionId) ?? mutation.fromPositionId}</TableCell>
                <TableCell>{positionName.get(mutation.toPositionId) ?? mutation.toPositionId}</TableCell>
                <TableCell>{toDateInputValue(mutation.effectiveAt)}</TableCell>
                <TableCell>{mutation.reason}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
