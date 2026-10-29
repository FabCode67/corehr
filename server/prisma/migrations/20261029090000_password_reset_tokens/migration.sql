CREATE TABLE "password_reset_tokens" (
    "id" TEXT NOT NULL,
    "employeeNumber" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "password_reset_tokens_tokenHash_key" ON "password_reset_tokens"("tokenHash");
CREATE INDEX "password_reset_tokens_employeeNumber_idx" ON "password_reset_tokens"("employeeNumber");

ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_employeeNumber_fkey" FOREIGN KEY ("employeeNumber") REFERENCES "employees"("employeeNumber") ON DELETE CASCADE ON UPDATE CASCADE;
