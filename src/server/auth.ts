import "server-only";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/password";
import { signToken, verifyToken } from "@/lib/signed-token";
import { ADMIN_SESSION_COOKIE, ADMIN_SESSION_HOURS, LOGIN_LOCK_MINUTES, LOGIN_MAX_FAILS } from "@/lib/constants";
import { RepoError } from "@/lib/repository/errors";
import { isProduction, sessionSecret } from "./env";

// 관리자 세션 — SESSION_SECRET으로 서명한 HttpOnly 쿠키 (SFR-006 ③, SER-002 ①)
// 쿠키 값: 서명 토큰 { adminId, name, exp }. 브라우저 JS에서는 읽을 수 없다.

export interface AdminSession {
  adminId: number;
  name: string;
}

type SessionPayload = AdminSession & { exp: number };

export async function getAdminSession(): Promise<AdminSession | null> {
  const token = (await cookies()).get(ADMIN_SESSION_COOKIE)?.value;
  const p = await verifyToken<SessionPayload>(token, sessionSecret());
  return p ? { adminId: p.adminId, name: p.name } : null;
}

export async function isAdmin(): Promise<boolean> {
  return (await getAdminSession()) !== null;
}

/** 관리자 전용 기능의 서버 측 권한 확인. 계정이 삭제됐으면 세션도 무효. */
export async function requireAdmin(): Promise<AdminSession> {
  const s = await getAdminSession();
  if (!s) throw new RepoError("관리자 로그인이 필요해요. 다시 로그인해 주세요.", "UNAUTHORIZED");
  const exists = await db.admin.findUnique({ where: { id: s.adminId }, select: { id: true } });
  if (!exists) {
    await clearAdminSession();
    throw new RepoError("관리자 계정을 확인할 수 없어요. 다시 로그인해 주세요.", "UNAUTHORIZED");
  }
  return s;
}

async function setAdminSession(s: AdminSession) {
  const exp = Date.now() + ADMIN_SESSION_HOURS * 3600_000;
  (await cookies()).set(ADMIN_SESSION_COOKIE, await signToken({ ...s, exp }, sessionSecret()), {
    httpOnly: true,
    secure: isProduction(), // localhost(http) 개발 편의. 운영은 항상 Secure
    sameSite: "lax",
    path: "/",
    maxAge: ADMIN_SESSION_HOURS * 3600,
  });
}

export async function clearAdminSession() {
  (await cookies()).delete({ name: ADMIN_SESSION_COOKIE, path: "/" });
}

// 존재하지 않는 아이디일 때도 bcrypt 비교 시간을 들여, 응답 시간으로 아이디 존재 여부를 알 수 없게 함
let dummyHash: Promise<string> | null = null;

/** 로그인 — 계정 기준 연속 실패 5회 시 5분 잠금 (admin.failed_count / locked_until) */
export async function loginAdmin(loginId: string, password: string): Promise<AdminSession> {
  const admin = await db.admin.findUnique({ where: { loginId: loginId.trim() } });
  if (!admin) {
    dummyHash ??= hashPassword("dummy-password-for-timing");
    await verifyPassword(password, await dummyHash);
    throw new RepoError("아이디 또는 비밀번호가 일치하지 않아요. 다시 입력해 주세요.", "WRONG_PASSWORD");
  }

  if (admin.lockedUntil && admin.lockedUntil > new Date()) {
    throw new RepoError("로그인 실패가 반복되어 잠시 제한됐어요.", "LOCKED", { lockedUntil: admin.lockedUntil.toISOString() });
  }

  if (!(await verifyPassword(password, admin.passwordHash))) {
    const fails = admin.failedCount + 1;
    if (fails >= LOGIN_MAX_FAILS) {
      const lockedUntil = new Date(Date.now() + LOGIN_LOCK_MINUTES * 60_000);
      await db.admin.update({ where: { id: admin.id }, data: { failedCount: 0, lockedUntil } });
      throw new RepoError("로그인 실패가 반복되어 잠시 제한됐어요.", "LOCKED", { lockedUntil: lockedUntil.toISOString() });
    }
    await db.admin.update({ where: { id: admin.id }, data: { failedCount: fails } });
    throw new RepoError(
      `아이디 또는 비밀번호가 일치하지 않아요. 다시 입력해 주세요. (남은 시도 ${LOGIN_MAX_FAILS - fails}회)`,
      "WRONG_PASSWORD",
    );
  }

  await db.admin.update({ where: { id: admin.id }, data: { failedCount: 0, lockedUntil: null } });
  const session = { adminId: admin.id, name: admin.name };
  await setAdminSession(session);
  return session;
}
