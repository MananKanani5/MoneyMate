module.exports = {
  formatCurrency: (amount) => {
    return amount
      .toLocaleString("en-IN", {
        style: "currency",
        currency: "INR",
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      })
      .replace("INR", "₹")
      .trim();
  },
};
