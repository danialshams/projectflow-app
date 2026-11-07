import { PrismaClient } from "@prisma/client";
const globalPrisma = globalThis as unknown as { prisma?: PrismaClient };
export const db = globalPrisma.prisma ?? new PrismaClient({ log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"] });
if (process.env.NODE_ENV !== "production") globalPrisma.prisma = db;
