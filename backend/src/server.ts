import app from "./app.js";
import connectDB from "./config/db.js";
import { startSellerDocumentWorker } from "./services/sellerDocumentWorker.service.js";

const PORT = process.env.PORT || 5000;

connectDB()
    .then(() => {
        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
            startSellerDocumentWorker();
        });
    })
    .catch((error) => {
        console.error("PostgreSQL connection failed", error);
        process.exit(1);
    });
