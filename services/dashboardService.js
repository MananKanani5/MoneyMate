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
  const today = new Date();
  const currentDay = today.getDay();

  const startOfWeek = new Date(today);
  startOfWeek.setDate(
    today.getDate() - (currentDay === 0 ? 6 : currentDay - 1)
  );
  startOfWeek.setHours(0, 0, 0, 0);

  const endOfWeek = new Date(today);
  endOfWeek.setHours(23, 59, 59, 999);

  // console.log("Start of Week:", startOfWeek.toDateString());
  // console.log("End of Week:", endOfWeek.toDateString());

  const weeklyData = await Expense.aggregate([
    {
      $match: {
        user: userId,
        datetime: {
          $gte: startOfWeek,
          $lte: endOfWeek,
        },
      },
    },
    {
      $group: {
        _id: { $dayOfWeek: "$datetime" },
        totalAmount: { $sum: "$amount" },
      },
    },
    {
      $sort: { _id: 1 },
    },
  ]);

  const dayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  const formattedData = dayLabels.map((day, index) => {
    const expenseData = weeklyData.find(
      (item) => item._id === (index + 2) % 7 || (index === 6 && item._id === 1)
    );

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
