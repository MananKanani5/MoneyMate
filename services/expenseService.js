const { Expense } = require("../models/users.js");

const formatDate = (date) => {
  const options = { hour: "2-digit", minute: "2-digit", hour12: true };
  const time = date.toLocaleTimeString("en-US", options);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = String(date.getFullYear()).slice(-2);

  return `${time} ${day}/${month}/${year}`;
};

const getMonthlyExpenses = async (
  userId,
  month,
  year,
  page = 1,
  limit = 20
) => {
  const startOfMonth = new Date(year, month - 1, 1); // month is 0-indexed
  const endOfMonth = new Date(year, month, 1); // Next month start

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

const calculateTotalSpent = async (userId, month, year) => {
  const startOfMonth = new Date(year, month - 1, 1);
  const endOfMonth = new Date(year, month, 1); // First day of next month

  const total = await Expense.aggregate([
    {
      $match: {
        user: userId,
        datetime: {
          $gte: startOfMonth,
          $lt: endOfMonth,
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
  calculateTotalSpent,
};
