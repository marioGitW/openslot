import { Loader2, RotateCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ErrorStateProps {
  message: string
  onRetry: () => void
  retrying?: boolean
}

export function ErrorState({ message, onRetry, retrying = false }: ErrorStateProps) {
  return (
    <div
      role="alert"
      className="flex flex-col items-start gap-3 rounded-lg border border-dashed p-6"
    >
      <p className="font-medium">{message}</p>
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
