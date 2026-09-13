import { BellIcon, SearchIcon } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type NavbarProps = {
  readonly title: string
}

export function Navbar({ title }: NavbarProps) {
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
        <Button type="button" variant="ghost" size="icon" disabled aria-label="Notifications">
          <BellIcon />
        </Button>
        <Avatar>
          <AvatarFallback>KH</AvatarFallback>
        </Avatar>
      </div>
    </header>
  )
}
