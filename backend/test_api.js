const http = require('http');

function httpRequest(options, body = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(10000, () => { req.destroy(new Error('Timeout')); });
    if (body) req.write(body);
    req.end();
  });
}

async function main() {
  const BASE = 'localhost';
  const PORT = 2101;

  // 1. Health check
  console.log('--- 1. Health Check ---');
  try {
    const h = await httpRequest({ hostname: BASE, port: PORT, path: '/api/health', method: 'GET' });
    console.log('Health:', h.status, JSON.stringify(h.body));
  } catch (e) { console.error('Health FAILED:', e.message); }

  // 2. Login
  console.log('\n--- 2. Login as Admin ---');
  let token = null;
  try {
    const loginBody = JSON.stringify({ username: 'admin', password: '1010' });
    const l = await httpRequest({
      hostname: BASE, port: PORT, path: '/api/auth/login', method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(loginBody) }
    }, loginBody);
    console.log('Login status:', l.status);
    if (l.body.token) {
      token = l.body.token;
      console.log('Token received: YES');
      console.log('User role:', l.body.user?.role);
    } else {
      console.log('Login body:', JSON.stringify(l.body));
    }
  } catch (e) { console.error('Login FAILED:', e.message); }

  if (!token) {
    // try other known credentials
    console.log('\n--- 2b. Login with default password ---');
    try {
      const loginBody = JSON.stringify({ username: 'admin', password: 'admin' });
      const l = await httpRequest({
        hostname: BASE, port: PORT, path: '/api/auth/login', method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(loginBody) }
      }, loginBody);
      console.log('Login status:', l.status, JSON.stringify(l.body).substring(0, 200));
      if (l.body.token) token = l.body.token;
    } catch (e) { console.error('Login 2b FAILED:', e.message); }
  }

  if (!token) {
    console.log('\n❌ Cannot get a valid token — cannot test authenticated routes.');
    return;
  }

  // 3. /api/users
  console.log('\n--- 3. GET /api/users ---');
  try {
    const u = await httpRequest({
      hostname: BASE, port: PORT, path: '/api/users', method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log('Users status:', u.status);
    if (Array.isArray(u.body)) {
      console.log('Users count:', u.body.length);
      if (u.body.length > 0) console.log('First user:', JSON.stringify(u.body[0]).substring(0, 200));
    } else {
      console.log('Users body:', JSON.stringify(u.body).substring(0, 300));
    }
  } catch (e) { console.error('Users FAILED:', e.message); }

  // 4. /api/departments
  console.log('\n--- 4. GET /api/departments ---');
  try {
    const d = await httpRequest({
      hostname: BASE, port: PORT, path: '/api/departments', method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log('Departments status:', d.status);
    if (Array.isArray(d.body)) console.log('Departments count:', d.body.length);
    else console.log('Departments body:', JSON.stringify(d.body).substring(0, 300));
  } catch (e) { console.error('Departments FAILED:', e.message); }

  // 5. /api/settings
  console.log('\n--- 5. GET /api/settings ---');
  try {
    const s = await httpRequest({
      hostname: BASE, port: PORT, path: '/api/settings', method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log('Settings status:', s.status, JSON.stringify(s.body).substring(0, 200));
  } catch (e) { console.error('Settings FAILED:', e.message); }
}

main().then(() => process.exit(0)).catch(e => { console.error('FATAL:', e); process.exit(1); });
