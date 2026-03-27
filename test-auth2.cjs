const { createClient } = require('@supabase/supabase-js');

const PROD_URL = 'https://app-beige-kappa-10.vercel.app';

(async () => {
  // Step 1: Login via the Supabase API (same as the browser does)
  console.log('=== Step 1: Sign in via Supabase ===');
  const supabase = createClient(
    'https://pilsoaowfqdbnxmgfuck.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBpbHNvYW93ZnFkYm54bWdmdWNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2MzMxMzAsImV4cCI6MjA5MDIwOTEzMH0.PCmhpv3O43iuRwX07ksJPABkSCYu6HdXNbPwfaguv9s'
  );

  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'hros8309@gmail.com',
    password: '123456',
  });
  
  if (authError) {
    console.log('AUTH ERROR:', authError.message);
    process.exit(1);
  }
  
  const accessToken = authData.session.access_token;
  const refreshToken = authData.session.refresh_token;
  console.log('Sign in OK, user:', authData.user.id);
  
  // Step 2: Test /api/me with the proper @nuxtjs/supabase cookie format
  // The module uses chunked cookies: sb-<ref>-auth-token.0, .1, etc.
  // Format: base64url encoded JSON array [access_token, refresh_token, ...]
  console.log('\n=== Step 2: Test /api/me with proper cookie format ===');
  
  // @nuxtjs/supabase v2 uses this cookie format
  const cookieBase = 'sb-pilsoaowfqdbnxmgfuck-auth-token';
  
  // Try format 1: Base64 encoded JSON
  const tokenPayload = JSON.stringify({ access_token: accessToken, refresh_token: refreshToken });
  const b64Payload = Buffer.from(tokenPayload).toString('base64');
  
  console.log('Testing with base64 JSON cookie...');
  let resp = await fetch(PROD_URL + '/api/me', {
    headers: { 'Cookie': `${cookieBase}=${b64Payload}` }
  });
  console.log('  Status:', resp.status, await resp.text().then(t => t.substring(0, 200)));

  // Try format 2: URL-encoded JSON
  console.log('\nTesting with URL-encoded JSON cookie...');
  resp = await fetch(PROD_URL + '/api/me', {
    headers: { 'Cookie': `${cookieBase}=${encodeURIComponent(tokenPayload)}` }
  });
  console.log('  Status:', resp.status, await resp.text().then(t => t.substring(0, 200)));

  // Try format 3: Chunked cookies (supabase-js v2 format)
  // The @supabase/ssr package stores as chunks: cookie.0, cookie.1, etc.
  const MAX_CHUNK_SIZE = 3180;
  const cookieValue = tokenPayload;
  const chunks = [];
  for (let i = 0; i < cookieValue.length; i += MAX_CHUNK_SIZE) {
    chunks.push(cookieValue.substring(i, i + MAX_CHUNK_SIZE));
  }
  const chunkedCookies = chunks.map((chunk, i) => `${cookieBase}.${i}=${encodeURIComponent(chunk)}`).join('; ');
  
  console.log('\nTesting with chunked cookies (' + chunks.length + ' chunks)...');
  resp = await fetch(PROD_URL + '/api/me', {
    headers: { 'Cookie': chunkedCookies }
  });
  console.log('  Status:', resp.status, await resp.text().then(t => t.substring(0, 200)));

  // Try format 4: Direct bearer token
  console.log('\nTesting with Authorization Bearer header...');
  resp = await fetch(PROD_URL + '/api/me', {
    headers: { 'Authorization': 'Bearer ' + accessToken }
  });
  console.log('  Status:', resp.status, await resp.text().then(t => t.substring(0, 200)));

  // Step 3: Visit /admin page and check redirect
  console.log('\n=== Step 3: Visit /admin with cookies ===');
  resp = await fetch(PROD_URL + '/admin', {
    headers: { 'Cookie': chunkedCookies },
    redirect: 'manual'
  });
  console.log('/admin status:', resp.status);
  console.log('/admin location:', resp.headers.get('location'));
  
  process.exit(0);
})();
