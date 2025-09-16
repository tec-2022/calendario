import { supabase } from '/config/supabaseClient.js';
const cols = { pendiente: document.getElementById('col-pendiente'), progreso: document.getElementById('col-progreso'), hecha: document.getElementById('col-hecha') };
const addBtn = document.getElementById('addTaskBtn'); const descEl = document.getElementById('taskDesc'); const progress = document.getElementById('taskProgress');

async function user(){ const { data:{user} } = await supabase.auth.getUser(); return user; }

async function render(){
  const u = await user(); if (!u || !cols.pendiente) return;
  const { data, error } = await supabase.from('tasks').select('*').eq('user_id', u.id).order('created_at',{ascending:true});
  if (error){ console.error(error); return; }
  Object.values(cols).forEach(c=> c.innerHTML='');
  let done=0;
  (data||[]).forEach(t=>{ const card=document.createElement('div'); card.className='task-card'; card.draggable=true; card.dataset.id=t.id; card.innerHTML=`<div class="flex items-center gap-2"><input type="checkbox" ${t.completed?'checked':''} data-id="${t.id}" class="h-4 w-4"><span class="${t.completed?'line-through text-white/50':''}">${t.description}</span></div>`; cols[t.status||'pendiente'].appendChild(card); if(t.completed) done++; });
  const total=(data||[]).length||1; if(progress) progress.textContent=`Progreso: ${done}/{total} (${Math.round(done*100/total)}%)`.replace('{total}', total);
}
addBtn?.addEventListener('click', async ()=>{ const u=await user(); if(!u) return; const d=(descEl.value||'').trim(); if(!d) return; const { error } = await supabase.from('tasks').insert([{ user_id:u.id, description:d, status:'pendiente', completed:false }]); if(error) return alert(error.message); descEl.value=''; });
Object.values(cols).forEach(col=>{ col?.addEventListener('dragover', e=>e.preventDefault()); col?.addEventListener('drop', async e=>{ const id=e.dataTransfer.getData('id'); const { error } = await supabase.from('tasks').update({ status: col.id.replace('col-','') }).eq('id', id); if(error) alert(error.message); }); });
document.addEventListener('dragstart', e=>{ const card=e.target.closest('task-card, .task-card'); if(card){ e.dataTransfer.setData('id', card.dataset.id); }});
document.addEventListener('change', async (e)=>{ if(e.target.type==='checkbox'){ const { error } = await supabase.from('tasks').update({ completed:e.target.checked }).eq('id', e.target.dataset.id); if(error) alert(error.message); }});
supabase.channel('tasks-rt').on('postgres_changes',{event:'*',schema:'public',table:'tasks'},render).subscribe();
render();
