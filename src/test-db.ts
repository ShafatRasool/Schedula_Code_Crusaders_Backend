import { DataSource } from "typeorm";
import { config } from "dotenv";
config();

const AppDataSource = new DataSource({
  type: "postgres",
  url: process.env.DATABASE_URL,
  ssl: true,
});

AppDataSource.initialize()
  .then(() => {
    console.log("✅ Connected to DB successfully!");
    process.exit(0);
  })
  .catch((err) => {
    console.error("❌ Error connecting to DB:", err);
    process.exit(1);
  });
