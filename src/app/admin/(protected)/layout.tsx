import { redirect } from "next/navigation";
import { getAdminSession } from "@/server/auth";
import AdminShell from "./AdminShell";

// 관리자 전용 영역 — 서버에서 서명 쿠키 세션을 확인한다.
// 권한 확인: middleware(1차) → 이 레이아웃(2차) → 각 Server Action의 requireAdmin()(3차)
export const dynamic = "force-dynamic";

export default async function ProtectedAdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getAdminSession();
  if (!session) redirect("/admin");
  return <AdminShell session={{ name: session.name }}>{children}</AdminShell>;
}
