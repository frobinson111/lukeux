import { config } from "dotenv";
import { defineConfig } from "@prisma/cli";

config({ path: "../.env" });

export default defineConfig({
  datasource: {
    url: process.env.DATABASE_URL
  }
});
