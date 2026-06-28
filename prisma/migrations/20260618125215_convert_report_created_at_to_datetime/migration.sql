/*
  Warnings:

  - You are about to alter the column `created_at` on the `Report` table. The data in that column could be lost. The data in that column will be cast from `String` to `DateTime`.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Report" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "ferramenta" TEXT NOT NULL,
    "alvo" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "pdf_path" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL,
    CONSTRAINT "Report_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Report" ("alvo", "content", "created_at", "ferramenta", "id", "pdf_path", "title", "user_id") SELECT "alvo", "content", "created_at", "ferramenta", "id", "pdf_path", "title", "user_id" FROM "Report";
DROP TABLE "Report";
ALTER TABLE "new_Report" RENAME TO "Report";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
