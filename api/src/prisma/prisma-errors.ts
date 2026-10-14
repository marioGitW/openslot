import { Prisma } from '../generated/prisma/client.js';

// P2002 = unique constraint violation, P2003 = foreign key constraint violation.
export function isPrismaError(
  error: unknown,
  code: 'P2002' | 'P2003',
): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError && error.code === code
  );
}
