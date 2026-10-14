import { host } from '@/config/host'

export function HostIntro() {
  return (
    <div className="flex items-start gap-4">
      <div
        aria-hidden
        className="flex size-12 shrink-0 items-center justify-center rounded-full bg-accent text-base font-semibold text-accent-foreground"
      >
        {host.initials}
      </div>
      <div className="min-w-0 space-y-1">
        <h1 className="text-2xl leading-tight font-semibold tracking-tight">
          {host.name}
        </h1>
        <p className="text-sm text-muted-foreground">{host.role}</p>
        <p className="pt-1 text-pretty">{host.intro}</p>
      </div>
    </div>
  )
}
