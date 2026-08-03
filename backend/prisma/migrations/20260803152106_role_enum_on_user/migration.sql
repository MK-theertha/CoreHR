-- AlterTable: add the new enum column with a safe default
ALTER TABLE "User" ADD COLUMN "role" "RoleName" NOT NULL DEFAULT 'EMPLOYEE';

-- Backfill: carry over each user's existing role from the Role table
UPDATE "User" u
SET "role" = r."name"
FROM "Role" r
WHERE u."roleId" = r."id";

-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_roleId_fkey";

-- AlterTable: drop the old relational column
ALTER TABLE "User" DROP COLUMN "roleId";

-- DropTable
DROP TABLE "Role";
