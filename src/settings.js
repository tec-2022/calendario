// /src/settings.js
import { supabase } from '/config/supabaseClient.js';

const $ = (sel) => document.querySelector(sel);
const el = (id) => document.getElementById(id);

// Controles
const logoutBtn = el('logoutBtn');
const saveBtn = el('saveSettingsBtn');
const resetBtn = document.querySelector('.btn-secondary'); // el botón "Restablecer"

const fields = {
  profileName: el('profileName'),
  profileAvatar: el('profileAvatar'),
  startDate: el('startDate'),
  prefTheme: el('prefTheme'),
  notifEvents: el('notifEvents'),
  notifTasks: el('notifTasks'),
  notifAnniversaries: el('notifAnniversaries'),
  notifDaily: el('notifDaily'),
};
const saveStatus = el('saveStatus');

// Botones de "Privacidad y seguridad" (son 3 en ese bloque, en orden)
const [changePwdBtn, exportBtn, deleteBtn] = document.querySelectorAll('.space-y-3 button');

let userId = null;
let snapshot = null;

// --- Sesión y botón Salir ---
(async () => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    // si esta página exige login, puedes redirigir:
    // location.href = '/login.html';
  } else {
    userId = session.user.id;
    logoutBtn?.classList.remove('hidden');
  }
  logoutBtn?.addEventListener('click', async () => {
    await supabase.auth.signOut();
    location.href = '/login.html';
  });
})();

// --- Cargar perfil ---
async function loadProfile() {
  if (!userId) return;
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error(error);
  }

  const p = data || {};
  fields.profileName.value = p.full_name ?? '';
  fields.profileAvatar.value = p.avatar_url ?? '';
  fields.startDate.value = p.start_date ?? '';
  fields.prefTheme.value = p.pref_theme ?? 'dark';
  fields.notifEvents.checked = !!p.notif_events;
  fields.notifTasks.checked = !!p.notif_tasks;
  fields.notifAnniversaries.checked = !!p.notif_anniversaries;
  fields.notifDaily.checked = !!p.notif_daily;

  applyTheme(fields.prefTheme.value);
  snapshot = serialize();
}

function serialize() {
  return {
    full_name: fields.profileName.value.trim(),
    avatar_url: fields.profileAvatar.value.trim(),
    start_date: fields.startDate.value || null,
    pref_theme: fields.prefTheme.value,
    notif_events: !!fields.notifEvents.checked,
    notif_tasks: !!fields.notifTasks.checked,
    notif_anniversaries: !!fields.notifAnniversaries.checked,
    notif_daily: !!fields.notifDaily.checked,
  };
}

function paintStatus(ok, msgOk = '✅ Cambios guardados', msgErr = '❌ Error al guardar') {
  if (!saveStatus) return;
  saveStatus.innerHTML = '';
  const icon = document.createElement('i');
  icon.setAttribute('data-feather', ok ? 'check-circle' : 'alert-triangle');
  icon.className = 'w-4 h-4';
  saveStatus.appendChild(icon);
  saveStatus.appendChild(document.createTextNode(' ' + (ok ? msgOk : msgErr)));
  // refresca íconos si es necesario
  if (window.feather?.replace) feather.replace();
}

// --- Guardar ---
saveBtn?.addEventListener('click', async () => {
  if (!userId) return;
  const payload = serialize();
  const { error } = await supabase
    .from('profiles')
    .upsert({ id: userId, ...payload, updated_at: new Date().toISOString() })
    .select()
    .single();

  if (error) {
    console.error(error);
    paintStatus(false);
    return;
  }
  snapshot = serialize();
  paintStatus(true);
});

// --- Restablecer (vuelve a los valores cargados) ---
resetBtn?.addEventListener('click', (e) => {
  e.preventDefault();
  if (!snapshot) return;
  fields.profileName.value = snapshot.full_name ?? '';
  fields.profileAvatar.value = snapshot.avatar_url ?? '';
  fields.startDate.value = snapshot.start_date ?? '';
  fields.prefTheme.value = snapshot.pref_theme ?? 'dark';
  fields.notifEvents.checked = !!snapshot.notif_events;
  fields.notifTasks.checked = !!snapshot.notif_tasks;
  fields.notifAnniversaries.checked = !!snapshot.notif_anniversaries;
  fields.notifDaily.checked = !!snapshot.notif_daily;
  applyTheme(fields.prefTheme.value);
  paintStatus(true, '↩️ Restablecido', 'Error');
});

// --- Tema en vivo ---
fields.prefTheme?.addEventListener('change', (e) => applyTheme(e.target.value));
function applyTheme(theme) {
  const root = document.documentElement;
  if (theme === 'dark') {
    root.classList.add('dark');
  } else if (theme === 'light') {
    root.classList.remove('dark');
  } else {
    // sistema: quita forzado y deja al SO decidir (puedes mejorar con matchMedia)
    root.classList.remove('dark');
  }
}

// --- Cambiar contraseña ---
changePwdBtn?.addEventListener('click', async () => {
  const newPass = prompt('Nueva contraseña (mínimo 6 caracteres):');
  if (!newPass) return;
  if (newPass.length < 6) return alert('La contraseña debe tener al menos 6 caracteres.');
  const { error } = await supabase.auth.updateUser({ password: newPass });
  if (error) return alert('Error: ' + error.message);
  alert('Contraseña actualizada ✔️');
});

// --- Exportar datos ---
exportBtn?.addEventListener('click', async () => {
  if (!userId) return;
  try {
    // Ajusta nombres de tablas si usas otros
    const tables = ['profiles', 'events', 'tasks', 'notes'];
    const dump = { exported_at: new Date().toISOString(), user_id: userId, data: {} };
    for (const t of tables) {
      const { data, error } = await supabase.from(t).select('*');
      dump.data[t] = error ? { error: error.message } : (data || []);
    }
    const blob = new Blob([JSON.stringify(dump, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'couples-calendar-export.json';
    a.click();
    URL.revokeObjectURL(a.href);
  } catch (e) {
    alert('No se pudo exportar: ' + (e.message || e));
  }
});

// --- Eliminar cuenta ---
deleteBtn?.addEventListener('click', async () => {
  if (!userId) return;
  const ok = confirm('¿Seguro que deseas eliminar tu cuenta? Esta acción es permanente.');
  if (!ok) return;

  try {
    // Soft delete en profiles
    await supabase.from('profiles')
      .update({ is_deleted: true, deleted_at: new Date().toISOString() })
      .eq('id', userId);

    // Si desplegaste una Edge Function con service role:
    // await supabase.functions.invoke('delete-user');

    await supabase.auth.signOut();
    alert('Tu cuenta ha sido marcada para eliminación. Sesión cerrada.');
    location.href = '/login.html';
  } catch (e) {
    alert('No se pudo eliminar: ' + (e.message || e));
  }
});

// Carga inicial
document.addEventListener('DOMContentLoaded', loadProfile);
