import "dotenv/config";
import app from "./src/app.js";
import { testConnection } from "./src/db/index.js";
import connectCloudinary from "./src/config/cloudinary.js";

const PORT = process.env.PORT || 4000;

async function start() {
  try {
    // 1. Test PostgreSQL connection
    await testConnection();

    // 2. Configure Cloudinary
    connectCloudinary();

    // 4. Start server
    app.listen(PORT, () =>
      console.log(`[Server] MediBook API running on http://localhost:${PORT}`)
    );
  } catch (err) {
    console.error("[Server] Fatal startup error:", err);
    process.exit(1);
  }
}

start();
