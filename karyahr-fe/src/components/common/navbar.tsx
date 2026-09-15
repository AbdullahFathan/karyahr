import { MenuIcon } from 'lucide-react'
import { useLogout } from '@/features/auth/hooks/use-logout'
import { useAuth } from '@/features/auth/hooks/use-auth'
import { displayName } from '@/lib/auth'
import { NotificationBell } from '@/features/notifications/components/notification-bell'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

type NavbarProps = {
  readonly title: string
  readonly onOpenNav?: () => void
}

export function Navbar({ title, onOpenNav }: NavbarProps) {
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
    <header className="flex h-16 w-full shrink-0 items-center justify-between gap-4 border-b bg-card px-4 md:px-6">
      <div className="flex min-w-0 items-center gap-2">
        {onOpenNav ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="md:hidden"
            aria-label="Open navigation"
            onClick={onOpenNav}
          >
            <MenuIcon />
          </Button>
        ) : null}
        <h1 className="truncate font-heading text-lg font-semibold">{title}</h1>
      </div>
      <div className="flex items-center gap-3">
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
