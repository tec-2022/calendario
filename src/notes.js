// /src/notes.js
import { supabase } from '/config/supabaseClient.js';

/* -------------------- DOM refs -------------------- */
const noteMsg   = document.getElementById('noteMsg');
const charCount = document.getElementById('charCount');
const addNoteBtn = document.getElementById('addNoteBtn');
const notesList = document.getElementById('notesList');
const emptyState = document.getElementById('emptyState');
const logoutBtn = document.getElementById('logoutBtn');

/* -------------------- Init -------------------- */
function start() {
  // Mostrar botón "Salir" si hay sesión
  supabase.auth.getSession().then(({ data: { session } }) => {
    if (session) logoutBtn?.classList?.remove('hidden');
  });

  // Contador de caracteres
  if (noteMsg && charCount) {
    charCount.textContent = `${noteMsg.value.length}/200`;
    noteMsg.addEventListener('input', () => {
      charCount.textContent = `${noteMsg.value.length}/200`;
    });
    noteMsg.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') addNote();
    });
  }

  // Botón agregar
  addNoteBtn?.addEventListener('click', addNote);

  // Delegación para acciones en la lista (eliminar)
  notesList?.addEventListener('click', onListClick);

  // AOS / Feather
  try { AOS?.init?.({ duration: 800, once: true, offset: 100 }); } catch {}
  try { feather?.replace?.(); } catch {}

  loadNotes();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', start);
} else {
  start();
}

/* -------------------- Helpers -------------------- */
const escapeHTML = (str = '') =>
  str.replace(/&/g, '&amp;')
     .replace(/</g, '&lt;')
     .replace(/>/g, '&gt;')
     .replace(/"/g, '&quot;')
     .replace(/'/g, '&#39;');

function showEmptyState() {
  emptyState?.classList?.remove('hidden');
}
function hideEmptyState() {
  emptyState?.classList?.add('hidden');
}

/* -------------------- CRUD -------------------- */
async function loadNotes() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { data: notes, error } = await supabase
    .from('notes')
    .select('id, message, created_at, user_id, partner_id')
    .or(`user_id.eq.${user.id},partner_id.eq.${user.id}`)
    .order('created_at', { ascending: false });

  if (error) { console.error('Error loading notes:', error); return; }
  renderNotes(notes ?? []);
}

function renderNotes(list) {
  if (!notesList) return;

  // Limpia solo tarjetas previas (conserva emptyState)
  [...notesList.querySelectorAll('.note-card')].forEach(el => el.remove());

  if (!list.length) {
    showEmptyState();
    return;
  }
  hideEmptyState();

  const frag = document.createDocumentFragment();

  list.forEach(note => {
    const safeMsg = escapeHTML(note.message ?? '');
    const fecha = new Date(note.created_at).toLocaleString('es-ES', {
      year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });

    const card = document.createElement('div');
    card.className = 'note-card fade-in-up';
    card.dataset.id = note.id;

    card.innerHTML = `
      <div class="note-content">${safeMsg}</div>
      <div class="note-meta">
        <span>${fecha}</span>
        <div class="note-actions">
          <button class="action-btn" data-action="delete" data-id="${note.id}" title="Eliminar">
            <i data-feather="trash-2" class="w-4 h-4"></i>
          </button>
        </div>
      </div>
    `;
    frag.appendChild(card);
  });

  notesList.appendChild(frag);

  // Reemplaza iconos feather recién agregados
  try { feather?.replace?.(); } catch {}
}

async function addNote() {
  if (!noteMsg) return;
  const message = noteMsg.value.trim();
  if (!message) return;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  // Busca partner_id (puede ser null)
  const { data: profile, error: pErr } = await supabase
    .from('profiles')
    .select('partner_id')
    .eq('id', user.id)
    .single();

  if (pErr && pErr.code !== 'PGRST116') {
    // Ignora "No rows returned" pero loguea otros errores
    console.error('Error fetching profile:', pErr);
  }

  const { error } = await supabase
    .from('notes')
    .insert({
      message,
      user_id: user.id,
      partner_id: profile?.partner_id ?? null
    });

  if (error) { console.error('Error adding note:', error); return; }

  noteMsg.value = '';
  if (charCount) charCount.textContent = '0/200';
  loadNotes();
}

async function deleteNote(id) {
  const { error } = await supabase.from('notes').delete().eq('id', id);
  if (error) { console.error('Error deleting note:', error); return; }

  // Quita la tarjeta del DOM sin recargar todo
  const card = notesList?.querySelector(`.note-card[data-id="${id}"]`);
  card?.remove();

  // Si ya no hay tarjetas, muestra estado vacío
  if (!notesList?.querySelector('.note-card')) showEmptyState();
}

function onListClick(e) {
  const btn = e.target.closest('[data-action="delete"]');
  if (!btn) return;
  const id = btn.getAttribute('data-id');
  if (id) deleteNote(id);
}

/* Si prefieres usar onclick="deleteNote('id')" en HTML, expón la función:
   window.deleteNote = deleteNote;
*/