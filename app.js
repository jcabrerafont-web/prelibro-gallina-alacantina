// Lógica principal de AlacantinApp y Estado de la Aplicación

// Configuración de Supabase
const SUPABASE_URL = 'https://tu-proyecto.supabase.co';
const SUPABASE_ANON_KEY = 'tu-anon-key';
let supabase = null;

if (SUPABASE_URL !== 'https://tu-proyecto.supabase.co') {
  supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

// Censo local inicial
let ejemplares = [
  {
    anilla: "E 0001",
    sexo: "M",
    variedad: "Apercada",
    anyo: "2025",
    peso: "3250",
    estado: "Apto",
    padre: "E 0000",
    madre: "E 0000",
    observaciones: "Gallo fundador. Excelente cresta y tarsos amarillos limpios.",
    criador: "José Joaquín Cabrera Font",
    rega: "ES030410000123",
    socio: "Nº 001"
  }
];

// Actualizar peso sugerido según el sexo
function actualizarPesoPorDefecto() {
  const sexo = document.getElementById('sexo').value;
  const inputPeso = document.getElementById('peso');
  if (sexo === 'M') {
    inputPeso.value = 3250;
  } else if (sexo === 'H') {
    inputPeso.value = 2400;
  }
}

// Navegación por pestañas
function switchTab(tab) {
  const tabs = ['registro', 'censo', 'informes', 'estandar', 'gestion'];
  tabs.forEach(t => {
    const sec = document.getElementById(`sec-${t}`);
    const tabBtn = document.getElementById(`tab-${t}`);
    const mobBtn = document.getElementById(`mob-${t}`);

    if (sec) sec.classList.add('hidden');
    if (tabBtn) {
      tabBtn.classList.remove('text-amber-400', 'border-amber-400');
      tabBtn.classList.add('text-slate-400', 'border-transparent');
    }
    if (mobBtn) {
      mobBtn.classList.remove('text-amber-400');
      mobBtn.classList.add('text-slate-400');
    }
  });

  const activeSec = document.getElementById(`sec-${tab}`);
  const activeTabBtn = document.getElementById(`tab-${tab}`);
  const activeMobBtn = document.getElementById(`mob-${tab}`);

  if (activeSec) activeSec.classList.remove('hidden');
  if (activeTabBtn) {
    activeTabBtn.classList.add('text-amber-400', 'border-amber-400');
    activeTabBtn.classList.remove('text-slate-400', 'border-transparent');
  }
  if (activeMobBtn) {
    activeMobBtn.classList.add('text-amber-400');
    activeMobBtn.classList.remove('text-slate-400');
  }
}

// Modal de Login y Autenticación
function toggleAuthModal() {
  const modal = document.getElementById('modal-auth');
  modal.classList.toggle('hidden');
}

function handleAuth(e) {
  e.preventDefault();
  document.getElementById('auth-indicator').className = "w-2 h-2 rounded-full bg-green-500";
  document.getElementById('auth-state').innerText = "Socio Autenticado";
  document.getElementById('btn-auth').innerText = "Salir";
  toggleAuthModal();
}

// Limpiar campos del formulario
function limpiarFormulario() {
  document.getElementById('form-ejemplar').reset();
  document.getElementById('sexo').value = 'M';
  actualizarPesoPorDefecto();
  document.getElementById('anilla').placeholder = "E 0000";
  document.getElementById('padre').placeholder = "E 0000";
  document.getElementById('madre').placeholder = "E 0000";
}

// Guardar / Editar Ejemplar
function guardarEjemplar(e) {
  e.preventDefault();
  
  const nuevo = {
    anilla: document.getElementById('anilla').value.trim().toUpperCase(),
    sexo: document.getElementById('sexo').value,
    variedad: document.getElementById('variedad').value,
    anyo: document.getElementById('anyo').value,
    peso: document.getElementById('peso').value,
    estado: document.getElementById('estado').value,
    padre: document.getElementById('padre').value.trim().toUpperCase() || 'E 0000',
    madre: document.getElementById('madre').value.trim().toUpperCase() || 'E 0000',
    observaciones: document.getElementById('observaciones').value.trim(),
    criador: document.getElementById('criador_nombre').value.trim() || 'Criador Sin Registrar',
    rega: document.getElementById('criador_rega').value.trim() || 'Sin REGA',
    socio: document.getElementById('criador_socio').value.trim() || 'N/A'
  };

  const idx = ejemplares.findIndex(item => item.anilla === nuevo.anilla);
  if (idx >= 0) {
    ejemplares[idx] = nuevo;
  } else {
    ejemplares.push(nuevo);
  }

  renderCenso();
  limpiarFormulario();
  switchTab('censo');
}

// Renderizar Tabla de Censo
function renderCenso() {
  const tbody = document.getElementById('tabla-ejemplares');
  tbody.innerHTML = '';

  if (ejemplares.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="p-4 text-center text-slate-500">No hay ejemplares registrados en el censo.</td></tr>`;
    return;
  }

  ejemplares.forEach(item => {
    const tr = document.createElement('tr');
    tr.className = 'border-b border-slate-700 hover:bg-slate-800/50';
    
    let badge = 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
    if (item.estado === 'Apto') badge = 'bg-green-500/10 text-green-500 border-green-500/20';
    if (item.estado === 'No Apto') badge = 'bg-red-500/10 text-red-500 border-red-500/20';

    tr.innerHTML = `
      <td class="p-4 font-bold text-amber-400">${item.anilla}</td>
      <td class="p-4">${item.sexo === 'M' ? 'Gallo ♂' : 'Gallina ♀'}</td>
      <td class="p-4">${item.variedad}</td>
      <td class="p-4">${item.anyo}</td>
      <td class="p-4">${item.peso} g</td>
      <td class="p-4">
        <span class="px-2.5 py-1 text-xs rounded-full border ${badge}">
          ${item.estado}
        </span>
      </td>
      <td class="p-4 text-right space-x-2">
        <button onclick="exportarFichaPDF('${item.anilla}')" class="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-xs rounded text-amber-400 border border-slate-600 touch-target">
          📄 PDF
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// Generar Informes Filtrados en pantalla
function filtrarInformes() {
  const est = document.getElementById('filtro-estado').value;
  const varPluma = document.getElementById('filtro-variedad').value;

  const filtrados = ejemplares.filter(e => {
    const matchEst = est === 'Todos' || e.estado === est;
    const matchVar = varPluma === 'Todas' || e.variedad === varPluma;
    return matchEst && matchVar;
  });

  const container = document.getElementById('resultado-informe');
  if (filtrados.length === 0) {
    container.innerHTML = `<div class="p-4 bg-slate-800 rounded-lg border border-slate-700 text-slate-400 text-center text-sm">No se encontraron ejemplares con los filtros seleccionados.</div>`;
    return;
  }

  let html = `<div class="bg-slate-800 p-6 rounded-xl border border-slate-700 space-y-4 print-card">
    <div class="border-b border-slate-700 pb-3">
      <h3 class="font-bold text-amber-400 text-lg">Informe de Revisión Pre-Libro ESGA025</h3>
      <p class="text-xs text-slate-400">Filtros: Estado [${est}] | Variedad [${varPluma}] - Total: ${filtrados.length} ejemplares</p>
    </div>
    <div class="space-y-3">`;

  filtrados.forEach(f => {
    html += `
      <div class="p-3 bg-slate-900 rounded-lg border border-slate-700 text-xs flex justify-between items-center">
        <div>
          <span class="font-bold text-amber-400 text-sm">${f.anilla}</span> - ${f.sexo === 'M' ? 'Macho' : 'Hembra'} | ${f.variedad} | ${f.anyo} | ${f.peso} g
          <div class="text-slate-400 mt-1">Criador: ${f.criador} (${f.socio}) - REGA: ${f.rega}</div>
        </div>
        <span class="px-2 py-1 rounded border ${f.estado === 'Apto' ? 'border-green-500 text-green-400' : 'border-yellow-500 text-yellow-400'}">${f.estado}</span>
      </div>
    `;
  });

  html += `</div></div>`;
  container.innerHTML = html;
}

// Inicialización al cargar el documento
document.addEventListener('DOMContentLoaded', () => {
  renderCenso();
});
