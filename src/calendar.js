import { supabase } from '/config/supabaseClient.js';

const list = document.getElementById('eventsList');
const upcoming = document.getElementById('upcomingList');
const addBtn = document.getElementById('addEventBtn');
const titleEl = document.getElementById('eventTitle');
const dateEl = document.getElementById('eventDate');
const catEl = document.getElementById('eventCategory');

async function getUser(){ const { data:{user} } = await supabase.auth.getUser(); return user; }

async function render(){
  const user = await getUser(); if (!user || !list) return;
  const { data, error } = await supabase.from('events').select('*').eq('user_id', user.id).order('date', {ascending:true});
  if (error){ console.error(error); return; }
  list.innerHTML=''; if (upcoming) upcoming.innerHTML='';
  const now = Date.now();
  (data||[]).forEach(ev=>{
    const li = document.createElement('li');
    li.className = 'py-2 flex items-center justify-between';
    li.innerHTML = `<div class="flex items-center gap-3"><span class="chip">${iconFor(ev.category)} ${ev.title}</span><span class="text-xs text-white/70">${new Date(ev.date).toLocaleString()}</span></div>
    <div class="flex gap-2"><button data-id="${ev.id}" data-a="edit" class="btn-secondary btn-sm">Editar</button><button data-id="${ev.id}" data-a="del" class="btn-rose btn-sm">Eliminar</button></div>`;
    list.appendChild(li);
    if (upcoming && new Date(ev.date).getTime() > now){
      const up = document.createElement('li'); up.className='note'; up.innerHTML = `<strong>${ev.title}</strong><div class="text-xs text-white/70">${new Date(ev.date).toLocaleString()}</div>`; upcoming.appendChild(up);
    }
  });
}

addBtn?.addEventListener('click', async ()=>{
  const user = await getUser(); if (!user) return;
  if (!titleEl.value || !dateEl.value) return alert('Completa título y fecha');
  const { error } = await supabase.from('events').insert([{ user_id: user.id, title: titleEl.value, date: dateEl.value, category: catEl.value }]);
  if (error) return alert(error.message);
  titleEl.value=''; render();
});

list?.addEventListener('click', async (e)=>{
  const btn = e.target.closest('button'); if (!btn) return;
  const id = btn.dataset.id; const a = btn.dataset.a;
  if (a==='del'){ const { error } = await supabase.from('events').delete().eq('id', id); if(error) alert(error.message); }
  if (a==='edit'){ const t = prompt('Nuevo título'); if (t){ const { error } = await supabase.from('events').update({ title: t }).eq('id', id); if(error) alert(error.message); } }
});

supabase.channel('events-rt').on('postgres_changes', {event:'*', schema:'public', table:'events'}, render).subscribe();
render();

function iconFor(cat){ return {cita:'💕', aniversario:'🎂', viaje:'✈️', pago:'💳'}[cat] || '📌'; }
