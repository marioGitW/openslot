interface FieldErrorProps {
  /** Referenced by the field's `aria-describedby`. */
  id: string
  message?: string
}

export function FieldError({ id, message }: FieldErrorProps) {
  if (!message) return null
  return (
    <p id={id} className="text-sm text-destructive-text">
      {message}
    </p>
  )
}
