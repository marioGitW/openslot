import { Loader2, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { useDeleteSlot } from '@/hooks/useDeleteSlot'
import { errorMessage } from '@/lib/api'
import { dayKeyOf, formatDayShort, formatTimeRange } from '@/lib/time'
import type { Slot } from '@/lib/types'

export function DeleteSlotButton({ slot }: { slot: Slot }) {
  const [open, setOpen] = useState(false)
  const deleteSlot = useDeleteSlot()
  const when = `${formatDayShort(dayKeyOf(slot.startsAt))}, ${formatTimeRange(slot)}`

  function confirm() {
    deleteSlot.mutate(slot.id, {
      onSuccess: () => {
        setOpen(false)
        toast.success('Slot deleted')
      },
      onError: (error) => {
        setOpen(false)
        toast.error(errorMessage(error))
      },
    })
  }

  return (
    <AlertDialog open={open} onOpenChange={(next) => !deleteSlot.isPending && setOpen(next)}>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Delete slot ${when}`}
          className="text-muted-foreground hover:text-destructive-text"
        >
          <Trash2 aria-hidden />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this slot?</AlertDialogTitle>
          <AlertDialogDescription>
            {when} · {slot.topic}. It will no longer be bookable.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleteSlot.isPending}>Cancel</AlertDialogCancel>
          {/* A plain button so the dialog stays open while the request runs. */}
          <Button
            className="bg-destructive-solid text-destructive-foreground hover:bg-destructive-solid/90"
            onClick={confirm}
            disabled={deleteSlot.isPending}
            aria-busy={deleteSlot.isPending}
          >
            {deleteSlot.isPending && <Loader2 className="motion-safe:animate-spin" aria-hidden />}
            Delete slot
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
