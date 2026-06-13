const { WebSocketServer } = require('ws');
const { verifyToken } = require('@galaxies/auth-shared');
const User = require('../../auth/models/User');
const { extractAuthTokenFromRequest } = require('../../../shared/authCookie');
const { addConnection, removeConnection } = require('./notificationHub');

const WS_PATH = '/ws/notifications';

/**
 * @param {import('http').Server} server
 */
function attachNotificationWebSocket(server) {
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (request, socket, head) => {
    const url = new URL(request.url || '', `http://${request.headers.host}`);
    if (url.pathname !== WS_PATH) {
      socket.destroy();
      return;
    }

    const token =
      url.searchParams.get('token') ||
      extractAuthTokenFromRequest(request) ||
      (request.headers['sec-websocket-protocol'] || '').split(',')[0]?.trim();
    const payload = token ? verifyToken(token) : null;
    if (!payload?.sub) {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }

    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  });

  wss.on('connection', (ws, request) => {
    void (async () => {
      try {
        const url = new URL(request.url || '', `http://${request.headers.host}`);
        const token =
          url.searchParams.get('token') ||
          extractAuthTokenFromRequest(request) ||
          (request.headers['sec-websocket-protocol'] || '').split(',')[0]?.trim();
        const payload = token ? verifyToken(token) : null;
        if (!payload?.sub) {
          ws.close(4401, 'unauthorized');
          return;
        }
        const user = await User.findById(payload.sub).select('accountStatus').lean();
        if (!user || user.accountStatus === 'deactivated') {
          ws.close(4403, 'account_deactivated');
          return;
        }
        const userId = String(payload.sub);
        addConnection(userId, ws);
        ws.send(JSON.stringify({ type: 'connected', userId }));

        ws.on('close', () => removeConnection(userId, ws));
        ws.on('error', () => removeConnection(userId, ws));
      } catch {
        ws.close(1011, 'server_error');
      }
    })();
  });

  return wss;
}

module.exports = { attachNotificationWebSocket, WS_PATH };
