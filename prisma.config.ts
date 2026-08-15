import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // Direct (non-pooled) connection, used by the CLI for schema push/migrate.
    // Falls back to the pooled DATABASE_URL if DIRECT_URL isn't set.
    url: process.env.DIRECT_URL || process.env.DATABASE_URL || "",
  },
});
