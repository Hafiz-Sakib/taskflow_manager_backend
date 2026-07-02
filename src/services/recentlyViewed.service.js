const recentlyViewedRepository = require('../repositories/recentlyViewed.repository');

async function listRecent(userId) {
  const rows = await recentlyViewedRepository.listByUser(userId, 10);
  return rows.filter((r) => r.board).map((r) => ({ board: r.board, viewedAt: r.viewedAt }));
}

module.exports = { listRecent };
