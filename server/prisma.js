import { PrismaClient } from "@prisma/client";

let prisma;

export const isPrismaConfigured = () => Boolean(process.env.DATABASE_URL);

export const getPrisma = () => {
  if (!isPrismaConfigured()) return null;
  prisma ??= new PrismaClient();
  return prisma;
};
