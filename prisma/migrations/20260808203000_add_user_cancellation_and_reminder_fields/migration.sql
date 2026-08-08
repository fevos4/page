-- AlterTable
ALTER TABLE "users" ADD COLUMN     "membership_cancelled_at" TIMESTAMPTZ,
ADD COLUMN     "renewal_reminder_sent" BOOLEAN NOT NULL DEFAULT false;
