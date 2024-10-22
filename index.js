const express = require("express");
const mongoose = require("mongoose");
const path = require("path");
const authRoutes = require("./routes/authRoutes");
const fileRoutes = require("./routes/fileRoutes");
const cookieParser = require("cookie-parser");
const { checkUser } = require("./middlewares/authMiddleware");

const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());
app.use(cookieParser());
app.use(checkUser);
app.use(authRoutes);
app.use(fileRoutes);

app.set("view engine" , "ejs");
app.set("views", path.join(__dirname, "views"));

async function main()
{
    await mongoose.connect("mongodb://127.0.0.1:27017/fileSharing")
    .then(app.listen(3000 , () => {
        console.log("server started at port 3000")
    }))
    .catch((err) => console.log(err));
}

main();