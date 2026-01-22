require("dotenv").config();
const express = require("express");
const path = require("path");

const app = express();

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

const productRoutes = require("./routes/products");
app.use("/", productRoutes);

app.listen(3000, () => {
    console.log("Server running at http://localhost:3000");
});