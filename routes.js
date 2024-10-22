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
  // const currentMonth = new Date().getMonth();
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

  const { month } = req.query; // month is in 'YYYY-MM' format
  const currentDate = new Date();

  let selectedYear, selectedMonth;

  if (month) {
    // Split the month query to get year and month
    [selectedYear, selectedMonth] = month.split("-").map(Number);
  } else {
    // Default to current month and year
    selectedYear = currentDate.getFullYear();
    selectedMonth = currentDate.getMonth() + 1; // getMonth() returns 0-indexed month
  }

  try {
    const expenses = await expensesService.getMonthlyExpenses(
      req.user._id,
      selectedMonth, // Pass the selected month
      selectedYear // Pass the selected year
    );
    const totalSpent = await expensesService.calculateTotalSpent(
      req.user._id,
      selectedMonth,
      selectedYear
    );

    res.render("expenses", {
      title: "Expenses | MoneyMate",
      user: req.user,
      expenses,
      totalSpent,
      selectedMonth, // Pass selected month and year to the view
      selectedYear,
    });
  } catch (err) {
    console.log(err);
  }
});

router.patch("/expenses/:id", async (req, res) => {
  const { id } = req.params;
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
    await Expense.findByIdAndUpdate(id, expenseData, { new: true });
    req.flash("success_msg", "Expense Updated Successfully");
    res.redirect("/dashboard");
  } catch (err) {
    req.flash("error_msg", "Error updating the expense.");
    res.status(500).redirect("/dashboard");
  }
});

router.delete("/expenses/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await Expense.findByIdAndDelete(id);
    req.flash("success_msg", "Expense Deleted Successfully");
    res.redirect("/dashboard");
  } catch (error) {
    req.flash("error_msg", "Error Deleting the expense.");
    res.status(500).redirect("/dashboard");
  }
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
