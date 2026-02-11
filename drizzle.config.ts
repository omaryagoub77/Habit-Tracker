// drizzle-kit versions differ in whether `defineConfig` is exported.
// To keep `tsc --noEmit` green for app builds, avoid relying on the helper.

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL, ensure the database is provisioned");
}

export default {
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
} as const;
