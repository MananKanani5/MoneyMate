//Pie Chart
const expensesByCategoryData = document
  .getElementById("pieChart")
  .getAttribute("data-expenses-by-category");
const expensesByCategory = JSON.parse(expensesByCategoryData);
const labels1 = expensesByCategory.map((item) => item._id);
const dataValues1 = expensesByCategory.map((item) => item.totalAmount);
const ctx = document.getElementById("myPieChart").getContext("2d");
const myPieChart = new Chart(ctx, {
  type: "pie",
  data: {
    labels: labels1,
    datasets: [
      {
        label: "Spent",
        data: dataValues1,
        backgroundColor: [
          "#16325B",
          "#FFDC7F",
          "#227B94",
          "#FFDC41",
          "#78B7D0",
        ],
        borderWidth: 1,
      },
    ],
  },
  options: {
    responsive: true,
    plugins: {
      legend: {
        position: "top",
      },
    },
  },
});

// Bar Chart
const weeklyExpensesData = document
  .getElementById("weeklyExpenses")
  .getAttribute("data-expenses-by-week");
const weeklyExpenses = JSON.parse(weeklyExpensesData);

const labels2 = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const dataValues2 = labels2.map((label) => {
  const expenseData = weeklyExpenses.find((item) => item._id === label);
  return expenseData ? expenseData.totalAmount : 0;
});

const ctx2 = document.getElementById("myBarChart").getContext("2d");
const myBarChart = new Chart(ctx2, {
  type: "bar",
  data: {
    labels: labels2,
    datasets: [
      {
        label: "Weekly Expenses",
        data: dataValues2,
        backgroundColor: ["#00509d"],
        borderWidth: 1,
      },
    ],
  },
  options: {
    responsive: true,
    plugins: {
      legend: {
        position: "top",
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  },
});
