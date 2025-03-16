/*
  Warnings:

  - A unique constraint covering the columns `[email]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `airtable_table` to the `Project` table without a default value. This is not possible if the table is not empty.
  - Added the required column `airtable_view` to the `Project` table without a default value. This is not possible if the table is not empty.
  - Added the required column `organization` to the `Project` table without a default value. This is not possible if the table is not empty.
  - Made the column `airtable_base_id` on table `Project` required. This step will fail if there are existing NULL values in that column.
  - Made the column `airtable_approval_id` on table `Project` required. This step will fail if there are existing NULL values in that column.
  - Made the column `airtable_grant_id` on table `Project` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "airtable_table" TEXT NOT NULL,
ADD COLUMN     "airtable_view" TEXT NOT NULL,
ADD COLUMN     "organization" TEXT NOT NULL,
ALTER COLUMN "airtable_base_id" SET NOT NULL,
ALTER COLUMN "airtable_approval_id" SET NOT NULL,
ALTER COLUMN "airtable_grant_id" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
