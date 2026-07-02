const activityRepository = require('../repositories/activity.repository');
const logger = require('../config/logger');
const { parsePagination, buildPaginationMeta } = require('../utils/pagination');

async function record(entry) {
  try {
    await activityRepository.record(entry);
  } catch (err) {
    logger.warn(`Activity log failed: ${err.message}`);
  }
}

async function listForBoard(boardId, query) {
  const { page, limit, skip } = parsePagination(query);
  const [items, total] = await Promise.all([
    activityRepository.listByBoard(boardId, { skip, limit }),
    activityRepository.countByBoard(boardId),
  ]);
  return { items, meta: buildPaginationMeta({ page, limit, total }) };
}

module.exports = { record, listForBoard };
