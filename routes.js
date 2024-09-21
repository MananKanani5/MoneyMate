const express = require("express");
const router = express.Router();
const passport = require("passport");
const { User, Expense } = require("./models/users.js");
const bcrypt = require("bcrypt");
const dashboardService = require("./services/dashboardService.js");
const expensesService = require("./services/expenseService");

// Route Handlers
router.get("/", (req, res) => {
  if (req.isAuthenticated()) return res.redirect("/dashboard");
  res.render("index", { title: "MoneyMate" });
});

router.get("/login", (req, res) => {
  if (req.isAuthenticated()) return res.redirect("/dashboard");
  res.render("login", { title: "Login | MoneyMate" });
});

router.get("/register", (req, res) => {
  if (req.isAuthenticated()) return res.redirect("/dashboard");
  res.render("register", { title: "Register | MoneyMate" });
});

router.post(
  "/login",
  passport.authenticate("local", {
    successRedirect: "/",
    failureRedirect: "/login",
    failureFlash: true,
  })
);

router.post("/register", async (req, res) => {
  try {
    const newUser = new User({ ...req.body });
    await newUser.save();
    req.flash("success_msg", "You are now registered and can log in");
    res.redirect("/login");
  } catch (err) {
    req.flash("error_msg", "Error registering new user.");
    res.status(500).redirect("/register");
  }
});

router.get("/dashboard", async (req, res) => {
  if (!req.isAuthenticated()) return res.redirect("/login");
  const currentMonth = new Date().getMonth();
  try {
    const totalSpentAmount = await dashboardService.getTotalSpentInCurrentMonth(
      req.user._id
    );
    const lastThreeTransactions =
      await dashboardService.getLastThreeTransactions(req.user._id);
    const expensesByCategory = await dashboardService.getExpensesByCategory(
      req.user._id
    );
    const weeklyExpenses = await dashboardService.getWeeklyExpenses(
      req.user._id
    );

    res.render("dashboard", {
      title: "Dashboard | MoneyMate",
      user: req.user,
      totalSpentAmount,
      lastThreeTransactions,
      expensesByCategory: JSON.stringify(expensesByCategory),
      weeklyExpenses,
    });
  } catch (err) {
    console.error(err);
    req.flash("error_msg", "Error fetching dashboard data.");
    res.redirect("/login");
  }
});

router.get("/my-account", async (req, res) => {
  if (!req.isAuthenticated()) return res.redirect("/login");
  res.render("my-account", { title: "My Account | MoneyMate", user: req.user });
});

router.patch("/my-account", async (req, res) => {
  const { name, username, email, password } = req.body;
  try {
    const updateData = {
      name,
      username,
      email,
    };

    if (password && password.trim() !== "") {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      updateData.password = hashedPassword;
    }
    await User.findByIdAndUpdate(req.user.id, { $set: updateData });

    req.flash("success_msg", "Details updated Successfully");
    res.redirect("/my-account");
  } catch (err) {
    console.log(err);
    req.flash("error_msg", "Error updating Details");
    res.status(500).redirect("/my-account");
  }
});

router.get("/expenses", async (req, res) => {
  if (!req.isAuthenticated()) return res.redirect("/login");

  const { startDate, endDate, sortOrder, page } = req.query;
  const limit = 20; // Number of items per page
  let expenses;
  let totalSpent;

  if (startDate && endDate) {
    expenses = await expensesService.getExpensesByDateRange(
      req.user._id,
      startDate,
      endDate,
      sortOrder,
      page || 1,
      limit
    );
    totalSpent = await expensesService.calculateTotalSpent(
      req.user._id,
      startDate,
      endDate
    );
  } else {
    expenses = await expensesService.getMonthlyExpenses(
      req.user._id,
      page || 1,
      limit
    );
    totalSpent = await expensesService.calculateTotalSpent(
      req.user._id,
      new Date().toISOString().slice(0, 10),
      new Date().toISOString().slice(0, 10)
    );
  }

  res.render("expenses", {
    title: "Expenses | MoneyMate",
    user: req.user,
    expenses,
    totalSpent,
    currentPage: page || 1,
    hasMore: expenses.length === limit,
  });
});

router.post("/expenses", async (req, res) => {
  const { time, date, amount, category, note } = req.body;
  const datetime = new Date(`${date}T${time}`);
  const expenseData = {
    datetime,
    amount,
    category,
    note,
    user: req.user.id,
  };

  try {
    const newExpense = new Expense(expenseData);
    await newExpense.save();
    req.flash("success_msg", "New Expense Added Successfully");
    res.redirect("/dashboard");
  } catch (err) {
    console.log(err);

    req.flash("error_msg", "Error Adding new expense.");
    res.status(500).redirect("/dashboard");
  }
});

router.get("/logout", (req, res, next) => {
  req.logout(function (err) {
    if (err) {
      return next(err);
    }
    req.flash("success_msg", "You are logged out");
    res.redirect("/login");
  });
});

module.exports = router;
