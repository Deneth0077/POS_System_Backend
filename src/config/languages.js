// Multi-language support for receipt generation
// Supports Sinhala, Tamil, and English

const translations = {
  english: {
    // Company Info
    companyName: 'POS System Restaurant',
    companyAddress: 'Your Address Here',
    companyPhone: 'Tel: +94 XX XXX XXXX',
    companyEmail: 'Email: info@possystem.lk',
    vatNumber: 'VAT No: XXXXXXXXX',

    // Receipt Headers
    receiptTitle: 'TAX INVOICE',
    duplicateReceipt: 'DUPLICATE RECEIPT',
    refundReceipt: 'REFUND RECEIPT',
    digitalReceipt: 'DIGITAL RECEIPT',

    // Order Types
    dineIn: 'Dine-In',
    takeaway: 'Takeaway',
    delivery: 'Delivery',

    // Receipt Details
    receiptNo: 'Receipt No',
    saleNo: 'Sale No',
    date: 'Date',
    time: 'Time',
    tableNo: 'Table No',
    cashier: 'Cashier',
    orderType: 'Order Type',

    // Item Details
    item: 'Item',
    qty: 'Qty',
    price: 'Price',
    total: 'Total',

    // Calculations
    subtotal: 'Subtotal',
    vat: 'VAT',
    vatRate: 'VAT Rate',
    discount: 'Discount',
    totalAmount: 'Total Amount',
    amountPaid: 'Amount Paid',
    change: 'Change',

    // Payment Methods
    paymentMethod: 'Payment Method',
    cash: 'Cash',
    card: 'Card',
    mobile: 'Mobile Payment',
    other: 'Other',

    // Split Bill
    splitBill: 'Split Bill',
    splitNo: 'Split No',

    // Footer Messages
    thankYou: 'Thank You! Come Again!',
    poweredBy: 'Powered by POS System',
    termsAndConditions: 'Terms & Conditions Apply',
    noRefund: 'No refunds or exchanges without receipt',

    // Additional
    customerCopy: 'Customer Copy',
    merchantCopy: 'Merchant Copy',
    signature: 'Signature',

    // Status
    paid: 'PAID',
    refunded: 'REFUNDED',
    voided: 'VOIDED'
  },

  sinhala: {
    // Company Info
    companyName: 'පොස් පද්ධති අවන්හල',
    companyAddress: 'ඔබේ ලිපිනය මෙහි',
    companyPhone: 'දුරකථන: +94 XX XXX XXXX',
    companyEmail: 'විද්‍යුත් තැපෑල: info@possystem.lk',
    vatNumber: 'වැට් අංකය: XXXXXXXXX',

    // Receipt Headers
    receiptTitle: 'බදු ඉන්වොයිසිය',
    duplicateReceipt: 'අනුපිටපත් රිසිට්පත',
    refundReceipt: 'ආපසු ගෙවීමේ රිසිට්පත',
    digitalReceipt: 'ඩිජිටල් රිසිට්පත',

    // Order Types
    dineIn: 'අවන්හලේ ආහාර ගැනීම',
    takeaway: 'රැගෙන යාම',
    delivery: 'බෙදාහැරීම',

    // Receipt Details
    receiptNo: 'රිසිට්පත් අංකය',
    saleNo: 'විකුණුම් අංකය',
    date: 'දිනය',
    time: 'වේලාව',
    tableNo: 'මේස අංකය',
    cashier: 'අයකැමි',
    orderType: 'ඇණවුම් වර්ගය',

    // Item Details
    item: 'අයිතමය',
    qty: 'ප්‍රමාණය',
    price: 'මිල',
    total: 'එකතුව',

    // Calculations
    subtotal: 'උප එකතුව',
    vat: 'වැට්',
    vatRate: 'වැට් අනුපාතය',
    discount: 'වට්ටම',
    totalAmount: 'මුළු එකතුව',
    amountPaid: 'ගෙවූ මුදල',
    change: 'ඉතිරිය',

    // Payment Methods
    paymentMethod: 'ගෙවීමේ ක්‍රමය',
    cash: 'මුදල්',
    card: 'කාඩ්පත',
    mobile: 'ජංගම ගෙවීම',
    other: 'වෙනත්',

    // Split Bill
    splitBill: 'බෙදූ බිල්පත',
    splitNo: 'බෙදීමේ අංකය',

    // Footer Messages
    thankYou: 'ස්තූතියි! නැවත පැමිණෙන්න!',
    poweredBy: 'බලගැන්වීම - පොස් පද්ධති',
    termsAndConditions: 'නියම සහ කොන්දේසි අදාළ වේ',
    noRefund: 'රිසිට්පත නොමැතිව ආපසු ගෙවීම් හෝ හුවමාරු නොකරන්න',

    // Additional
    customerCopy: 'ගනුදෙනුකරුගේ පිටපත',
    merchantCopy: 'වෙළඳසැලේ පිටපත',
    signature: 'අත්සන',

    // Status
    paid: 'ගෙවූ',
    refunded: 'ආපසු ගෙවූ',
    voided: 'අවලංගු කරන ලද'
  },

  tamil: {
    // Company Info
    companyName: 'பிஓஎஸ் உணவகம்',
    companyAddress: 'உங்கள் முகவரி இங்கே',
    companyPhone: 'தொலைபேசி: +94 XX XXX XXXX',
    companyEmail: 'மின்னஞ்சல்: info@possystem.lk',
    vatNumber: 'வாட் எண்: XXXXXXXXX',

    // Receipt Headers
    receiptTitle: 'வரி விலைப்பட்டியல்',
    duplicateReceipt: 'நகல் ரசீது',
    refundReceipt: 'திரும்பப்பெறுதல் ரசீது',
    digitalReceipt: 'டிஜிட்டல் ரசீது',

    // Order Types
    dineIn: 'உணவகத்தில் சாப்பிடுதல்',
    takeaway: 'எடுத்துச் செல்',
    delivery: 'விநியோகம்',

    // Receipt Details
    receiptNo: 'ரசீது எண்',
    saleNo: 'விற்பனை எண்',
    date: 'தேதி',
    time: 'நேரம்',
    tableNo: 'மேஜை எண்',
    cashier: 'காசாளர்',
    orderType: 'ஆர்டர் வகை',

    // Item Details
    item: 'பொருள்',
    qty: 'அளவு',
    price: 'விலை',
    total: 'மொத்தம்',

    // Calculations
    subtotal: 'துணை மொத்தம்',
    vat: 'வாட்',
    vatRate: 'வாட் விகிதம்',
    discount: 'தள்ளுபடி',
    totalAmount: 'மொத்த தொகை',
    amountPaid: 'செலுத்திய தொகை',
    change: 'மீதி',

    // Payment Methods
    paymentMethod: 'பணம் செலுத்தும் முறை',
    cash: 'பணம்',
    card: 'அட்டை',
    mobile: 'மொபைல் பணம்',
    other: 'மற்றவை',

    // Split Bill
    splitBill: 'பிரிக்கப்பட்ட பில்',
    splitNo: 'பிரிப்பு எண்',

    // Footer Messages
    thankYou: 'நன்றி! மீண்டும் வாருங்கள்!',
    poweredBy: 'இயக்குவது - பிஓஎஸ் அமைப்பு',
    termsAndConditions: 'விதிமுறைகள் மற்றும் நிபந்தனைகள் பொருந்தும்',
    noRefund: 'ரசீது இல்லாமல் பணத்தைத் திரும்பப் பெறுதல் அல்லது பரிமாற்றம் இல்லை',

    // Additional
    customerCopy: 'வாடிக்கையாளர் நகல்',
    merchantCopy: 'வணிகர் நகல்',
    signature: 'கையொப்பம்',

    // Status
    paid: 'செலுத்தப்பட்டது',
    refunded: 'திரும்பப் பெறப்பட்டது',
    voided: 'ரத்து செய்யப்பட்டது'
  }
};

// Helper function to get translation
const getTranslation = (language, key) => {
  const lang = language.toLowerCase();
  if (!translations[lang]) {
    console.warn(`Language '${language}' not found, defaulting to English`);
    return translations.english[key] || key;
  }
  return translations[lang][key] || translations.english[key] || key;
};

// Helper function to get all translations for a language
const getLanguageTranslations = (language) => {
  const lang = language.toLowerCase();
  if (!translations[lang]) {
    console.warn(`Language '${language}' not found, defaulting to English`);
    return translations.english;
  }
  return translations[lang];
};

// Get available languages
const getAvailableLanguages = () => {
  return Object.keys(translations);
};

// Format currency based on language (Sri Lankan Rupee)
const formatCurrency = (amount, language = 'english') => {
  const formattedAmount = parseFloat(amount).toFixed(2);

  switch (language.toLowerCase()) {
    case 'sinhala':
      return `රු. ${formattedAmount}`;
    case 'tamil':
      return `ரூ. ${formattedAmount}`;
    case 'english':
    default:
      return `Rs. ${formattedAmount}`;
  }
};

// Format date based on language
const formatDate = (date, language = 'english') => {
  const dateObj = new Date(date);

  switch (language.toLowerCase()) {
    case 'sinhala':
    case 'tamil':
      // Use locale-specific date format
      return dateObj.toLocaleDateString('en-GB');
    case 'english':
    default:
      return dateObj.toLocaleDateString('en-US');
  }
};

// Format time based on language
const formatTime = (date, language = 'english') => {
  const dateObj = new Date(date);
  return dateObj.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
};

module.exports = {
  translations,
  getTranslation,
  getLanguageTranslations,
  getAvailableLanguages,
  formatCurrency,
  formatDate,
  formatTime
};
