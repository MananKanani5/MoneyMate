const { Expense } = require("../models/users.js");

const formatDate = (date) => {
  const options = { hour: "2-digit", minute: "2-digit", hour12: true };
  const time = date.toLocaleTimeString("en-US", options);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = String(date.getFullYear()).slice(-2);

  return `${time} ${day}/${month}/${year}`;
};

const getMonthlyExpenses = async (userId, page = 1, limit = 20) => {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  const endOfMonth = new Date(startOfMonth);
  endOfMonth.setMonth(startOfMonth.getMonth() + 1);

  const expenses = await Expense.find({
    user: userId,
    datetime: {
      $gte: startOfMonth,
      $lt: endOfMonth,
    },
  })
    .sort({ datetime: -1 })
    .skip((page - 1) * limit)
    .limit(limit);

  return expenses.map((expense) => ({
    ...expense.toObject(),
    datetime: formatDate(expense.datetime),
  }));
};

const getExpensesByDateRange = async (
  userId,
  startDate,
  endDate,
  sortOrder = "desc",
  page = 1,
  limit = 20
) => {
  const query = {
    user: userId,
    datetime: {
      $gte: new Date(startDate),
      $lt: new Date(endDate),
    },
  };

  return await Expense.find(query)
    .sort({ datetime: sortOrder === "asc" ? 1 : -1 })
    .skip((page - 1) * limit)
    .limit(limit);
};

const calculateTotalSpent = async (userId, startDate, endDate) => {
  const total = await Expense.aggregate([
    {
      $match: {
        user: userId,
        datetime: {
          $gte: new Date(startDate),
          $lt: new Date(endDate),
        },
      },
    },
    {
      $group: {
        _id: null,
        totalAmount: { $sum: "$amount" },
      },
    },
  ]);

  return total[0] ? total[0].totalAmount : 0;
};

module.exports = {
  getMonthlyExpenses,
  getExpensesByDateRange,
  calculateTotalSpent,
};
