-- CreateEnum
CREATE TYPE "NotifyStatus" AS ENUM ('NONE', 'PENDING', 'SENT', 'FAILED');

-- CreateEnum
CREATE TYPE "BugStatus" AS ENUM ('RECEIVED', 'CHECKING', 'FIXED', 'DEPLOYED');

-- CreateEnum
CREATE TYPE "ReleaseSource" AS ENUM ('GITHUB', 'MANUAL');

-- CreateTable
CREATE TABLE "admin" (
    "id" SERIAL NOT NULL,
    "login_id" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "failed_count" INTEGER NOT NULL DEFAULT 0,
    "locked_until" TIMESTAMP(3),

    CONSTRAINT "admin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "question" (
    "id" SERIAL NOT NULL,
    "nickname" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "email" TEXT,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_hidden" BOOLEAN NOT NULL DEFAULT false,
    "is_secret" BOOLEAN NOT NULL DEFAULT false,
    "notify_status" "NotifyStatus" NOT NULL DEFAULT 'NONE',

    CONSTRAINT "question_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "answer" (
    "id" SERIAL NOT NULL,
    "question_id" INTEGER NOT NULL,
    "admin_id" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "answer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bug_report" (
    "id" SERIAL NOT NULL,
    "nickname" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "app_version" TEXT NOT NULL,
    "os" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "repro_steps" TEXT NOT NULL,
    "attachment_url" TEXT,
    "status" "BugStatus" NOT NULL DEFAULT 'RECEIVED',
    "resolved_release_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "admin_memo" TEXT,
    "merged_into_bug_id" INTEGER,

    CONSTRAINT "bug_report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "release" (
    "id" SERIAL NOT NULL,
    "version" TEXT NOT NULL,
    "released_at" TIMESTAMP(3) NOT NULL,
    "release_note" TEXT NOT NULL,
    "download_url" TEXT NOT NULL,
    "sha256" CHAR(64) NOT NULL,
    "file_size" INTEGER NOT NULL,
    "github_release_url" TEXT,
    "source" "ReleaseSource" NOT NULL,
    "uploaded_by" INTEGER,
    "is_hidden" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "release_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "faq" (
    "id" SERIAL NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "faq_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "post_attempt" (
    "id" SERIAL NOT NULL,
    "ip_hash" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "target_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "post_attempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "admin_login_id_key" ON "admin"("login_id");

-- CreateIndex
CREATE UNIQUE INDEX "answer_question_id_key" ON "answer"("question_id");

-- CreateIndex
CREATE INDEX "bug_report_status_idx" ON "bug_report"("status");

-- CreateIndex
CREATE UNIQUE INDEX "release_version_key" ON "release"("version");

-- CreateIndex
CREATE INDEX "post_attempt_ip_hash_action_target_id_created_at_idx" ON "post_attempt"("ip_hash", "action", "target_id", "created_at");

-- AddForeignKey
ALTER TABLE "answer" ADD CONSTRAINT "answer_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "answer" ADD CONSTRAINT "answer_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "admin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bug_report" ADD CONSTRAINT "bug_report_resolved_release_id_fkey" FOREIGN KEY ("resolved_release_id") REFERENCES "release"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bug_report" ADD CONSTRAINT "bug_report_merged_into_bug_id_fkey" FOREIGN KEY ("merged_into_bug_id") REFERENCES "bug_report"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "release" ADD CONSTRAINT "release_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "admin"("id") ON DELETE SET NULL ON UPDATE CASCADE;
