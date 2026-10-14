import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    // Runtime uses the pooled connection; migrations use DIRECT_URL via prisma.config.ts.
    // Every serverless instance opens its own pool, so keep it small and let idle
    // connections go quickly; otherwise a burst of instances can use up the
    // Supabase pooler's client limit.
    super({
      adapter: new PrismaPg({
        connectionString: process.env.DATABASE_URL,
        max: 3,
        idleTimeoutMillis: 10_000,
      }),
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
