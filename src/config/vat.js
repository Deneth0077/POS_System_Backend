// VAT configuration for Sri Lanka
const VAT_RATE = parseFloat(process.env.VAT_RATE) || 0.15;

const calculateVAT = (amount) => {
  return amount * VAT_RATE;
};

const calculateTotalWithVAT = (amount) => {
  return amount + calculateVAT(amount);
};

const extractVATFromTotal = (totalWithVAT) => {
  return totalWithVAT * (VAT_RATE / (1 + VAT_RATE));
};

const calculateBaseFromTotal = (totalWithVAT) => {
  return totalWithVAT / (1 + VAT_RATE);
};

module.exports = {
  VAT_RATE,
  calculateVAT,
  calculateTotalWithVAT,
  extractVATFromTotal,
  calculateBaseFromTotal
};
