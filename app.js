// ============================================================================
// ALACANTINAPP V3 - LÓGICA PRINCIPAL Y GESTIÓN DE LIBRO GENEALÓGICO (app.js)
// Libro Genealógico Oficial ESGA025 (CNZ) - Club Gallina Alacantina
// ============================================================================

// --- CONFIGURACIÓN SUPABASE ---
const SUPABASE_URL = 'https://htbyipavphxcehdwrjbl.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0YnlpcGF2cGh4Y2VoZHdyamJsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEwMjQyOTEsImV4cCI6MjEwNjYwMDI5MX0.tnBJERxhI3YbwSOFVkeBvvz5qm6FNxzBZ8_5S-UKoQM';
let supabaseClient = null;

if (window.supabase) {
  supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

// --- ESTADO GLOBAL DE LA APLICACIÓN ---
let state = {
  animals: [],
  breeders: [],
  vaccines: [],
  losses: [],
  user: null,
  filters: {
    search: '',
    variety: 'all',
    sex: 'all',
    status: 'active'
  }
};

// ============================================================================
// 1. AUTENTICACIÓN Y CONTROL DE SESIÓN (CORREGIDO PARA OCULTAR LOGIN)
// ============================================================================
async function handleAuth(event) {
  if (event) event.preventDefault();

  const emailInput = document.getElementById('login-email');
  const passwordInput = document.getElementById('login-password');

  if (!emailInput || !passwordInput) {
    alert('No se encontraron los campos del formulario de acceso.');
    return;
  }

  const email = emailInput.value.trim();
  const password = passwordInput.value;

  if (!email || !password) {
    alert('Por favor, introduce tu correo electrónico y contraseña.');
    return;
  }

  if (!supabaseClient) {
    alert('Error: El cliente de Supabase no se ha inicializado.');
    return;
  }

  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email: email,
    password: password
  });

  if (error) {
    alert('Error de acceso: ' + error.message);
    console.error('Error Supabase Auth:', error);
  } else {
    state.user = data.user;
    updateAuthUI(true, data.user.email);
    await loadAllData();
  }
}

async function checkSession() {
  if (!supabaseClient) return;
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (session) {
    state.user = session.user;
    updateAuthUI(true, session.user.email);
    await loadAllData();
  } else {
    updateAuthUI(false);
  }
}

function updateAuthUI(isAuthenticated, userEmail = '') {
  const appContent = document.getElementById('app-content');
  const landingLogin = document.getElementById('landing-login');
  const authState = document.getElementById('auth-state');
  const authIndicator = document.getElementById('auth-indicator');
  const btnAuth = document.getElementById('btn-auth');

  if (isAuthenticated) {
    if (appContent) appContent.classList.remove('hidden');
    if (landingLogin) landingLogin.classList.add('hidden'); // OCULTA LA PANTALLA DE LOGIN
    if (authState) authState.textContent = userEmail;
    if (authIndicator) authIndicator.className = 'w-2 h-2 rounded-full bg-green-500';
    if (btnAuth) {
      btnAuth.textContent = 'Cerrar Sesión';
      btnAuth.onclick = logout;
    }
  } else {
    if (appContent) appContent.classList.add('hidden');
    if (landingLogin) landingLogin.classList.remove('hidden'); // MUESTRA LA PANTALLA DE LOGIN
    if (authState) authState.textContent = 'Sesión no iniciada';
    if (authIndicator) authIndicator.className = 'w-2 h-2 rounded-full bg-yellow-500';
    if (btnAuth) {
      btnAuth.textContent = 'Entrar';
      btnAuth.onclick = () => window.location.reload();
    }
  }
}

async function logout() {
  if (supabaseClient) {
    await supabaseClient.auth.signOut();
  }
  state.user = null;
  window.location.reload();
}

// ============================================================================
// 2. NAVEGACIÓN POR PESTAÑAS (CORREGIDO PARA CAMBIAR VISTAS)
// ============================================================================
function switchTab(tabId) {
  // Ocultar todas las secciones principales
  const sections = ['sec-registro', 'sec-censo', 'sec-informes', 'sec-estandar', 'sec-gestion'];
  sections.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.add('hidden');
  });

  // Mostrar la sección seleccionada
  const activeSection = document.getElementById(`sec-${tabId}`);
  if (activeSection) activeSection.classList.remove('hidden');

  // Actualizar estilos de botones de escritorio
  const tabs = ['registro', 'censo', 'informes', 'estandar', 'gestion'];
  tabs.forEach(id => {
    const btn = document.getElementById(`tab-${id}`);
    if (btn) {
      if (id === tabId) {
        btn.className = "py-3 px-4 text-amber-400 border-b-2 border-amber-400 font-medium touch-target flex items-center gap-2";
      } else {
        btn.className = "py-3 px-4 text-slate-400 border-b-2 border-transparent font-medium touch-target flex items-center gap-2";
      }
    }
  });

  // Actualizar estilos de botones móviles
  tabs.forEach(id => {
    const mobBtn = document.getElementById(`mob-${id}`);
    if (mobBtn) {
      if (id === tabId) {
        mobBtn.className = "flex flex-col items-center gap-1 text-amber-400 py-1 px-2 text-[11px] font-medium transition-colors";
      } else {
        mobBtn.className = "flex flex-col items-center gap-1 text-slate-400 hover:text-amber-400 py-1 px-2 text-[11px] font-medium transition-colors";
      }
    }
  });
}

// ============================================================================
// 3. CARGA Y SINCRONIZACIÓN DE DATOS (SUPABASE + LOCALSTORAGE)
// ============================================================================
async function loadAllData() {
  try {
    if (navigator.onLine && supabaseClient) {
      const [resAnimals, resBreeders, resVaccines, resLosses] = await Promise.all([
        supabaseClient.from('animals').select('*').order('created_at', { ascending: false }),
        supabaseClient.from('breeders').select('*').order('code', { ascending: true }),
        supabaseClient.from('vaccines').select('*').order('date', { ascending: false }),
        supabaseClient.from('losses').select('*').order('date', { ascending: false })
      ]);

      if (resAnimals.data) state.animals = resAnimals.data;
      if (resBreeders.data) state.breeders = resBreeders.data;
      if (resVaccines.data) state.vaccines = resVaccines.data;
      if (resLosses.data) state.losses = resLosses.data;

      localStorage.setItem('alacantin_animals', JSON.stringify(state.animals));
      localStorage.setItem('alacantin_breeders', JSON.stringify(state.breeders));
      localStorage.setItem('alacantin_vaccines', JSON.stringify(state.vaccines));
      localStorage.setItem('alacantin_losses', JSON.stringify(state.losses));

      const offlineBadge = document.getElementById('offline-badge');
      if (offlineBadge) offlineBadge.classList.add('hidden');
    } else {
      state.animals = JSON.parse(localStorage.getItem('alacantin_animals') || '[]');
      state.breeders = JSON.parse(localStorage.getItem('alacantin_breeders') || '[]');
      state.vaccines = JSON.parse(localStorage.getItem('alacantin_vaccines') || '[]');
      state.losses = JSON.parse(localStorage.getItem('alacantin_losses') || '[]');

      const offlineBadge = document.getElementById('offline-badge');
      if (offlineBadge) offlineBadge.classList.remove('hidden');
    }
    renderAll();
  } catch (err) {
    console.error('Error al sincronizar datos:', err);
  }
}

// ============================================================================
// 4. REGISTRO Y GUARDADO DE DATOS (CRUD)
// ============================================================================
async function guardarEjemplar(event) {
  if (event) event.preventDefault();

  const ring = document.getElementById('anilla')?.value.trim();
  const variety = document.getElementById('variedad')?.value;
  const sex = document.getElementById('sexo')?.value;
  const birthDate = document.getElementById('fecha_nacimiento')?.value;
  const weight = document.getElementById('peso')?.value;
  const section = document.getElementById('seccion_libro')?.value;
  const sire = document.getElementById('padre')?.value.trim();
  const dam = document.getElementById('madre')?.value.trim();
  const germoplasm = document.getElementById('banco_germoplasma')?.value;
  const notes = document.getElementById('observaciones')?.value;

  if (!ring) {
    alert('La anilla oficial es obligatoria.');
    return;
  }

  const newAnimal = {
    ring_number: ring,
    variety: variety || 'Milflores',
    sex: sex || 'M',
    birth_date: birthDate || null,
    weight: weight || null,
    section: section || 'Registro Nacimientos',
    sire_ring: sire || null,
    dam_ring: dam || null,
    germoplasm: germoplasm || 'No',
    notes: notes || '',
    status: 'active'
  };

  if (navigator.onLine && supabaseClient) {
    const { error } = await supabaseClient.from('animals').upsert([newAnimal]);
    if (error) {
      alert('Error al guardar en Supabase: ' + error.message);
      return;
    }
  }

  const index = state.animals.findIndex(a => a.ring_number === ring);
  if (index >= 0) {
    state.animals[index] = newAnimal;
  } else {
    state.animals.unshift(newAnimal);
  }

  localStorage.setItem('alacantin_animals', JSON.stringify(state.animals));
  alert('Ejemplar guardado correctamente en el Libro Genealógico.');
  limpiarFormulario();
  renderAll();
}

function limpiarFormulario() {
  const form = document.getElementById('form-ejemplar');
  if (form) form.reset();
}

// ============================================================================
// 5. CÁLCULOS GENEALÓGICOS Y CONSANGUINIDAD (WRIGHT COMPLETO)
// ============================================================================
function getAncestors(ringNumber, depth = 3) {
  if (!ringNumber || depth === 0) return null;
  const animal = state.animals.find(a => a.ring_number === ringNumber);
  if (!animal) return { ring_number: ringNumber, sire: null, dam: null };

  return {
    ...animal,
    sire: getAncestors(animal.sire_ring, depth - 1),
    dam: getAncestors(animal.dam_ring, depth - 1)
  };
}

function calculateWrightInbreeding(sireRing, damRing) {
  if (!sireRing || !damRing) return 0;

  const getAncestorPaths = (ring, currentPath = [], allPaths = []) => {
    const animal = state.animals.find(a => a.ring_number === ring);
    if (!animal) return allPaths;

    const newPath = [...currentPath, ring];
    allPaths.push(newPath);

    if (animal.sire_ring) getAncestorPaths(animal.sire_ring, newPath, allPaths);
    if (animal.dam_ring) getAncestorPaths(animal.dam_ring, newPath, allPaths);
    return allPaths;
  };

  const sirePaths = getAncestorPaths(sireRing);
  const damPaths = getAncestorPaths(damRing);
  let totalFx = 0;

  sirePaths.forEach(sPath => {
    const commonAncestor = sPath[sPath.length - 1];
    damPaths.forEach(dPath => {
      if (dPath[dPath.length - 1] === commonAncestor) {
        const n1 = sPath.length - 1;
        const n2 = dPath.length - 1;
        totalFx += Math.pow(0.5, n1 + n2 + 1);
      }
    });
  });

  return Math.min(totalFx * 100, 100);
}

// ============================================================================
// 6. RENDERIZADO DE TABLAS Y VISTAS
// ============================================================================
function renderAll() {
  renderAnimalsTable();
}

function renderAnimalsTable() {
  const tbody = document.getElementById('tabla-ejemplares');
  if (!tbody) return;

  tbody.innerHTML = state.animals.map(a => `
    <tr class="hover:bg-slate-700/50">
      <td class="p-4 font-bold text-amber-400">${a.ring_number}</td>
      <td class="p-4">${a.sex === 'M' ? '♂ Macho' : '♀ Hembra'}</td>
      <td class="p-4">${a.variety || 'Milflores'}</td>
      <td class="p-4">${a.birth_date || '-'}</td>
      <td class="p-4">${a.section || 'Nacimientos'}</td>
      <td class="p-4 flex gap-2">
        <button onclick="generatePedigreePDF('${a.ring_number}')" class="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded text-xs">Pedigrí</button>
      </td>
    </tr>
  `).join('');
}

// ============================================================================
// 7. GENERACIÓN DE CERTIFICADOS Y PDFS
// ============================================================================
function generatePedigreePDF(ringNumber) {
  const animal = state.animals.find(a => a.ring_number === ringNumber);
  if (!animal) {
    alert('Ejemplar no encontrado.');
    return;
  }

  const tree = getAncestors(ringNumber, 3);
  const inbreeding = calculateWrightInbreeding(animal.sire_ring, animal.dam_ring);

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  doc.setFillColor(30, 41, 59);
  doc.rect(0, 0, 210, 35, 'F');

  doc.setFontSize(16);
  doc.setTextColor(245, 158, 11);
  doc.text('CLUB GALLINA ALACANTINA', 14, 18);

  doc.setFontSize(10);
  doc.setTextColor(203, 213, 225);
  doc.text('Libro Genealógico Oficial ESGA025 - Certificado de Pedigrí', 14, 26);

  doc.autoTable({
    startY: 42,
    head: [['Dato Oficial', 'Detalle del Ejemplar']],
    body: [
      ['Anilla Oficial', animal.ring_number],
      ['Variedad / Capa', animal.variety || 'Milflores'],
      ['Sexo', animal.sex === 'M' ? 'Macho (1.0)' : 'Hembra (0.1)'],
      ['Fecha Nacimiento', animal.birth_date || 'No registrada'],
      ['Coef. Consanguinidad (Wright)', `${inbreeding.toFixed(2)}%`],
      ['Sección del Libro', animal.section || 'Nacimientos']
    ],
    theme: 'striped',
    headStyles: { fillColor: [217, 119, 6] }
  });

  doc.save(`Pedigri_ESGA025_${animal.ring_number}.pdf`);
}

function filtrarInformesCNZ() {
  const resultado = document.getElementById('resultado-informe');
  if (resultado) {
    resultado.innerHTML = `<div class="p-4 bg-slate-800 rounded-lg border border-slate-700 text-slate-200">
      <h3 class="font-bold text-amber-400 mb-2">Informe Zootécnico Generado</h3>
      <p class="text-sm">Total de ejemplares activos en censo: <strong>${state.animals.length}</strong></p>
    </div>`;
  }
}

// GPS Ubicación
function obtenerUbicacionGPS() {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(position => {
      const lat = position.coords.latitude.toFixed(6);
      const lon = position.coords.longitude.toFixed(6);
      const gpsInput = document.getElementById('criador_gps');
      if (gpsInput) gpsInput.value = `${lat}, ${lon}`;
    }, () => {
      alert('No se pudo obtener la ubicación GPS.');
    });
  } else {
    alert('La geolocalización no es compatible en este navegador.');
  }
}

function actualizarPesoPorDefecto() {
  const sexo = document.getElementById('sexo')?.value;
  const peso = document.getElementById('peso');
  if (peso) {
    peso.value = sexo === 'M' ? '3500' : '2500';
  }
}

// ============================================================================
// 8. INICIALIZACIÓN GLOBAL
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {
  console.log('AlacantinApp v3 - Sistema Inicializado Correctamente.');
  checkSession();
});
