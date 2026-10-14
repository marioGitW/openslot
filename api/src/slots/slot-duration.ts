/** Slot length limits, shared by the DTO and the overlap query. */
export const MIN_DURATION_MIN = 5;
export const MAX_DURATION_MIN = 240;
export const DURATION_STEP_MIN = 5;

export const DURATION_MESSAGE = 'Duration must be 5–240 minutes in steps of 5.';

export function isValidDuration(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= MIN_DURATION_MIN &&
    value <= MAX_DURATION_MIN &&
    value % DURATION_STEP_MIN === 0
  );
}
