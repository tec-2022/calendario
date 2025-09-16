import { supabase } from '/config/supabaseClient.js';

// Protect pages: redirect if no session
const logoutBtn = document.getElementById('logoutBtn');

async function ensureSession(){
  const { data:{ session } } = await supabase.auth.getSession();
  if (!session){
    location.href = '/login.html';
    return;
  }
  // show logout button
  logoutBtn?.classList.remove('hidden');
}
ensureSession();

logoutBtn?.addEventListener('click', async ()=>{
  await supabase.auth.signOut();
  location.href = '/login.html';
});
