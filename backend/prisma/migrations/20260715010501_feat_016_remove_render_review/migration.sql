-- FEAT-016 (ADR-025): remove the operator render-review gate.
-- Renders are published immediately on generation success; the Render review
-- state machine, reviewer stamps, and the render_reviewer role are removed.

-- Data fix: render_reviewer operators become all-purpose (role NULL) so the
-- enum swap below cannot fail on existing rows (the role is retired — ADR-025).
UPDATE "Operator" SET "role" = NULL WHERE "role" = 'render_reviewer';

-- AlterEnum
BEGIN;
CREATE TYPE "OperatorRole_new" AS ENUM ('catalog_curator', 'order_handler');
ALTER TABLE "Operator" ALTER COLUMN "role" TYPE "OperatorRole_new" USING ("role"::text::"OperatorRole_new");
ALTER TYPE "OperatorRole" RENAME TO "OperatorRole_old";
ALTER TYPE "OperatorRole_new" RENAME TO "OperatorRole";
DROP TYPE "OperatorRole_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "Render" DROP CONSTRAINT "Render_reviewedById_fkey";

-- DropIndex
DROP INDEX "Render_reviewStatus_idx";

-- AlterTable
ALTER TABLE "Render" DROP COLUMN "reviewStatus",
DROP COLUMN "reviewedAt",
DROP COLUMN "reviewedById";

-- DropEnum
DROP TYPE "RenderReviewStatus";
