import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppLayout } from '@/app/layouts/app-layout'
import { AuthLayout } from '@/app/layouts/auth-layout'
import { PublicLayout } from '@/app/layouts/public-layout'
import { GuestOnly } from '@/features/auth/components/guest-only'
import { RequireAuth } from '@/features/auth/components/require-auth'
import { RequirePermission } from '@/features/auth/components/require-permission'
import { LoginPage } from '@/features/auth/pages/login-page'
import { DashboardPage } from '@/features/dashboard/pages/dashboard-page'
import { ProfilePage } from '@/features/profile/pages/profile-page'
import { CareersPage } from '@/features/recruitment/pages/careers-page'
import { EmployeesPage } from '@/features/employees/pages/employees-page'
import { EmployeeCreatePage } from '@/features/employees/pages/employee-create-page'
import { EmployeeDetailPage } from '@/features/employees/pages/employee-detail-page'
import { ChangeRequestsPage } from '@/features/employees/pages/change-requests-page'
import { DepartmentsPage } from '@/features/organization/pages/departments-page'
import { PositionsPage } from '@/features/organization/pages/positions-page'
import { OrgTreePage } from '@/features/organization/pages/org-tree-page'
import { RolesPage } from '@/features/roles/pages/roles-page'
import { PERMISSIONS } from '@/lib/permissions'

export const router = createBrowserRouter([
  {
    element: <GuestOnly />,
    children: [
      {
        element: <AuthLayout />,
        children: [{ path: '/login', element: <LoginPage /> }],
      },
    ],
  },
  {
    element: <PublicLayout />,
    children: [{ path: '/careers', element: <CareersPage /> }],
  },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: '/', element: <DashboardPage /> },
          { path: '/me', element: <ProfilePage /> },
          {
            path: '/employees',
            children: [
              {
                element: <RequirePermission permission={PERMISSIONS.EMPLOYEES_READ} />,
                children: [{ index: true, element: <EmployeesPage /> }],
              },
              {
                element: <RequirePermission permission={PERMISSIONS.EMPLOYEES_WRITE} />,
                children: [{ path: 'new', element: <EmployeeCreatePage /> }],
              },
              {
                element: <RequirePermission permission={PERMISSIONS.EMPLOYEES_CHANGE_REQUEST_REVIEW} />,
                children: [{ path: 'change-requests', element: <ChangeRequestsPage /> }],
              },
              {
                element: <RequirePermission permission={PERMISSIONS.EMPLOYEES_READ} />,
                children: [{ path: ':id', element: <EmployeeDetailPage /> }],
              },
            ],
          },
          {
            element: <RequirePermission permission={PERMISSIONS.ORG_READ} />,
            children: [
              { path: '/org/departments', element: <DepartmentsPage /> },
              { path: '/org/positions', element: <PositionsPage /> },
              { path: '/org/tree', element: <OrgTreePage /> },
            ],
          },
          {
            element: <RequirePermission permission={PERMISSIONS.AUTH_ROLES_READ} />,
            children: [{ path: '/admin/roles', element: <RolesPage /> }],
          },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
])
