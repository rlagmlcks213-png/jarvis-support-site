// 초기 데이터: 관리자 1명만 (FAQ·글은 관리자/사용자가 사이트에서 직접 작성)
// 실행: npx prisma db seed
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const db = new PrismaClient();

async function main() {
  const loginId = process.env.ADMIN_INITIAL_LOGIN_ID ?? 'admin';
  const password = process.env.ADMIN_INITIAL_PASSWORD;
  if (!password || password.startsWith('change-me')) {
    throw new Error('.env의 ADMIN_INITIAL_PASSWORD를 먼저 바꿔 주세요.');
  }
  // 로컬 DB가 아니면(배포용 DB) 약한 비밀번호(admin 등)로 관리자를 만들지 않음
  const isLocalDb = /@(localhost|127\.0\.0\.1)[:/]/.test(process.env.DATABASE_URL ?? '');
  if (!isLocalDb && password.length < 12) {
    throw new Error('배포 DB에는 12자 이상 관리자 비밀번호가 필요해요. (.env의 ADMIN_INITIAL_PASSWORD)');
  }

  await db.admin.upsert({
    where: { loginId },
    update: {},
    create: { loginId, name: '개발팀', passwordHash: await bcrypt.hash(password, 10) },
  });

  console.log('seed 완료');
}

main().finally(() => db.$disconnect());
