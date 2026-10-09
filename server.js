const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function loadLocalEnv() {
  const envPath = path.join(__dirname, '.env.local');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const separator = trimmed.indexOf('=');
    if (separator < 1) continue;
    const key = trimmed.slice(0, separator).trim();
    let value = trimmed.slice(separator + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

loadLocalEnv();

const PORT = Number(process.env.PORT || 3001);
const CLIENT_ID = process.env.UPSTOX_CLIENT_ID || '';
const CLIENT_SECRET = process.env.UPSTOX_CLIENT_SECRET || '';
const REDIRECT_URI = process.env.UPSTOX_REDIRECT_URI || `http://localhost:${PORT}/api/upstox/callback`;
const APP_ORIGIN = process.env.APP_ORIGIN || 'http://localhost:3000';
const ALLOWED_ORIGINS = new Set([APP_ORIGIN, 'http://127.0.0.1:3000']);
let accessToken = '';
let tokenExpiresAt = 0;
let pendingOAuthState = '';
const instrumentCache = new Map();

const serverConfigured = () => Boolean(CLIENT_ID && CLIENT_SECRET && REDIRECT_URI);
const tokenIsValid = () => Boolean(accessToken && (!tokenExpiresAt || Date.now() < tokenExpiresAt));

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  response.end(JSON.stringify(payload));
}

function setCors(request, response) {
  const origin = request.headers.origin;
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    response.setHeader('Access-Control-Allow-Origin', origin);
    response.setHeader('Vary', 'Origin');
    response.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  }
}

async function upstoxJson(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      Accept: 'application/json',
      ...(options.body ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
      ...(options.headers || {}),
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = payload.errors?.[0]?.message || payload.message || `Upstox returned HTTP ${response.status}`;
    const error = new Error(message);
    error.statusCode = response.status;
    throw error;
  }
  return payload;
}

async function findListings(symbol) {
  const cached = instrumentCache.get(symbol);
  if (cached && cached.expiresAt > Date.now()) return cached.listings;

  const url = new URL('https://api.upstox.com/v2/instruments/search');
  url.searchParams.set('query', symbol);
  url.searchParams.set('exchanges', 'NSE,BSE');
  url.searchParams.set('segments', 'EQ');
  url.searchParams.set('instrument_types', 'EQ');
  url.searchParams.set('records', '30');
  const response = await upstoxJson(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  const instruments = Array.isArray(response.data) ? response.data : [];
  const exactMatches = instruments.filter((instrument) => (
    instrument.instrument_type === 'EQ' && String(instrument.trading_symbol || '').toUpperCase() === symbol
  ));
  const nse = exactMatches.find((instrument) => instrument.segment === 'NSE_EQ') || null;
  const bse = exactMatches.find((instrument) => instrument.segment === 'BSE_EQ' && (!nse || instrument.isin === nse.isin)) || null;
  const listings = { NSE: nse, BSE: bse };
  instrumentCache.set(symbol, { listings, expiresAt: Date.now() + 60 * 60 * 1000 });
  return listings;
}

function quoteFor(data, instrument) {
  if (!instrument) return null;
  const responseKey = `${instrument.segment}:${instrument.trading_symbol}`;
  const quote = data[responseKey] || Object.values(data).find((item) => item.instrument_token === instrument.instrument_key);
  if (!quote || !Number.isFinite(Number(quote.last_price))) return null;
  return {
    price: Number(quote.last_price),
    change: Number(quote.net_change || 0),
    previousClose: Number(quote.prev_close_price || quote.ohlc?.close || 0),
    quoteTime: quote.timestamp || null,
    lastTradeTime: quote.last_trade_time || null,
  };
}

async function getQuotes(symbols) {
  const listingsBySymbol = {};
  for (const symbol of symbols) listingsBySymbol[symbol] = await findListings(symbol);
  const instruments = [...new Set(Object.values(listingsBySymbol).flatMap((listings) => Object.values(listings).filter(Boolean)))];
  if (instruments.length === 0) {
    return { fetchedAt: new Date().toISOString(), quotes: Object.fromEntries(symbols.map((symbol) => [symbol, { NSE: null, BSE: null }])) };
  }

  const url = new URL('https://api.upstox.com/v3/market-quote/quotes');
  url.searchParams.set('instrument_key', instruments.map((instrument) => instrument.instrument_key).join(','));
  const response = await upstoxJson(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  const data = response.data || {};
  const quotes = {};
  for (const symbol of symbols) {
    const listings = listingsBySymbol[symbol];
    quotes[symbol] = {
      NSE: quoteFor(data, listings.NSE),
      BSE: quoteFor(data, listings.BSE),
    };
  }
  return { fetchedAt: new Date().toISOString(), quotes };
}

const server = http.createServer(async (request, response) => {
  setCors(request, response);
  if (request.method === 'OPTIONS') {
    response.writeHead(204);
    response.end();
    return;
  }

  const requestUrl = new URL(request.url, `http://${request.headers.host || 'localhost'}`);
  try {
    if (request.method === 'GET' && requestUrl.pathname === '/api/upstox/status') {
      sendJson(response, 200, {
        configured: serverConfigured(),
        connected: tokenIsValid(),
        expiresAt: tokenIsValid() ? tokenExpiresAt || null : null,
      });
      return;
    }

    if (request.method === 'GET' && requestUrl.pathname === '/api/upstox/auth') {
      if (!serverConfigured()) {
        sendJson(response, 503, { error: 'Add Upstox Developer app credentials to .env.local first.' });
        return;
      }
      pendingOAuthState = crypto.randomBytes(24).toString('hex');
      const authUrl = new URL('https://api.upstox.com/v2/login/authorization/dialog');
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('client_id', CLIENT_ID);
      authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
      authUrl.searchParams.set('state', pendingOAuthState);
      response.writeHead(302, { Location: authUrl.toString(), 'Cache-Control': 'no-store' });
      response.end();
      return;
    }

    if (request.method === 'GET' && requestUrl.pathname === '/api/upstox/callback') {
      const code = requestUrl.searchParams.get('code');
      const state = requestUrl.searchParams.get('state');
      if (!serverConfigured() || !code || !pendingOAuthState || state !== pendingOAuthState) {
        response.writeHead(302, { Location: `${APP_ORIGIN}/?marketData=auth-error` });
        response.end();
        return;
      }
      pendingOAuthState = '';
      const body = new URLSearchParams({
        code,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        grant_type: 'authorization_code',
      });
      const tokenResponse = await upstoxJson('https://api.upstox.com/v2/login/authorization/token', {
        method: 'POST',
        body: body.toString(),
      });
      accessToken = tokenResponse.access_token || tokenResponse.data?.access_token || '';
      const expiresIn = Number(tokenResponse.expires_in || tokenResponse.data?.expires_in || 0);
      tokenExpiresAt = expiresIn ? Date.now() + expiresIn * 1000 : 0;
      response.writeHead(302, { Location: `${APP_ORIGIN}/?marketData=connected`, 'Cache-Control': 'no-store' });
      response.end();
      return;
    }

    if (request.method === 'POST' && requestUrl.pathname === '/api/upstox/disconnect') {
      accessToken = '';
      tokenExpiresAt = 0;
      sendJson(response, 200, { connected: false });
      return;
    }

    if (request.method === 'GET' && requestUrl.pathname === '/api/upstox/quotes') {
      if (!tokenIsValid()) {
        accessToken = '';
        sendJson(response, 401, { error: 'Connect Upstox to retrieve live exchange prices.' });
        return;
      }
      const symbols = [...new Set((requestUrl.searchParams.get('symbols') || '')
        .split(',')
        .map((symbol) => symbol.trim().toUpperCase())
        .filter((symbol) => /^[A-Z0-9._-]{1,30}$/.test(symbol)))].slice(0, 100);
      if (symbols.length === 0) {
        sendJson(response, 400, { error: 'Add at least one valid stock symbol.' });
        return;
      }
      sendJson(response, 200, await getQuotes(symbols));
      return;
    }

    sendJson(response, 404, { error: 'Not found.' });
  } catch (error) {
    console.error('Market data request failed:', error.message);
    sendJson(response, error.statusCode || 502, { error: error.message || 'Market data request failed.' });
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Local Upstox market-data service listening at http://localhost:${PORT}`);
  if (!serverConfigured()) {
    console.log('Upstox is not configured yet. Copy .env.example to .env.local and add your Developer app credentials.');
  }
});