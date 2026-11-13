// Prisma 클라이언트 1개만 쓰기 (개발 중 핫리로드 때 연결이 계속 늘어나는 것 방지)
// ⚠ 서버 코드(API 라우트, 서버 컴포넌트)에서만 import 할 것
import 'server-only';
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;
