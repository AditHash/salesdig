import app from "./app.js";
import { initializePostgres } from "./config/postgres.js";
import connectDB from "./config/db.js";

const PORT = process.env.PORT || 5000;

Promise.all([initializePostgres(), connectDB()])
    .then(() => {
        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    })
    .catch((error) => {
        console.error("PostgreSQL initialization failed", error);
        process.exit(1);
    });
