// Test if /admin still redirects on SSR
(async () => {
  const resp = await fetch('https://app-beige-kappa-10.vercel.app/admin', {
    redirect: 'manual'
  });
  console.log('Status:', resp.status);
  console.log('Location:', resp.headers.get('location'));
  
  if (resp.status === 200) {
    const body = await resp.text();
    const hasAdmin = body.includes('Admin Panel') || body.includes('Dashboard') || body.includes('admin');
    const hasLogin = body.includes('เข้าสู่ระบบ');
    console.log('Contains admin content:', hasAdmin);
    console.log('Contains login form:', hasLogin);
    console.log('First 500 chars of body:', body.substring(0, 500));
  }
  process.exit(0);
})();
