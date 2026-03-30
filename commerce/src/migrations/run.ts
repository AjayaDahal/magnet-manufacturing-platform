import { db } from "../db";

async function runMigrations() {
  await db.initialize();
  console.log("Running migrations...");
  await db.runMigrations();
  console.log("Migrations complete");
  await db.destroy();
}

runMigrations().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
