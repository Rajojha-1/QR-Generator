const { getValue, setValue } = require("./kv");

function getUserIndexKey(userId) {
  return `user:qrs:${userId}`;
}

async function getUserQrs(userId) {
  const key = getUserIndexKey(userId);
  const raw = await getValue(key);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

async function upsertUserQr(userId, item) {
  const list = await getUserQrs(userId);
  const index = list.findIndex((entry) => entry.slug === item.slug);

  if (index >= 0) {
    list[index] = {
      ...list[index],
      ...item
    };
  } else {
    list.push(item);
  }

  list.sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
  await setValue(getUserIndexKey(userId), JSON.stringify(list));
  return list;
}

module.exports = {
  getUserQrs,
  upsertUserQr
};
