-- 글 비밀번호 틀림 제한을 QnA·버그 모두에 적용 (W-6)
ALTER TABLE "post_attempt" ADD COLUMN "target_type" TEXT;
UPDATE "post_attempt" SET "action" = 'password_fail', "target_type" = 'question' WHERE "action" = 'unlock_fail';

DROP INDEX "post_attempt_ip_hash_action_target_id_created_at_idx";
CREATE INDEX "post_attempt_ip_hash_action_target_type_target_id_created_a_idx" ON "post_attempt"("ip_hash", "action", "target_type", "target_id", "created_at");
CREATE INDEX "post_attempt_created_at_idx" ON "post_attempt"("created_at");

-- 버그 신고 앱 버전을 vX.Y.Z 형식으로 통일 (W-4, PMR-002 ②)
UPDATE "bug_report" SET "app_version" = 'v' || "app_version" WHERE "app_version" ~ '^[0-9]+\.[0-9]+\.[0-9]+$';
-- 릴리스 버전도 혹시 v 없이 저장된 행이 있으면 맞춘다
UPDATE "release" SET "version" = 'v' || "version" WHERE "version" ~ '^[0-9]+\.[0-9]+\.[0-9]+$';
