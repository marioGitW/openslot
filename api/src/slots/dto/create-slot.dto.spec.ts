import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { DURATION_MESSAGE } from '../slot-duration.js';
import { CreateSlotDto } from './create-slot.dto.js';

async function durationErrors(durationMin: unknown): Promise<string[]> {
  const dto = plainToInstance(CreateSlotDto, {
    topic: 'Code review',
    startsAt: '2030-01-01T10:00:00Z',
    durationMin,
  });
  const errors = await validate(dto);
  return errors
    .filter((error) => error.property === 'durationMin')
    .flatMap((error) => Object.values(error.constraints ?? {}));
}

describe('CreateSlotDto durationMin', () => {
  it.each([5, 15, 125, 240])('accepts %p minutes', async (durationMin) => {
    expect(await durationErrors(durationMin)).toEqual([]);
  });

  it.each([0, 3, 7, 245, 2.5, -5, '30', null])(
    'rejects %p with one clear message',
    async (durationMin) => {
      expect(await durationErrors(durationMin)).toEqual([DURATION_MESSAGE]);
    },
  );
});
