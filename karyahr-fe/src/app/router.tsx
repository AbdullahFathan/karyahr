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
import {
  AttendanceDashboardPage,
  AttendanceSummaryPage,
  MyAttendancePage,
  PunchPage,
  ShiftAssignmentsPage,
  ShiftsPage,
} from '@/features/attendance'
import {
  LeaveInboxPage,
  LeavePoliciesPage,
  LeaveTypesPage,
  MyLeavePage,
  NewLeaveRequestPage,
} from '@/features/leave'
import { NotificationsPage } from '@/features/notifications'
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
            element: <RequirePermission permission={PERMISSIONS.ATTENDANCE_ME_PUNCH} />,
            children: [{ path: '/attendance', element: <PunchPage /> }],
          },
          {
            element: <RequirePermission permission={PERMISSIONS.ATTENDANCE_ME_READ} />,
            children: [
              { path: '/attendance/me', element: <MyAttendancePage /> },
              { path: '/attendance/summary', element: <AttendanceSummaryPage /> },
            ],
          },
          {
            element: <RequirePermission permission={PERMISSIONS.ATTENDANCE_DASHBOARD} />,
            children: [{ path: '/attendance/dashboard', element: <AttendanceDashboardPage /> }],
          },
          {
            element: <RequirePermission permission={PERMISSIONS.ATTENDANCE_READ} />,
            children: [
              { path: '/attendance/shifts', element: <ShiftsPage /> },
              { path: '/attendance/shifts/:id/assignments', element: <ShiftAssignmentsPage /> },
            ],
          },
          {
            element: <RequirePermission permission={PERMISSIONS.LEAVE_TYPES_WRITE} />,
            children: [{ path: '/leave/types', element: <LeaveTypesPage /> }],
          },
          {
            element: <RequirePermission permission={PERMISSIONS.LEAVE_POLICIES_WRITE} />,
            children: [{ path: '/leave/policies', element: <LeavePoliciesPage /> }],
          },
          {
            element: <RequirePermission permission={PERMISSIONS.LEAVE_REQUESTS_ME} />,
            children: [{ path: '/leave', element: <MyLeavePage /> }],
          },
          {
            element: <RequirePermission permission={PERMISSIONS.LEAVE_REQUESTS_CREATE} />,
            children: [{ path: '/leave/new', element: <NewLeaveRequestPage /> }],
          },
          {
            element: <RequirePermission permission={PERMISSIONS.LEAVE_REQUESTS_APPROVE} />,
            children: [{ path: '/leave/inbox', element: <LeaveInboxPage /> }],
          },
          {
            element: <RequirePermission permission={PERMISSIONS.NOTIFICATIONS_ME} />,
            children: [{ path: '/notifications', element: <NotificationsPage /> }],
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
