import { IsIn, IsOptional } from 'class-validator';

export const SLOT_LIST_STATUSES = ['available', 'all'] as const;
export type SlotListStatus = (typeof SLOT_LIST_STATUSES)[number];

export class ListSlotsQueryDto {
  @IsOptional()
  @IsIn(SLOT_LIST_STATUSES)
  status: SlotListStatus = 'available';
}
