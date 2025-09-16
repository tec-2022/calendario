// /src/export.js
import { supabase } from '/config/supabaseClient.js';

const BRAND = '#ef476f';
const ACCENT = '#6c5ce7';
const DARK_CARD = '#1a1430';
const DARK_BG = '#0f0b1e';
const TEXT_MUTED = '#cbd5e1';

const btn = document.getElementById('exportPdfBtn');
if (btn) btn.addEventListener('click', handleExportClick);

async function handleExportClick() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      alert('Inicia sesión para exportar tus datos.');
      return;
    }

    const userId = session.user.id;
    // Cargamos todo en paralelo
    const [profileRes, eventsRes, tasksRes, notesRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).single(),
      supabase.from('events').select('*').eq('user_id', userId).order('starts_at', { ascending: true }).limit(200),
      supabase.from('tasks').select('*').eq('user_id', userId).order('created_at', { ascending: true }).limit(300),
      supabase.from('notes').select('id, content, color, created_at').eq('user_id', userId).order('created_at', { ascending: true }).limit(200),
    ]);

    if (profileRes.error) throw profileRes.error;
    if (eventsRes.error) throw eventsRes.error;
    if (tasksRes.error) throw tasksRes.error;
    if (notesRes.error) throw notesRes.error;

    const profile = profileRes.data || {};
    const events = eventsRes.data || [];
    const tasks = tasksRes.data || [];
    const notes = notesRes.data || [];

    const doc = buildDocDefinition({ profile, events, tasks, notes });
    const fileName = `CalendarioDePareja_${formatDateFile(new Date())}.pdf`;
    pdfMake.createPdf(doc).download(fileName);
  } catch (err) {
    console.error(err);
    alert('No se pudo exportar el PDF. Revisa la consola para más detalles.');
  }
}

/* ---------------------- PDF LAYOUT ---------------------- */

function buildDocDefinition({ profile, events, tasks, notes }) {
  const now = new Date();

  // Resúmenes
  const counts = {
    eventos: events.length,
    tareas: tasks.length,
    notas: notes.length,
    tareasPend: tasks.filter(t => t.status === 'pendiente').length,
    tareasProg: tasks.filter(t => t.status === 'progreso').length,
    tareasHechas: tasks.filter(t => t.status === 'hecha').length,
  };

  return {
    pageMargins: [36, 60, 36, 60],
    pageSize: 'A4',
    defaultStyle: {
      font: 'Roboto',
      color: '#e2e8f0', // slate-200
    },
    background: (currentPage, pageSize) => backgroundCanvas(pageSize),
    header: currentPage => ({
      margin: [36, 16, 36, 0],
      columns: [
        {
          text: 'Calendario de Pareja — Exportación',
          style: 'h6',
          color: '#ffffff',
        },
        {
          text: formatDateHuman(now),
          alignment: 'right',
          color: TEXT_MUTED,
        }
      ]
    }),
    footer: (currentPage, pageCount) => ({
      margin: [36, 0, 36, 16],
      columns: [
        {
          canvas: [
            { type: 'rect', x: 0, y: 0, w: 260, h: 2, color: BRAND, opacity: 0.9 },
            { type: 'rect', x: 260, y: 0, w: 120, h: 2, color: ACCENT, opacity: 0.9 },
          ]
        },
        {
          text: `Página ${currentPage} de ${pageCount}`,
          alignment: 'right',
          color: TEXT_MUTED,
          margin: [0, -6, 0, 0],
        }
      ]
    }),
    content: [
      /* Encabezado con datos del perfil */
      sectionCard([
        {
          columns: [
            {
              stack: [
                { text: (profile.full_name || 'Tu Perfil'), style: 'h3', color: '#ffffff' },
                {
                  margin: [0, 4, 0, 0],
                  columns: [
                    chip(`Tema: ${profile.pref_theme || 'dark'}`, ACCENT),
                    chip(`Inicio relación: ${profile.start_date ? formatDateHuman(profile.start_date) : '—'}`, BRAND),
                  ]
                },
                { text: 'Preferencias', style: 'overline', color: TEXT_MUTED, margin: [0, 14, 0, 2] },
                {
                  columns: [
                    bullet(profile.notif_events, 'Recordatorios de eventos'),
                    bullet(profile.notif_tasks, 'Recordatorios de tareas'),
                    bullet(profile.notif_anniversaries, 'Aniversarios especiales'),
                    bullet(profile.notif_daily, 'Resumen diario'),
                  ]
                },
              ],
              width: '*'
            },
            {
              width: 200,
              stack: [
                fancyStat('Eventos', counts.eventos, ACCENT),
                fancyStat('Tareas', counts.tareas, BRAND),
                fancyStat('Notas', counts.notas, '#5ec3ff'),
              ]
            }
          ]
        }
      ], 'Perfil'),

      /* Resumen de tareas */
      sectionCard([
        { text: 'Resumen de Tareas', style: 'h5', color: '#ffffff', margin: [0, 0, 0, 10] },
        {
          columns: [
            miniKPI('Pendiente', counts.tareasPend, '#ef476f'),
            miniKPI('En curso', counts.tareasProg, '#5ec3ff'),
            miniKPI('Hechas', counts.tareasHechas, '#00c853'),
          ]
        },
        { text: 'Detalle', style: 'overline', color: TEXT_MUTED, margin: [0, 10, 0, 6] },
        buildTasksTable(tasks),
      ], 'Tareas'),

      /* Eventos */
      sectionCard([
        { text: 'Eventos', style: 'h5', color: '#ffffff', margin: [0, 0, 0, 10] },
        buildEventsTable(events),
      ], 'Eventos'),

      /* Notas */
      sectionCard([
        { text: 'Notas', style: 'h5', color: '#ffffff', margin: [0, 0, 0, 10] },
        buildNotesTable(notes),
      ], 'Notas'),
    ],
    styles: {
      h3: { fontSize: 20, bold: true },
      h5: { fontSize: 14, bold: true },
      h6: { fontSize: 11, bold: true },
      overline: { fontSize: 9, bold: true, letterSpacing: 0.5 },
      small: { fontSize: 9, color: TEXT_MUTED },
      tableHeader: { bold: true, color: '#ffffff' },
    }
  };
}

/* ---------------------- Helpers de layout ---------------------- */

function backgroundCanvas(pageSize) {
  const W = pageSize.width;
  const H = pageSize.height;
  return [
    // Blobs suaves
    { type: 'ellipse', x: W - 120, y: 60, r1: 160, r2: 100, color: ACCENT, opacity: 0.06 },
    { type: 'ellipse', x: 90, y: H - 90, r1: 190, r2: 120, color: BRAND, opacity: 0.06 },
    // Corazones (texto) muy sutiles
    { text: '♥', fontSize: 60, color: BRAND, opacity: 0.05, absolutePosition: { x: 60, y: 120 } },
    { text: '♥', fontSize: 48, color: ACCENT, opacity: 0.05, absolutePosition: { x: W - 120, y: H - 140 } },
  ];
}

function sectionCard(content, title = '') {
  return {
    margin: [0, 16, 0, 10],
    table: {
      widths: ['*'],
      body: [
        [{
          stack: [
            title ? { text: title.toUpperCase(), style: 'overline', color: TEXT_MUTED, margin: [0, 0, 0, 6] } : null,
            ...content
          ].filter(Boolean)
        }]
      ]
    },
    layout: {
      fillColor: () => DARK_CARD,
      hLineColor: () => DARK_CARD,
      vLineColor: () => DARK_CARD,
      paddingTop: () => 14,
      paddingBottom: () => 14,
      paddingLeft: () => 16,
      paddingRight: () => 16,
    }
  };
}

function chip(text, color) {
  return {
    text,
    margin: [0, 0, 8, 0],
    color: '#ffffff',
    style: 'small',
    decoration: 'none',
    background: '#ffffff11',
    border: [true, true, true, true],
    borderColor: '#ffffff22',
    borderWidth: 1,
    fillColor: '#ffffff10',
    marginRight: 8,
  };
}

function bullet(active, label) {
  return {
    width: 'auto',
    stack: [{
      columns: [
        { text: active ? '●' : '○', color: active ? BRAND : '#64748b', width: 10 },
        { text: label, style: 'small' }
      ],
      margin: [0, 2, 16, 2]
    }]
  };
}

function fancyStat(label, value, color) {
  return {
    margin: [8, 4, 0, 4],
    table: {
      widths: ['*'],
      body: [[
        {
          stack: [
            { text: String(value), color: '#ffffff', fontSize: 24, bold: true, margin: [0, 2, 0, 2] },
            { text: label, style: 'small' }
          ]
        }
      ]]
    },
    layout: {
      fillColor: () => '#ffffff10',
      hLineColor: () => '#ffffff10',
      vLineColor: () => '#ffffff10',
      paddingTop: () => 8,
      paddingBottom: () => 8,
      paddingLeft: () => 10,
      paddingRight: () => 10,
    }
  };
}

function miniKPI(label, value, color) {
  return {
    width: 'auto',
    margin: [0, 0, 12, 0],
    table: {
      widths: ['auto', 'auto'],
      body: [[
        { text: label, style: 'small' },
        { text: String(value), color: color, bold: true, margin: [8, 0, 0, 0] }
      ]]
    },
    layout: 'noBorders'
  };
}

/* ---------------------- Tablas de datos ---------------------- */

function buildEventsTable(events) {
  const header = [
    { text: 'Fecha', style: 'tableHeader' },
    { text: 'Hora', style: 'tableHeader' },
    { text: 'Título', style: 'tableHeader' },
    { text: 'Descripción', style: 'tableHeader' },
  ];

  const body = events.map(ev => ([
    { text: formatDateShort(ev.starts_at), color: '#e2e8f0' },
    { text: formatTime(ev.starts_at, ev.ends_at), color: '#e2e8f0' },
    { text: ev.title || '—', color: '#ffffff' },
    { text: ev.description || '—', color: TEXT_MUTED },
  ]));

  return themedTable([header, ...body]);
}

function buildTasksTable(tasks) {
  const header = [
    { text: 'Estado', style: 'tableHeader' },
    { text: 'Descripción', style: 'tableHeader' },
    { text: 'Creada', style: 'tableHeader' },
    { text: 'Actualizada', style: 'tableHeader' },
  ];

  const body = tasks.map(t => ([
    { text: mapStatus(t.status), color: colorByStatus(t.status) },
    { text: t.description || '—', color: '#e2e8f0' },
    { text: formatDateShort(t.created_at), color: TEXT_MUTED },
    { text: formatDateShort(t.updated_at), color: TEXT_MUTED },
  ]));

  return themedTable([header, ...body]);
}

function buildNotesTable(notes) {
  const header = [
    { text: 'Creada', style: 'tableHeader' },
    { text: 'Nota', style: 'tableHeader' },
    { text: 'Color', style: 'tableHeader' },
  ];

  const body = notes.map(n => ([
    { text: formatDateShort(n.created_at), color: TEXT_MUTED },
    { text: n.content?.slice(0, 200) || '—', color: '#e2e8f0' },
    { text: n.color || '—', color: '#94a3b8' },
  ]));

  return themedTable([header, ...body]);
}

function themedTable(rows) {
  return {
    table: {
      headerRows: 1,
      widths: ['auto', 'auto', '*', '*'],
      body: rows
    },
    layout: {
      fillColor: (rowIndex) => (rowIndex === 0 ? '#ffffff12' : (rowIndex % 2 ? '#ffffff06' : null)),
      hLineColor: () => '#ffffff10',
      vLineColor: () => '#ffffff10',
      paddingTop: () => 8,
      paddingBottom: () => 8,
      paddingLeft: () => 8,
      paddingRight: () => 8,
    }
  };
}

/* ---------------------- Utils ---------------------- */

function mapStatus(s) {
  if (s === 'progreso') return 'En curso';
  if (s === 'hecha') return 'Hecha';
  return 'Pendiente';
}
function colorByStatus(s) {
  if (s === 'progreso') return '#5ec3ff';
  if (s === 'hecha') return '#00c853';
  return '#ef476f';
}

function two(n) { return String(n).padStart(2, '0'); }

function formatDateFile(d) {
  const dt = new Date(d);
  return `${dt.getFullYear()}-${two(dt.getMonth()+1)}-${two(dt.getDate())}`;
}
function formatDateShort(d) {
  const dt = new Date(d);
  return `${two(dt.getDate())}/${two(dt.getMonth()+1)}/${dt.getFullYear()}`;
}
function formatTime(start, end) {
  const s = new Date(start);
  const e = end ? new Date(end) : null;
  const sh = `${two(s.getHours())}:${two(s.getMinutes())}`;
  const eh = e ? `${two(e.getHours())}:${two(e.getMinutes())}` : '';
  return e ? `${sh}–${eh}` : sh;
}
function formatDateHuman(d) {
  const dt = new Date(d);
  const day = two(dt.getDate());
  const monthNames = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
  const mon = monthNames[dt.getMonth()];
  return `${day} ${mon} ${dt.getFullYear()} ${two(dt.getHours())}:${two(dt.getMinutes())}`;
}
