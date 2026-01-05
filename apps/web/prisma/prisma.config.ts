import { config } from "dotenv";

config({ path: "../.env" });

export default {
  datasource: {
    url: process.env.DATABASE_URL
  }
};
