-- CreateTable
CREATE TABLE "PullRequest" (
    "owner" TEXT NOT NULL,
    "repo" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "diff" TEXT,
    "summary" TEXT,

    CONSTRAINT "PullRequest_pkey" PRIMARY KEY ("owner","repo","number")
);
