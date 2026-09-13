import { type FormEvent, useState } from 'react'
import { EmptyState } from '@/components/common/empty-state'
import { Loader } from '@/components/common/loader'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
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
  useCreatePermission,
  useCreateRole,
  useDeleteRole,
  usePermissionsCatalog,
  useRoles,
  useSetRolePermissions,
  useUpdateRole,
} from '@/features/roles/hooks/use-roles'
import { permissionFormSchema, roleFormSchema } from '@/features/roles/schema'
import type { Role } from '@/features/roles/types'
import { useHasPermission } from '@/features/auth/hooks/use-has-permission'
import { PERMISSIONS } from '@/lib/permissions'

export function RolesPage() {
  const { data: roles, isPending } = useRoles()
  const { data: permissions } = usePermissionsCatalog()
  const canWrite = useHasPermission(PERMISSIONS.AUTH_ROLES_WRITE)
  const canWritePermissions = useHasPermission(PERMISSIONS.AUTH_PERMISSIONS_WRITE)
  const createRole = useCreateRole()
  const updateRole = useUpdateRole()
  const deleteRole = useDeleteRole()
  const setPermissions = useSetRolePermissions()
  const createPermission = useCreatePermission()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [permissionKey, setPermissionKey] = useState('')
  const [permissionDescription, setPermissionDescription] = useState('')
  const [selected, setSelected] = useState<Role | null>(null)
  const [checkedIds, setCheckedIds] = useState<readonly string[]>([])

  function selectRole(role: Role) {
    setSelected(role)
    setName(role.name)
    setDescription(role.description ?? '')
    setCheckedIds((permissions ?? []).filter((item) => role.permissionKeys.includes(item.key)).map((item) => item.id))
  }

  function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const parsed = roleFormSchema.safeParse({ name, description: description || undefined })
    if (!parsed.success) {
      return
    }
    createRole.mutate(parsed.data, {
      onSuccess: () => {
        setName('')
        setDescription('')
      },
    })
  }

  if (isPending) {
    return <Loader />
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="flex flex-col gap-4">
        {canWrite ? (
          <form onSubmit={handleCreate} className="flex flex-col gap-3">
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="role-name">Role name</FieldLabel>
                <Input id="role-name" value={name} onChange={(event) => setName(event.target.value)} />
              </Field>
              <Field>
                <FieldLabel htmlFor="role-description">Description</FieldLabel>
                <Textarea
                  id="role-description"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                />
              </Field>
            </FieldGroup>
            <Button type="submit" disabled={createRole.isPending}>
              Create role
            </Button>
          </form>
        ) : null}
        {!roles || roles.length === 0 ? (
          <EmptyState title="No roles" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Permissions</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {roles.map((role) => (
                <TableRow key={role.id}>
                  <TableCell>{role.name}</TableCell>
                  <TableCell>{role.permissionKeys.length}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button type="button" size="sm" variant="outline" onClick={() => selectRole(role)}>
                        Edit
                      </Button>
                      {canWrite ? (
                        <Button type="button" size="sm" variant="destructive" onClick={() => deleteRole.mutate(role.id)}>
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
      <div className="flex flex-col gap-4">
        {selected ? (
          <>
            <h3 className="font-heading font-medium">Edit {selected.name}</h3>
            {canWrite ? (
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  updateRole.mutate({
                    id: selected.id,
                    input: { name, description: description || undefined },
                  })
                }
              >
                Save name
              </Button>
            ) : null}
            <div className="flex max-h-80 flex-col gap-2 overflow-y-auto rounded-lg border p-3">
              {(permissions ?? []).map((permission) => {
                const checked = checkedIds.includes(permission.id)
                return (
                  <label key={permission.id} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={checked}
                      disabled={!canWrite}
                      onCheckedChange={(value) => {
                        setCheckedIds((current) =>
                          value
                            ? [...current, permission.id]
                            : current.filter((id) => id !== permission.id),
                        )
                      }}
                    />
                    <span>{permission.key}</span>
                  </label>
                )
              })}
            </div>
            {canWrite ? (
              <Button
                type="button"
                onClick={() => setPermissions.mutate({ id: selected.id, permissionIds: checkedIds })}
              >
                Save permissions
              </Button>
            ) : null}
          </>
        ) : (
          <EmptyState title="Select a role" description="Choose a role to assign permission keys." />
        )}
        {canWritePermissions ? (
          <form
            className="flex flex-col gap-3 border-t pt-4"
            onSubmit={(event) => {
              event.preventDefault()
              const parsed = permissionFormSchema.safeParse({
                key: permissionKey,
                description: permissionDescription || undefined,
              })
              if (!parsed.success) {
                return
              }
              createPermission.mutate(parsed.data, {
                onSuccess: () => {
                  setPermissionKey('')
                  setPermissionDescription('')
                },
              })
            }}
          >
            <Field>
              <FieldLabel htmlFor="perm-key">New permission key</FieldLabel>
              <Input id="perm-key" value={permissionKey} onChange={(event) => setPermissionKey(event.target.value)} />
            </Field>
            <Field>
              <FieldLabel htmlFor="perm-desc">Description</FieldLabel>
              <Input
                id="perm-desc"
                value={permissionDescription}
                onChange={(event) => setPermissionDescription(event.target.value)}
              />
            </Field>
            <Button type="submit" variant="outline" disabled={createPermission.isPending}>
              Create permission
            </Button>
          </form>
        ) : null}
      </div>
    </div>
  )
}
