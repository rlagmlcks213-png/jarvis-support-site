// Docker 없이 쓰는 로컬 PostgreSQL (개발용)
// 실행: npm run db:local  → 이 창을 켜 둔 채로 다른 터미널에서 npm run dev
// 끄기: 이 창에서 Ctrl+C
//
// Postgres는 프로그램·데이터 경로에 한글(예: "바탕 화면")이 있으면 실행이 안 돼서,
// 처음 한 번 프로그램을 %LOCALAPPDATA%\jarvis-localdb 로 복사하고 데이터도 거기에 저장해요.
// 데이터까지 지우려면 그 폴더를 삭제하면 돼요.
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const PORT = "54329";
const USER = "jarvis";
const PASSWORD = "jarvis_local_pw";
const DB = "jarvis";

const root = path.join(process.env.LOCALAPPDATA || os.homedir(), "jarvis-localdb");
const pgsql = path.join(root, "pgsql");
const data = path.join(root, "data");
const bin = (name) => path.join(pgsql, "bin", name + (process.platform === "win32" ? ".exe" : ""));

// 1) 프로그램 복사 (처음 한 번)
if (!fs.existsSync(bin("postgres"))) {
  const pkg = path.resolve("node_modules/@embedded-postgres/windows-x64");
  console.log("Postgres 프로그램 복사 중…");
  fs.cpSync(path.join(pkg, "native"), pgsql, { recursive: true });
}

// 2) 데이터 폴더 초기화 + jarvis DB 생성 (처음 한 번)
if (!fs.existsSync(path.join(data, "PG_VERSION"))) {
  console.log("데이터베이스 초기화 중…");
  fs.mkdirSync(root, { recursive: true });
  const pwfile = path.join(root, "pw.tmp");
  fs.writeFileSync(pwfile, PASSWORD);
  const init = spawnSync(bin("initdb"), ["-D", data, "-U", USER, `--pwfile=${pwfile}`, "-E", "UTF8", "--locale=C", "-A", "scram-sha-256"], { stdio: "inherit" });
  fs.rmSync(pwfile, { force: true });
  if (init.status !== 0) process.exit(1);
  const create = spawnSync(bin("postgres"), ["--single", "-D", data, "postgres"], { input: `CREATE DATABASE ${DB};\n`, stdio: ["pipe", "ignore", "inherit"] });
  if (create.status !== 0) process.exit(1);
}

// 3) 서버 실행 (이 창이 켜져 있는 동안)
const server = spawn(bin("postgres"), ["-D", data, "-p", PORT, "-c", "listen_addresses=localhost"], { stdio: ["ignore", "inherit", "inherit"] });
console.log(`로컬 PostgreSQL 실행 중 (localhost:${PORT}) — 끄려면 Ctrl+C`);
const stop = () => spawnSync(bin("pg_ctl"), ["stop", "-D", data, "-m", "fast"], { stdio: "inherit" });
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
server.on("exit", (code) => process.exit(code ?? 0));
