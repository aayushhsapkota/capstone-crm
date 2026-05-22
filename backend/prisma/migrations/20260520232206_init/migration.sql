-- CreateEnum
CREATE TYPE "BusinessStatus" AS ENUM ('NEW', 'EMAIL_SENT', 'AWAITING_REPLY', 'FOLLOW_UP_SENT', 'REPLIED', 'CLOSED_WON', 'CLOSED_LOST');

-- CreateEnum
CREATE TYPE "Direction" AS ENUM ('SENT', 'RECEIVED');

-- CreateEnum
CREATE TYPE "QueryStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETE', 'FAILED');

-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM ('QUEUED', 'RUNNING', 'COMPLETE', 'PARTIAL_FAIL');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('REPLY_RECEIVED', 'SEND_FAILED', 'SCRAPE_COMPLETE', 'UNSUBSCRIBED', 'CAMPAIGN_COMPLETE');

-- CreateTable
CREATE TABLE "Business" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "specialisation" TEXT,
    "location" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "website" TEXT,
    "contactFirstName" TEXT,
    "contactLastName" TEXT,
    "services" TEXT,
    "awards" TEXT,
    "yearsExperience" TEXT,
    "status" "BusinessStatus" NOT NULL DEFAULT 'NEW',
    "unsubscribed" BOOLEAN NOT NULL DEFAULT false,
    "imageUrl" TEXT,
    "customAttrs" JSONB,
    "scrapedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Business_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Email" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "direction" "Direction" NOT NULL,
    "subject" TEXT NOT NULL,
    "bodyHtml" TEXT NOT NULL,
    "offerId" TEXT,
    "gmailMessageId" TEXT,
    "gmailThreadId" TEXT,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Email_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Offer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "headline" TEXT NOT NULL,
    "discountPercent" INTEGER,
    "durationLabel" TEXT,
    "ctaText" TEXT,
    "bodyNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Offer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Query" (
    "id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "ranAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resultsCount" INTEGER NOT NULL DEFAULT 0,
    "status" "QueryStatus" NOT NULL DEFAULT 'PENDING',

    CONSTRAINT "Query_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QueryResult" (
    "id" TEXT NOT NULL,
    "queryId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "businessName" TEXT,
    "flagged" BOOLEAN NOT NULL DEFAULT false,
    "flagReason" TEXT,
    "scrapedAt" TIMESTAMP(3),
    "businessId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QueryResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BulkCampaign" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "offerId" TEXT,
    "status" "CampaignStatus" NOT NULL DEFAULT 'QUEUED',
    "totalCount" INTEGER NOT NULL,
    "sentCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "skippedCount" INTEGER NOT NULL DEFAULT 0,
    "delaySeconds" INTEGER NOT NULL DEFAULT 30,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "BulkCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BulkCampaignJob" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'PENDING',
    "errorMessage" TEXT,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "BulkCampaignJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "businessId" TEXT,
    "emailId" TEXT,
    "message" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OwnerProfile" (
    "id" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "senderEmail" TEXT NOT NULL,
    "senderName" TEXT NOT NULL,
    "specialisation" TEXT,
    "services" JSONB,
    "signatureHtml" TEXT,
    "logoUrl" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OwnerProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Business_email_key" ON "Business"("email");

-- CreateIndex
CREATE UNIQUE INDEX "QueryResult_businessId_key" ON "QueryResult"("businessId");

-- AddForeignKey
ALTER TABLE "Email" ADD CONSTRAINT "Email_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Email" ADD CONSTRAINT "Email_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "Offer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QueryResult" ADD CONSTRAINT "QueryResult_queryId_fkey" FOREIGN KEY ("queryId") REFERENCES "Query"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QueryResult" ADD CONSTRAINT "QueryResult_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BulkCampaign" ADD CONSTRAINT "BulkCampaign_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "Offer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BulkCampaignJob" ADD CONSTRAINT "BulkCampaignJob_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "BulkCampaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BulkCampaignJob" ADD CONSTRAINT "BulkCampaignJob_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE SET NULL ON UPDATE CASCADE;
