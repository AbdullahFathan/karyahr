import { type FormEvent, useState } from 'react'
import { EmptyState } from '@/components/common/empty-state'
import { Loader } from '@/components/common/loader'
import { QueryErrorState } from '@/components/common/query-error-state'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
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
  useCreateChangeRequest,
  useMyChangeRequests,
  useMyEmployee,
} from '@/features/employees/hooks/use-employees'
import { essChangeRequestSchema } from '@/features/employees/schema'
import { useHasPermission } from '@/features/auth/hooks/use-has-permission'
import { PERMISSIONS } from '@/lib/permissions'
import { toDateInputValue } from '@/lib/dates'

export function ProfilePage() {
  const { data, isPending, isError, error } = useMyEmployee()
  const { data: requests } = useMyChangeRequests()
  const createMutation = useCreateChangeRequest()
  const canCreate = useHasPermission(PERMISSIONS.EMPLOYEES_CHANGE_REQUEST_CREATE)
  const [address, setAddress] = useState('')
  const [phone, setPhone] = useState('')
  const [emergencyContact, setEmergencyContact] = useState('')
  const [formError, setFormError] = useState<string | null>(null)

  if (isPending) {
    return <Loader />
  }
  if (isError) {
    return <QueryErrorState error={error} notFoundTitle="Profile unavailable" />
  }
  if (!data) {
    return <EmptyState title="Profile unavailable" />
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(null)
    const parsed = essChangeRequestSchema.safeParse({
      address: address.trim() || undefined,
      phone: phone.trim() || undefined,
      emergencyContact: emergencyContact.trim() || undefined,
    })
    if (!parsed.success) {
      setFormError('Enter at least one of address, phone, or emergency contact.')
      return
    }
    createMutation.mutate(parsed.data, {
      onSuccess: () => {
        setAddress('')
        setPhone('')
        setEmergencyContact('')
      },
    })
  }

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>HR profile</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm">
          <p>
            <span className="text-muted-foreground">Name: </span>
            {data.fullName}
          </p>
          <p>
            <span className="text-muted-foreground">Employee number: </span>
            {data.employeeNumber}
          </p>
          <p>
            <span className="text-muted-foreground">Status: </span>
            {data.status}
          </p>
          <p>
            <span className="text-muted-foreground">National ID: </span>
            {data.nationalId}
          </p>
          <p>
            <span className="text-muted-foreground">Birth date: </span>
            {toDateInputValue(data.birthDate)}
          </p>
          <p>
            <span className="text-muted-foreground">Joined: </span>
            {toDateInputValue(data.joinedAt)}
          </p>
          <p>
            <span className="text-muted-foreground">Contract: </span>
            {data.contractType}
          </p>
          <p>
            <span className="text-muted-foreground">Address: </span>
            {data.address}
          </p>
          <p>
            <span className="text-muted-foreground">Phone: </span>
            {data.phone}
          </p>
          <p>
            <span className="text-muted-foreground">Emergency contact: </span>
            {data.emergencyContact}
          </p>
        </CardContent>
      </Card>

      {canCreate ? (
        <Card>
          <CardHeader>
            <CardTitle>Request a change</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="ess-address">Address</FieldLabel>
                  <Textarea id="ess-address" value={address} onChange={(event) => setAddress(event.target.value)} />
                </Field>
                <Field>
                  <FieldLabel htmlFor="ess-phone">Phone</FieldLabel>
                  <Input id="ess-phone" value={phone} onChange={(event) => setPhone(event.target.value)} />
                </Field>
                <Field>
                  <FieldLabel htmlFor="ess-emergency">Emergency contact</FieldLabel>
                  <Input
                    id="ess-emergency"
                    value={emergencyContact}
                    onChange={(event) => setEmergencyContact(event.target.value)}
                  />
                </Field>
                {formError ? <FieldError>{formError}</FieldError> : null}
              </FieldGroup>
              <Button type="submit" disabled={createMutation.isPending}>
                Submit request
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : null}

      <div className="flex flex-col gap-3">
        <h3 className="font-heading font-medium">My requests</h3>
        {!requests || requests.length === 0 ? (
          <EmptyState title="No change requests" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead>Payload</TableHead>
                <TableHead>Review note</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map((request) => (
                <TableRow key={request.id}>
                  <TableCell>
                    <Badge variant="secondary">{request.status}</Badge>
                  </TableCell>
                  <TableCell>{JSON.stringify(request.payload)}</TableCell>
                  <TableCell>{request.reviewNote ?? '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  )
}
