// index.js
const express = require("express");
const path = require("path");
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");
const flash = require("connect-flash");
const session = require("express-session");
const passport = require("passport");
require("dotenv").config();

const MongoConnect = require("./connection");
const passportConfig = require("./utils/passport");
const { formatCurrency } = require("./utils/formatCurr");
const routes = require("./routes");

const app = express();

// Mongo DB Connections
MongoConnect();

// Middleware Connections
app.engine("ejs", ejsMate);
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride("_method"));
app.use(
  session({
    secret: process.env.secret,
    resave: false,
    saveUninitialized: false,
    // store: MongoStore.create({ mongoUrl: process.env.MONGO_DB_URL }),
  })
);
app.use(passport.initialize());
app.use(passport.session());
passportConfig(passport);
app.use(flash());
app.locals.formatCurrency = formatCurrency;
app.use((req, res, next) => {
  res.locals.user = req.user;
  res.locals.success_msg = req.flash("success_msg");
  res.locals.error_msg = req.flash("error_msg");
  res.locals.error = req.flash("error");
  next();
});

app.use("/", routes);

// Connection
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
