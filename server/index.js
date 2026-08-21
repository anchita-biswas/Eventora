const dotenv = require("dotenv");
const mongoose = require("mongoose");
const dns = require("dns");

dotenv.config();

// Workaround for nodejs/node#62326 — Windows c-ares SRV regression, v24.13.0+
dns.setServers(["1.1.1.1", "8.8.8.8"]);

const app = require("./app");

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("Error connecting to MongoDB:", err));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
