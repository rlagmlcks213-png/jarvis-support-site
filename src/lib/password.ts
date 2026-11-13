// 관리자·QnA·버그 신고 비밀번호 공통 (SER-002 ①③)
// 서버에서만 실행됨 — 브라우저는 비밀번호를 HTTPS로 보내기만 한다
import 'server-only';
import bcrypt from 'bcryptjs';

const COST = 10; // 숫자가 클수록 느리고 안전 (10~12 권장)

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, COST); // 결과 문자열 안에 salt가 포함됨 ("$2a$10$...")
}

export function verifyPassword(plain: string, stored: string): Promise<boolean> {
  return bcrypt.compare(plain, stored); // 다시 계산해서 비교
}
