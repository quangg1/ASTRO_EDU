/**
 * Bảng điều khiển admin dùng tên trường `delta` của sổ cái gem, khác với DTO
 * `amount` phía người học — chuyển đổi ở đây để hai giao diện tiến hóa độc lập.
 */
function adminWalletView(wallet) {
  return {
    balance: wallet.balance,
    level: wallet.level,
    totalGemsEarned: wallet.totalGemsEarned,
    learnerTier: wallet.learnerTier,
    transactions: wallet.transactions.map((tx) => ({
      id: tx.id,
      delta: tx.amount,
      reason: tx.reason,
      createdAt: tx.createdAt,
    })),
  };
}

module.exports = { adminWalletView };
