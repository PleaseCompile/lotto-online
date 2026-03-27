const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://pilsoaowfqdbnxmgfuck.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBpbHNvYW93ZnFkYm54bWdmdWNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2MzMxMzAsImV4cCI6MjA5MDIwOTEzMH0.PCmhpv3O43iuRwX07ksJPABkSCYu6HdXNbPwfaguv9s'
);

(async () => {
  console.log('=== Step 1: Sign in ===');
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'hros8309@gmail.com',
    password: '123456',
  });
  
  if (authError) {
    console.log('AUTH ERROR:', authError.message);
    return;
  }
  console.log('Sign in OK, user id:', authData.user?.id);
  console.log('Access token (first 50):', authData.session?.access_token?.substring(0, 50));
  
  console.log('\n=== Step 2: Fetch from public.users (anon key + RLS) ===');
  const { data: profileData, error: profileError } = await supabase
    .from('users')
    .select('*')
    .eq('id', authData.user.id)
    .single();
  
  console.log('Profile data:', JSON.stringify(profileData, null, 2));
  console.log('Profile error:', JSON.stringify(profileError, null, 2));

  console.log('\n=== Step 3: Test /api/me on production ===');
  try {
    const token = JSON.stringify([authData.session.access_token, authData.session.refresh_token, null, null, null]);
    const cookieName = 'sb-pilsoaowfqdbnxmgfuck-auth-token';
    const resp = await fetch('https://app-beige-kappa-10.vercel.app/api/me', {
      headers: {
        'Cookie': cookieName + '=' + encodeURIComponent(token),
      }
    });
    console.log('/api/me status:', resp.status);
    const body = await resp.text();
    console.log('/api/me body:', body.substring(0, 500));
  } catch (e) {
    console.log('/api/me error:', e.message);
  }
  
  console.log('\n=== Step 4: Test /api/me with Authorization header ===');
  try {
    const resp = await fetch('https://app-beige-kappa-10.vercel.app/api/me', {
      headers: {
        'Authorization': 'Bearer ' + authData.session.access_token,
      }
    });
    console.log('/api/me (Bearer) status:', resp.status);
    const body = await resp.text();
    console.log('/api/me (Bearer) body:', body.substring(0, 500));
  } catch (e) {
    console.log('/api/me (Bearer) error:', e.message);
  }

  process.exit(0);
})();
