-- Block Supabase's anon/authenticated roles; Prisma connects as the table owner and is unaffected.
ALTER TABLE "Slot" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Booking" ENABLE ROW LEVEL SECURITY;
