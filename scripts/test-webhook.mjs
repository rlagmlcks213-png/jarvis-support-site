// GitHub 릴리스 webhook 로컬 시험 (POST /api/releases/github-webhook)
// 실행: 로컬 DB + npm run dev를 띄운 뒤
//   node scripts/test-webhook.mjs
// 필요한 환경변수: GITHUB_WEBHOOK_SECRET, GITHUB_REPO (dev 서버와 같은 값). SITE_URL(기본 http://localhost:3000)
// ⚠ 로컬 DB에서만 실행할 것. 운영 주소로 보내지 말 것. 시험 후 만든 릴리스(v9.9.x)는 관리자 화면이나 DB에서 지운다.
import { createHmac, randomBytes } from "node:crypto";

const base = (process.env.SITE_URL || "http://localhost:3000").replace(/\/+$/, "");
const secret = process.env.GITHUB_WEBHOOK_SECRET;
const repo = process.env.GITHUB_REPO;
if (!secret || !repo) {
  console.error("GITHUB_WEBHOOK_SECRET, GITHUB_REPO 환경변수를 dev 서버와 같은 값으로 지정해 주세요.");
  process.exit(1);
}
if (!/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(base)) {
  console.error(`로컬 주소에서만 실행해요: ${base}`);
  process.exit(1);
}

const version = `9.9.${Math.floor(Math.random() * 900) + 100}`;
const prefix = `https://github.com/${repo}/releases/`;
const release = (over = {}) => ({
  id: 1,
  tag_name: `v${version}`,
  draft: false,
  prerelease: false,
  published_at: new Date().toISOString(),
  html_url: `${prefix}tag/v${version}`,
  body: `v${version} 시험 릴리스\n- webhook 자동 등록 확인`,
  assets: [
    { name: "latest.yml", state: "uploaded", size: 400, browser_download_url: `${prefix}download/v${version}/latest.yml`, digest: null },
    {
      name: `HeyJarvis-Setup-${version}.exe`,
      state: "uploaded",
      size: 87_000_000,
      browser_download_url: `${prefix}download/v${version}/HeyJarvis-Setup-${version}.exe`,
      digest: `sha256:${randomBytes(32).toString("hex")}`,
    },
  ],
  ...over,
});

async function send(event, payload, { badSignature = false } = {}) {
  const raw = JSON.stringify(payload);
  const sig = `sha256=${createHmac("sha256", badSignature ? "wrong-secret" : secret).update(raw).digest("hex")}`;
  const res = await fetch(`${base}/api/releases/github-webhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-GitHub-Event": event, "X-Hub-Signature-256": sig },
    body: raw,
  });
  return { status: res.status, body: await res.json().catch(() => ({})) };
}

const published = (r) => ({ action: "published", repository: { full_name: repo }, release: r });
const cases = [
  ["ping", () => send("ping", { zen: "test", repository: { full_name: repo } }), 200],
  ["서명 틀림", () => send("release", published(release()), { badSignature: true }), 401],
  ["published (새 버전)", () => send("release", published(release())), 201],
  ["published (같은 버전 다시)", () => send("release", published(release())), 200],
  ["prerelease", () => send("release", published(release({ tag_name: "v9.8.0", prerelease: true }))), 202],
  ["다른 저장소", () => send("release", { ...published(release()), repository: { full_name: "someone/else" } }), 202],
  ["edited (노트 갱신)", () => send("release", { action: "edited", repository: { full_name: repo }, release: release({ body: "고친 노트" }) }), 200],
  ["deleted (숨김)", () => send("release", { action: "deleted", repository: { full_name: repo }, release: release() }), 200],
];

let failed = 0;
for (const [name, run, expected] of cases) {
  const { status, body } = await run();
  const ok = status === expected;
  if (!ok) failed++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}: ${status} (기대 ${expected}) ${body.message ?? body.error ?? ""}`);
}
console.log(`\n시험 버전: v${version} — 끝나면 이 릴리스를 지워 주세요.`);
process.exit(failed ? 1 : 0);
