import { useNavigate } from 'react-router-dom'
import { Loader } from '@/components/common/loader'
import { EmployeeForm } from '@/features/employees/components/employee-form'
import { useCreateEmployee, useEmployees } from '@/features/employees/hooks/use-employees'
import { useDepartments, usePositions } from '@/features/organization/hooks/use-organization'

export function EmployeeCreatePage() {
  const navigate = useNavigate()
  const createMutation = useCreateEmployee()
  const { data: departments, isPending: departmentsPending } = useDepartments()
  const { data: positions, isPending: positionsPending } = usePositions()
  const { data: employees } = useEmployees({ page: 1, pageSize: 100 })

  if (departmentsPending || positionsPending) {
    return <Loader />
  }

  return (
    <EmployeeForm
      departments={departments ?? []}
      positions={positions ?? []}
      managers={employees?.data ?? []}
      submitting={createMutation.isPending}
      submitLabel="Create employee"
      onSubmit={(input) => {
        createMutation.mutate(input, {
          onSuccess: (employee) => {
            void navigate(`/employees/${employee.id}`)
          },
        })
      }}
    />
  )
}
