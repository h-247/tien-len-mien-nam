import net from 'node:net';
import { spawn, exec } from 'node:child_process';

function testPortBind(port, host) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => {
      server.close(() => resolve(true));
    });
    server.listen(port, host);
  });
}

function testPortConnect(port, host) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(250);
    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.once('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.once('error', () => {
      resolve(false);
    });
    socket.connect(port, host);
  });
}

async function isPortAvailable(port) {
  if (await testPortConnect(port, '127.0.0.1')) return false;
  if (await testPortConnect(port, '::1')) return false;
  if (await testPortConnect(port, 'localhost')) return false;

  const canBind4 = await testPortBind(port, '127.0.0.1');
  if (!canBind4) return false;
  const canBindAll = await testPortBind(port, '0.0.0.0');
  if (!canBindAll) return false;

  return true;
}

async function findAvailablePort(startPort = 3000) {
  let port = startPort;
  while (!(await isPortAvailable(port))) {
    console.log(`[!] Cổng ${port} đang bận / được sử dụng bởi ứng dụng khác. Đang kiểm tra cổng tiếp theo...`);
    port++;
  }
  return port;
}

function openBrowser(url) {
  const start = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
  exec(`${start} ${url}`);
}

async function start() {
  console.log('========================================================');
  console.log('       TIẾN LÊN MIỀN NAM - KHỞI CHẠY CỤC BỘ');
  console.log('========================================================\n');

  console.log('[+] Đang kiểm tra các cổng mạng đang mở...');
  const port = await findAvailablePort(3000);
  const url = `http://localhost:${port}`;

  console.log(`[✓] Đã chọn cổng khả dụng: ${port} (Không trùng với bất kỳ cổng nào đang chạy)`);
  console.log(`[+] Đang khởi động máy chủ Vinext tại: ${url}\n`);

  // Run vinext dev with the available port
  const isWin = process.platform === 'win32';
  const cmd = isWin ? 'npx.cmd' : 'npx';
  const child = spawn(cmd, ['vinext', 'dev', '-p', String(port)], {
    stdio: 'inherit',
    shell: true,
  });

  // Open browser after a brief delay for server initialization
  let opened = false;
  const checkInterval = setInterval(async () => {
    if (opened) return;
    const busy = !(await isPortAvailable(port));
    if (busy) {
      opened = true;
      clearInterval(checkInterval);
      console.log(`\n[✓] Máy chủ đã sẵn sàng! Đang mở trình duyệt tới ${url} ...`);
      openBrowser(url);
    }
  }, 600);

  child.on('exit', (code) => {
    process.exit(code ?? 0);
  });

  process.on('SIGINT', () => {
    child.kill('SIGINT');
  });
}

start().catch(console.error);
