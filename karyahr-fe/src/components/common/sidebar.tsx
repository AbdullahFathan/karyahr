import { NavLink } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { APP_NAME, NAV_GROUPS } from '@/lib/constants'
import { Separator } from '@/components/ui/separator'

export function Sidebar() {
  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar">
      <div className="flex h-16 items-center px-5">
        <span className="font-heading text-lg font-semibold text-primary">{APP_NAME}</span>
      </div>
      <Separator />
      <nav className="flex flex-1 flex-col gap-5 overflow-y-auto p-4">
        {NAV_GROUPS.map((group) => (
          <div key={group.label} className="flex flex-col gap-1">
            <p className="px-3 text-xs font-medium tracking-wide text-muted-foreground uppercase">
              {group.label}
            </p>
            <div className="flex flex-col gap-0.5">
              {group.items.map((item) =>
                item.enabled && item.to ? (
                  <NavLink
                    key={item.label}
                    to={item.to}
                    end={item.to === '/'}
                    className={({ isActive }) =>
                      cn(
                        'rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                        isActive
                          ? 'border-l-2 border-primary bg-primary/10 text-primary'
                          : 'text-sidebar-foreground hover:bg-muted',
                      )
                    }
                  >
                    {item.label}
                  </NavLink>
                ) : (
                  <span
                    key={item.label}
                    className="pointer-events-none rounded-lg px-3 py-2 text-sm text-muted-foreground opacity-60"
                  >
                    {item.label}
                  </span>
                ),
              )}
            </div>
          </div>
        ))}
      </nav>
      <Separator />
      <div className="flex flex-col gap-0.5 px-5 py-4">
        <p className="text-sm font-medium">Signed in</p>
        <p className="text-xs text-muted-foreground">Name and role load in Phase 1</p>
      </div>
    </aside>
  )
}
