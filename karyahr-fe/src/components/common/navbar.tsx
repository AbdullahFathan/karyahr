import { SearchIcon } from 'lucide-react'
import { useLogout } from '@/features/auth/hooks/use-logout'
import { useAuth } from '@/features/auth/hooks/use-auth'
import { displayName } from '@/lib/auth'
import { NotificationBell } from '@/features/notifications/components/notification-bell'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'

type NavbarProps = {
  readonly title: string
}

export function Navbar({ title }: NavbarProps) {
  const { data } = useAuth()
  const logoutMutation = useLogout()
  const initials = data
    ? displayName(data)
        .split(' ')
        .slice(0, 2)
        .map((part) => part[0])
        .join('')
        .toUpperCase()
    : 'KH'

  return (
    <header className="flex h-16 items-center justify-between gap-4 border-b bg-card px-6">
      <h1 className="font-heading text-lg font-semibold">{title}</h1>
      <div className="flex items-center gap-3">
        <div className="relative hidden w-64 md:block">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            readOnly
            tabIndex={-1}
            placeholder="Search"
            aria-label="Search (visual only)"
            className="pointer-events-none bg-muted pl-8"
          />
        </div>
        <NotificationBell />
        <DropdownMenu>
          <DropdownMenuTrigger aria-label="Account menu" className="rounded-full outline-none">
            <Avatar>
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuGroup>
              <DropdownMenuItem
                variant="destructive"
                onClick={() => {
                  logoutMutation.mutate()
                }}
              >
                Log out
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
