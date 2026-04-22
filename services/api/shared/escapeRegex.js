/** Dùng cho RegExp từ chuỗi người dùng (filter an toàn). */
function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = { escapeRegex };
