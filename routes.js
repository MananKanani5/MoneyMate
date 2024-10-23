const express = require("express");
const router = express.Router();
const passport = require("passport");
const { User, Expense } = require("./models/users.js");
const dashboardService = require("./services/dashboardService.js");
const expensesService = require("./services/expenseService");
const NodeCache = require("node-cache");
const myCache = new NodeCache({ stdTTL: 600 });

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

  const forceRefresh = req.query.refresh === "true";
  const cacheKey = `dashboard_${req.user._id}`;
  let cachedData = myCache.get(cacheKey);

  if (!forceRefresh && cachedData) {
    return res.render("dashboard", cachedData);
  }

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

    const dashboardData = {
      title: "Dashboard | MoneyMate",
      user: req.user,
      totalSpentAmount,
      lastThreeTransactions,
      expensesByCategory: JSON.stringify(expensesByCategory),
      weeklyExpenses,
    };

    myCache.set(cacheKey, dashboardData);
    res.render("dashboard", dashboardData);
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

router.get("/expenses", async (req, res) => {
  if (!req.isAuthenticated()) return res.redirect("/login");

  const forceRefresh = req.query.refresh === "true";
  const { month } = req.query;
  const currentDate = new Date();
  let selectedYear, selectedMonth;

  if (month) {
    [selectedYear, selectedMonth] = month.split("-").map(Number);
  } else {
    selectedYear = currentDate.getFullYear();
    selectedMonth = currentDate.getMonth() + 1;
  }

  const cacheKey = `expenses_${req.user._id}_${selectedYear}_${selectedMonth}`;
  let cachedData = myCache.get(cacheKey);

  if (!forceRefresh && cachedData) {
    return res.render("expenses", cachedData);
  }

  try {
    const expenses = await expensesService.getMonthlyExpenses(
      req.user._id,
      selectedMonth,
      selectedYear
    );
    const totalSpent = await expensesService.calculateTotalSpent(
      req.user._id,
      selectedMonth,
      selectedYear
    );

    const expensesData = {
      title: "Expenses | MoneyMate",
      user: req.user,
      expenses,
      totalSpent,
      selectedMonth,
      selectedYear,
    };

    myCache.set(cacheKey, expensesData);
    res.render("expenses", expensesData);
  } catch (err) {
    console.log(err);
    req.flash("error_msg", "Error fetching expenses data.");
    res.status(500).redirect("/expenses");
  }
});

const invalidateCache = (userId) => {
  const dashboardCacheKey = `dashboard_${userId}`;
  myCache.del(dashboardCacheKey);

  const expenseKeys = Object.keys(myCache.keys).filter((key) =>
    key.startsWith(`expenses_${userId}`)
  );
  expenseKeys.forEach((key) => myCache.del(key));
};

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
    invalidateCache(req.user._id);
    req.flash("success_msg", "Expense Updated Successfully");
    res.redirect("/expenses?refresh=true");
  } catch (err) {
    req.flash("error_msg", "Error updating the expense.");
    res.status(500).redirect("/dashboard?refresh=true");
  }
});

router.delete("/expenses/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await Expense.findByIdAndDelete(id);
    invalidateCache(req.user._id);
    req.flash("success_msg", "Expense Deleted Successfully");
    res.redirect("/expenses?refresh=true");
  } catch (error) {
    req.flash("error_msg", "Error Deleting the expense.");
    res.status(500).redirect("/dashboard?refresh=true");
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
    invalidateCache(req.user._id);
    req.flash("success_msg", "New Expense Added Successfully");
    res.redirect("/expenses?refresh=true");
  } catch (err) {
    req.flash("error_msg", "Error Adding new expense.");
    res.status(500).redirect("/dashboard?refresh=true");
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
