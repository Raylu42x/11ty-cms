const { test } = require('node:test');
const assert = require('node:assert');
const http = require('node:http');

process.env.NODE_ENV = 'test';
process.env.SESSION_SECRET = 'test-secret';

const app = require('../server/index');
const { loadSites } = require('../server/sites');

function listen() {
  return new Promise((resolve) => {
    const server = app.listen(0, () => resolve(server));
  });
}

function get(server, path) {
  const { port } = server.address();
  return new Promise((resolve, reject) => {
    http
      .get(`http://127.0.0.1:${port}${path}`, (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => resolve({ status: res.statusCode, body }));
      })
      .on('error', reject);
  });
}

test('healthz returns 200 with ok:true', async () => {
  const server = await listen();
  try {
    const { status, body } = await get(server, '/healthz');
    assert.equal(status, 200);
    const data = JSON.parse(body);
    assert.equal(data.ok, true);
    assert.ok(typeof data.version === 'string');
    assert.ok(typeof data.sites === 'number');
  } finally {
    server.close();
  }
});

test('protected api returns 401 without session', async () => {
  const server = await listen();
  try {
    const { status } = await get(server, '/api/sites');
    assert.equal(status, 401);
  } finally {
    server.close();
  }
});

test('loadSites does not throw', () => {
  assert.doesNotThrow(() => loadSites());
});

test('update version comparison', () => {
  const { _isNewer } = require('../server/updates');
  assert.equal(_isNewer('1.0.1', '1.0.0'), true);
  assert.equal(_isNewer('v1.0.1', '1.0.0'), true);
  assert.equal(_isNewer('1.0.0', '1.0.0'), false);
  assert.equal(_isNewer('1.0.0', '1.0.1'), false);
  assert.equal(_isNewer('2.0.0', '1.99.99'), true);
  assert.equal(_isNewer(null, '1.0.0'), false);
});
