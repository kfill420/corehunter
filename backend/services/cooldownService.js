const cooldowns = new Map();

exports.isOnCooldown = (userId, duration) => {
  const last = cooldowns.get(userId);
  if (!last) return false;
  return Date.now() - last < duration;
};

exports.updateCooldown = (userId) => {
  cooldowns.set(userId, Date.now());
};
