import { Loader2, RotateCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ErrorStateProps {
  message: string
  /** Why it failed, e.g. the API's message or "Couldn't reach the server". */
  detail?: string
  onRetry: () => void
  retrying?: boolean
}

export function ErrorState({ message, detail, onRetry, retrying = false }: ErrorStateProps) {
  return (
    <div
      role="alert"
      className="flex flex-col items-start gap-3 rounded-lg border border-dashed p-6"
    >
      <div className="space-y-1">
        <p className="font-medium">{message}</p>
        {detail && <p className="text-sm text-muted-foreground">{detail}</p>}
      </div>
      <Button variant="outline" onClick={onRetry} disabled={retrying}>
        {retrying ? (
          <Loader2 className="motion-safe:animate-spin" aria-hidden />
        ) : (
          <RotateCw aria-hidden />
        )}
        Retry
      </Button>
    </div>
  )
}
