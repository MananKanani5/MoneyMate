const { Expense } = require("../models/users");

const formatDate = (date) => {
  const options = { hour: "2-digit", minute: "2-digit", hour12: true };
  const time = date.toLocaleTimeString("en-US", options);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = String(date.getFullYear()).slice(-2);

  return `${time} ${day}/${month}/${year}`;
};

const getTotalSpentInCurrentMonth = async (userId) => {
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  const totalSpent = await Expense.aggregate([
    {
      $match: {
        user: userId,
        datetime: {
          $gte: new Date(currentYear, currentMonth, 1),
          $lt: new Date(currentYear, currentMonth + 1, 1),
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

  return totalSpent.length > 0 ? totalSpent[0].totalAmount : 0;
};

const getLastThreeTransactions = async (userId) => {
  const transactions = await Expense.find({ user: userId })
    .sort({ datetime: -1 })
    .limit(3);

  return transactions.map((transaction) => ({
    ...transaction.toObject(),
    datetime: formatDate(transaction.datetime),
  }));
};

const getExpensesByCategory = async (userId) => {
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  return await Expense.aggregate([
    {
      $match: {
        user: userId,
        datetime: {
          $gte: new Date(currentYear, currentMonth, 1),
          $lt: new Date(currentYear, currentMonth + 1, 1),
        },
      },
    },
    {
      $group: {
        _id: "$category",
        totalAmount: { $sum: "$amount" },
      },
    },
  ]);
};

const getWeeklyExpenses = async (userId) => {
  const startOfWeek = new Date();
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay() + 1);
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(endOfWeek.getDate() + 6);

  const weeklyData = await Expense.aggregate([
    {
      $match: {
        user: userId,
        datetime: {
          $gte: startOfWeek,
          $lt: new Date(
            endOfWeek.getFullYear(),
            endOfWeek.getMonth(),
            endOfWeek.getDate() + 1
          ),
        },
      },
    },
    {
      $group: {
        _id: {
          $dayOfWeek: "$datetime",
        },
        totalAmount: { $sum: "$amount" },
      },
    },
    {
      $sort: { _id: 1 },
    },
  ]);

  const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const formattedData = dayLabels.map((day, index) => {
    const expenseData = weeklyData.find((item) => item._id === index + 1);
    return {
      _id: day,
      totalAmount: expenseData ? expenseData.totalAmount : 0,
    };
  });

  return formattedData;
};

module.exports = {
  getTotalSpentInCurrentMonth,
  getLastThreeTransactions,
  getExpensesByCategory,
  getWeeklyExpenses,
};
