/** @type {Map<string, Set<import('ws').WebSocket>>} */
const connectionsByUser = new Map();

function addConnection(userId, ws) {
  const key = String(userId);
  if (!connectionsByUser.has(key)) {
    connectionsByUser.set(key, new Set());
  }
  connectionsByUser.get(key).add(ws);
}

function removeConnection(userId, ws) {
  const key = String(userId);
  const set = connectionsByUser.get(key);
  if (!set) return;
  set.delete(ws);
  if (set.size === 0) connectionsByUser.delete(key);
}

function publishToUser(userId, message) {
  const set = connectionsByUser.get(String(userId));
  if (!set || set.size === 0) return 0;
  const payload = typeof message === 'string' ? message : JSON.stringify(message);
  let sent = 0;
  for (const ws of set) {
    if (ws.readyState === 1) {
      ws.send(payload);
      sent += 1;
    }
  }
  return sent;
}

function connectionCount() {
  let n = 0;
  for (const set of connectionsByUser.values()) n += set.size;
  return n;
}

module.exports = {
  addConnection,
  removeConnection,
  publishToUser,
  connectionCount,
};
