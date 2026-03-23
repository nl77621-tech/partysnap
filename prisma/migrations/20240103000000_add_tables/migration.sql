-- CreateTable
CREATE TABLE "Table" (
    "id" TEXT NOT NULL,
    "partyId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "name" TEXT,
    "guests" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Table_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Table_partyId_idx" ON "Table"("partyId");

-- CreateIndex
CREATE UNIQUE INDEX "Table_partyId_number_key" ON "Table"("partyId", "number");

-- AddForeignKey
ALTER TABLE "Table" ADD CONSTRAINT "Table_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "Party"("id") ON DELETE CASCADE ON UPDATE CASCADE;
