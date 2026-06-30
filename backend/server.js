import "dotenv/config"
import app from "./src/app.js"
import connectDB from "./src/config/db.js"
import  connectCloudinary  from "./src/config/cloudinary.js"

const PORT = process.env.PORT || 4000

connectDB().then(() => {
  connectCloudinary()
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`))
})
