import { supabase } from '/config/supabaseClient.js';

const tabSignIn = document.getElementById('tabSignIn');
const tabSignUp = document.getElementById('tabSignUp');
const submit = document.getElementById('submitAuth');
const email = document.getElementById('email');
const password = document.getElementById('password');
const msg = document.getElementById('authMsg');

// If already logged, go to index
supabase.auth.getSession().then(({ data:{ session } }) => { if (session) location.href='/index.html'; });

let mode = 'signin';
tabSignIn?.addEventListener('click', ()=>{ mode='signin'; tabSignIn.classList.add('is-active'); tabSignUp.classList.remove('is-active'); });
tabSignUp?.addEventListener('click', ()=>{ mode='signup'; tabSignUp.classList.add('is-active'); tabSignIn.classList.remove('is-active'); });

submit?.addEventListener('click', async ()=>{
  msg.textContent = '';
  if (!email.value || !password.value){ msg.textContent='Completa correo y contraseña'; return; }
  try {
    if (mode==='signin'){
      const { error } = await supabase.auth.signInWithPassword({ email: email.value, password: password.value });
      if (error) throw error;
      location.href = '/index.html';
    } else {
      const { error } = await supabase.auth.signUp({ email: email.value, password: password.value });
      if (error) throw error;
      msg.textContent = 'Cuenta creada. Revisa tu correo para confirmar ✉️';
    }
  } catch (e){
    msg.textContent = e.message || 'Error de autenticación';
  }
});
