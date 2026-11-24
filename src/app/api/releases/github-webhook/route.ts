import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { GITHUB_REPO } from "@/lib/constants";
import { githubWebhookSecret } from "@/server/env";
import { hideDeletedGithubRelease, registerWithAssetRetry, updateNoteFromGithubRelease } from "@/server/github-release";

// POST /api/releases/github-webhook — 앱 저장소(GITHUB_REPO)의 GitHub webhook(Releases 이벤트) 수신.
// 인증: X-Hub-Signature-256 = "sha256=" + HMAC-SHA256(본문 원문, GITHUB_WEBHOOK_SECRET)
// published → 릴리스 자동 등록(source=GITHUB) · deleted → 숨김 · edited → 노트 갱신
// ⚠ 응답·로그에 비밀값이나 서명을 넣지 말 것
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function validSignature(raw: string, header: string | null, secret: string): boolean {
  if (!header?.startsWith("sha256=")) return false;
  const expected = Buffer.from(`sha256=${createHmac("sha256", secret).update(raw, "utf8").digest("hex")}`);
  const actual = Buffer.from(header);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

const json = (body: Record<string, unknown>, status: number) => NextResponse.json(body, { status });
const rec = (v: unknown): Record<string, unknown> => (v && typeof v === "object" ? (v as Record<string, unknown>) : {});

export async function POST(request: Request) {
  const secret = githubWebhookSecret();
  if (!secret) {
    console.error("[github-webhook] GITHUB_WEBHOOK_SECRET이 설정되지 않았어요.");
    return json({ error: "서버에 webhook 비밀 키가 설정되지 않았어요." }, 500);
  }

  // 서명은 본문 원문 그대로 검증해야 하므로 text()로 읽은 뒤에 JSON으로 바꾼다
  const raw = await request.text();
  if (!validSignature(raw, request.headers.get("x-hub-signature-256"), secret)) {
    return json({ error: "서명이 없거나 올바르지 않아요." }, 401);
  }

  let payload: Record<string, unknown>;
  try {
    payload = rec(JSON.parse(raw));
  } catch {
    return json({ error: "요청 본문이 올바른 JSON이 아니에요." }, 400);
  }

  const event = request.headers.get("x-github-event");
  if (event === "ping") return json({ ok: true, message: "pong" }, 200);
  if (event !== "release") return json({ ok: true, message: `${event ?? "알 수 없는"} 이벤트는 처리하지 않아요.` }, 202);

  const repo = String(rec(payload.repository).full_name ?? "");
  if (repo.toLowerCase() !== GITHUB_REPO.toLowerCase()) {
    console.warn(`[github-webhook] 다른 저장소의 이벤트라 무시했어요: ${repo || "(없음)"} (설정: ${GITHUB_REPO})`);
    return json({ ok: true, message: "설정된 앱 저장소(GITHUB_REPO)의 이벤트가 아니라 무시했어요." }, 202);
  }

  const action = String(payload.action ?? "");
  const release = payload.release;
  try {
    if (action === "published") {
      const r = await registerWithAssetRetry(release);
      switch (r.status) {
        case "created":
          console.log(`[github-webhook] v${r.release.version} 자동 등록`);
          return json({ ok: true, status: r.status, release: r.release, message: "릴리스를 등록했어요." }, 201);
        case "duplicate":
          return json({ ok: true, status: r.status, message: r.reason }, 200);
        case "skipped":
        case "no_asset":
          return json({ ok: true, status: r.status, message: r.reason }, 202);
        case "invalid":
          console.warn(`[github-webhook] ${r.version || "(태그 없음)"} 등록 실패: ${r.reason}`);
          return json({ ok: false, status: r.status, error: r.reason, errors: r.errors }, 422);
      }
    }
    if (action === "deleted") {
      const hidden = await hideDeletedGithubRelease(release);
      return hidden
        ? json({ ok: true, message: "GitHub에서 삭제된 릴리스를 사이트에서 숨겼어요." }, 200)
        : json({ ok: true, message: "숨길 GitHub 자동 등록 릴리스가 없어요." }, 202);
    }
    if (action === "edited") {
      const updated = await updateNoteFromGithubRelease(release);
      return updated ? json({ ok: true, message: "릴리스 노트를 갱신했어요." }, 200) : json({ ok: true, message: "갱신할 릴리스가 없어요." }, 202);
    }
    return json({ ok: true, message: `release.${action} 동작은 처리하지 않아요.` }, 202);
  } catch (e) {
    console.error("[github-webhook] 처리 중 오류:", e instanceof Error ? e.message : e);
    return json({ error: "서버에서 문제가 생겼어요." }, 500);
  }
}
