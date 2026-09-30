import { initializePostgres, postgres } from "./postgres.js";

const connectDB = async (): Promise<void> => {
  await initializePostgres();
  await postgres.query("SELECT 1");
  console.log("PostgreSQL Connected");
};

export default connectDB;
