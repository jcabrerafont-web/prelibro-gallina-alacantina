// ============================================================================
// ALACANTINAPP V3 - LÓGICA PRINCIPAL Y GESTIÓN DE LIBRO GENEALÓGICO (app.js)
// Libro Genealógico Oficial ESGA025 (CNZ) - Club Gallina Alacantina
// ============================================================================

// --- CONFIGURACIÓN SUPABASE ---
const SUPABASE_URL = 'https://xyzcompany.supabase.co'; // Sustituir por la URL de tu proyecto Supabase
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'; // Sustituir por tu Anon Key de Supabase

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
// 1. AUTENTICACIÓN Y CONTROL DE SESIÓN
// ============================================================================

async function handleAuth(event) {
  if (event) event.preventDefault(); // OBLIGATORIO: Evita recarga y la '?' en la URL

  const emailInput = document.getElementById('email') || document.querySelector('input[type="email"]');
  const passwordInput = document.getElementById('password') || document.querySelector('input[type="password"]');

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
  const authState = document.getElementById('auth-state');
  const authIndicator = document.getElementById('auth-indicator');
  const btnAuth = document.getElementById('btn-auth');

  if (isAuthenticated) {
    if (appContent) appContent.classList.remove('hidden');
    if (authState) authState.textContent = userEmail;
    if (authIndicator) {
      authIndicator.className = 'w-2 h-2 rounded-full bg-green-500';
    }
    if (btnAuth) {
      btnAuth.textContent = 'Cerrar Sesión';
      btnAuth.onclick = logout;
    }
  } else {
    if (authState) authState.textContent = 'Sesión no iniciada';
    if (authIndicator) {
      authIndicator.className = 'w-2 h-2 rounded-full bg-yellow-500';
    }
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
// 2. CARGA Y SINCRONIZACIÓN DE DATOS (SUPABASE + LOCALSTORAGE)
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

      // Actualizar caché offline
      localStorage.setItem('alacantin_animals', JSON.stringify(state.animals));
      localStorage.setItem('alacantin_breeders', JSON.stringify(state.breeders));
      localStorage.setItem('alacantin_vaccines', JSON.stringify(state.vaccines));
      localStorage.setItem('alacantin_losses', JSON.stringify(state.losses));

      const offlineBadge = document.getElementById('offline-badge');
      if (offlineBadge) offlineBadge.classList.add('hidden');
    } else {
      // Cargar desde caché en modo offline
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
// 3. REGISTRO Y GUARDADO DE DATOS (CRUD)
// ============================================================================

async function saveAnimal(event) {
  if (event) event.preventDefault();

  const ring = document.getElementById('animal-ring')?.value.trim();
  const variety = document.getElementById('animal-variety')?.value;
  const sex = document.getElementById('animal-sex')?.value;
  const birthDate = document.getElementById('animal-birth')?.value;
  const sire = document.getElementById('animal-sire')?.value.trim();
  const dam = document.getElementById('animal-dam')?.value.trim();
  const breederCode = document.getElementById('animal-breeder')?.value;
  const notes = document.getElementById('animal-notes')?.value;

  if (!ring) {
    alert('La anilla oficial es obligatoria.');
    return;
  }

  const newAnimal = {
    ring_number: ring,
    variety: variety || 'Milflores',
    sex: sex || 'M',
    birth_date: birthDate || null,
    sire_ring: sire || null,
    dam_ring: dam || null,
    breeder_code: breederCode || null,
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
  closeModal('modal-animal');
  renderAll();
}

async function saveBreeder(event) {
  if (event) event.preventDefault();

  const code = document.getElementById('breeder-code')?.value.trim();
  const name = document.getElementById('breeder-name')?.value.trim();
  const location = document.getElementById('breeder-location')?.value.trim();
  const phone = document.getElementById('breeder-phone')?.value.trim();

  if (!code || !name) {
    alert('El código de criador y el nombre son obligatorios.');
    return;
  }

  const newBreeder = { code, full_name: name, location, phone };

  if (navigator.onLine && supabaseClient) {
    const { error } = await supabaseClient.from('breeders').upsert([newBreeder]);
    if (error) {
      alert('Error al guardar criador: ' + error.message);
      return;
    }
  }

  const index = state.breeders.findIndex(b => b.code === code);
  if (index >= 0) {
    state.breeders[index] = newBreeder;
  } else {
    state.breeders.push(newBreeder);
  }

  localStorage.setItem('alacantin_breeders', JSON.stringify(state.breeders));
  closeModal('modal-breeder');
  renderAll();
}

async function saveVaccine(event) {
  if (event) event.preventDefault();

  const ring = document.getElementById('vaccine-ring')?.value.trim();
  const name = document.getElementById('vaccine-name')?.value.trim();
  const date = document.getElementById('vaccine-date')?.value;
  const batch = document.getElementById('vaccine-batch')?.value.trim();

  if (!ring || !name || !date) {
    alert('Anilla, vacuna y fecha son obligatorias.');
    return;
  }

  const newVaccine = { ring_number: ring, vaccine_name: name, date, batch_number: batch };

  if (navigator.onLine && supabaseClient) {
    await supabaseClient.from('vaccines').insert([newVaccine]);
  }

  state.vaccines.unshift(newVaccine);
  localStorage.setItem('alacantin_vaccines', JSON.stringify(state.vaccines));
  closeModal('modal-vaccine');
  renderAll();
}

async function markLoss(ringNumber) {
  const reason = prompt(`Indique el motivo de la baja para el ejemplar ${ringNumber}:`);
  if (!reason) return;

  const lossRecord = {
    ring_number: ringNumber,
    date: new Date().toISOString().split('T')[0],
    reason: reason
  };

  if (navigator.onLine && supabaseClient) {
    await supabaseClient.from('losses').insert([lossRecord]);
    await supabaseClient.from('animals').update({ status: 'loss' }).eq('ring_number', ringNumber);
  }

  const animal = state.animals.find(a => a.ring_number === ringNumber);
  if (animal) animal.status = 'loss';

  state.losses.push(lossRecord);
  localStorage.setItem('alacantin_animals', JSON.stringify(state.animals));
  localStorage.setItem('alacantin_losses', JSON.stringify(state.losses));
  renderAll();
}

// ============================================================================
// 4. CÁLCULOS GENEALÓGICOS Y CONSANGUINIDAD (WRIGHT COMPLETO)
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
// 5. RENDERIZADO DE TABLAS, VISTAS Y ESTADÍSTICAS
// ============================================================================

function renderAll() {
  renderAnimalsTable();
  renderBreedersTable();
  renderVaccinesTable();
  renderLossesTable();
  renderStats();
  populateDropdowns();
}

function renderAnimalsTable() {
  const tbody = document.getElementById('animals-tbody');
  if (!tbody) return;

  const filtered = state.animals.filter(a => {
    const matchesSearch = !state.filters.search || 
      a.ring_number.toLowerCase().includes(state.filters.search.toLowerCase()) ||
      (a.notes && a.notes.toLowerCase().includes(state.filters.search.toLowerCase()));
    
    const matchesVariety = state.filters.variety === 'all' || a.variety === state.filters.variety;
    const matchesSex = state.filters.sex === 'all' || a.sex === state.filters.sex;
    const matchesStatus = state.filters.status === 'all' || a.status === state.filters.status;

    return matchesSearch && matchesVariety && matchesSex && matchesStatus;
  });

  tbody.innerHTML = filtered.map(a => `
    <tr class="border-b border-slate-800 hover:bg-slate-800/50 transition">
      <td class="p-3 font-mono font-bold text-amber-400">${a.ring_number}</td>
      <td class="p-3">${a.variety || 'Milflores'}</td>
      <td class="p-3">
        <span class="px-2 py-0.5 rounded text-xs ${a.sex === 'M' ? 'bg-blue-500/20 text-blue-400' : 'bg-pink-500/20 text-pink-400'}">
          ${a.sex === 'M' ? '♂ Macho' : '♀ Hembra'}
        </span>
      </td>
      <td class="p-3 text-sm text-slate-300">${a.birth_date || '-'}</td>
      <td class="p-3 font-mono text-xs text-slate-400">${a.sire_ring || '-'}</td>
      <td class="p-3 font-mono text-xs text-slate-400">${a.dam_ring || '-'}</td>
      <td class="p-3">
        <span class="px-2 py-0.5 rounded text-xs ${a.status === 'loss' ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'}">
          ${a.status === 'loss' ? 'Baja' : 'Activo'}
        </span>
      </td>
      <td class="p-3 flex gap-2">
        <button onclick="generatePedigreePDF('${a.ring_number}')" class="px-2 py-1 bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 rounded text-xs border border-amber-500/30">
          PDF
        </button>
        ${a.status !== 'loss' ? `
          <button onclick="markLoss('${a.ring_number}')" class="px-2 py-1 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded text-xs border border-red-500/30">
            Baja
          </button>
        ` : ''}
      </td>
    </tr>
  `).join('');
}

function renderBreedersTable() {
  const tbody = document.getElementById('breeders-tbody');
  if (!tbody) return;

  tbody.innerHTML = state.breeders.map(b => `
    <tr class="border-b border-slate-800 hover:bg-slate-800/50">
      <td class="p-3 font-bold text-amber-400 font-mono">${b.code}</td>
      <td class="p-3 font-medium">${b.full_name}</td>
      <td class="p-3 text-slate-400">${b.location || '-'}</td>
      <td class="p-3 text-slate-400">${b.phone || '-'}</td>
    </tr>
  `).join('');
}

function renderVaccinesTable() {
  const tbody = document.getElementById('vaccines-tbody');
  if (!tbody) return;

  tbody.innerHTML = state.vaccines.map(v => `
    <tr class="border-b border-slate-800 hover:bg-slate-800/50">
      <td class="p-3 font-mono font-bold text-amber-400">${v.ring_number}</td>
      <td class="p-3 text-slate-200">${v.vaccine_name}</td>
      <td class="p-3 text-slate-400">${v.date}</td>
      <td class="p-3 font-mono text-xs text-slate-500">${v.batch_number || '-'}</td>
    </tr>
  `).join('');
}

function renderLossesTable() {
  const tbody = document.getElementById('losses-tbody');
  if (!tbody) return;

  tbody.innerHTML = state.losses.map(l => `
    <tr class="border-b border-slate-800 hover:bg-slate-800/50">
      <td class="p-3 font-mono font-bold text-red-400">${l.ring_number}</td>
      <td class="p-3 text-slate-300">${l.date}</td>
      <td class="p-3 text-slate-400">${l.reason}</td>
    </tr>
  `).join('');
}

function renderStats() {
  const activeAnimals = state.animals.filter(a => a.status !== 'loss');
  
  const elTotal = document.getElementById('stat-total-animals');
  const elMales = document.getElementById('stat-males');
  const elFemales = document.getElementById('stat-females');
  const elBreeders = document.getElementById('stat-total-breeders');

  if (elTotal) elTotal.textContent = activeAnimals.length;
  if (elMales) elMales.textContent = activeAnimals.filter(a => a.sex === 'M').length;
  if (elFemales) elFemales.textContent = activeAnimals.filter(a => a.sex === 'F').length;
  if (elBreeders) elBreeders.textContent = state.breeders.length;
}

function populateDropdowns() {
  const sireSelect = document.getElementById('animal-sire');
  const damSelect = document.getElementById('animal-dam');
  const breederSelect = document.getElementById('animal-breeder');

  const males = state.animals.filter(a => a.sex === 'M' && a.status !== 'loss');
  const females = state.animals.filter(a => a.sex === 'F' && a.status !== 'loss');

  if (sireSelect) {
    sireSelect.innerHTML = '<option value="">Sin Registro (Padre)</option>' + 
      males.map(m => `<option value="${m.ring_number}">${m.ring_number} (${m.variety || 'Milflores'})</option>`).join('');
  }

  if (damSelect) {
    damSelect.innerHTML = '<option value="">Sin Registro (Madre)</option>' + 
      females.map(f => `<option value="${f.ring_number}">${f.ring_number} (${f.variety || 'Milflores'})</option>`).join('');
  }

  if (breederSelect) {
    breederSelect.innerHTML = '<option value="">Seleccionar Criador</option>' + 
      state.breeders.map(b => `<option value="${b.code}">${b.code} - ${b.full_name}</option>`).join('');
  }
}

// ============================================================================
// 6. GENERACIÓN DE CERTIFICADOS OFICIALES Y PEDIGRÍ EN PDF
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

  // Encabezado Oficial
  doc.setFillColor(30, 41, 59); // Slate-800
  doc.rect(0, 0, 210, 35, 'F');

  doc.setFontSize(16);
  doc.setTextColor(245, 158, 11); // Amber-500
  doc.text('CLUB GALLINA ALACANTINA', 14, 18);

  doc.setFontSize(10);
  doc.setTextColor(203, 213, 225);
  doc.text('Libro Genealógico Oficial ESGA025 - Certificado de Pedigrí', 14, 26);

  // Ficha Técnica del Ejemplar
  doc.autoTable({
    startY: 42,
    head: [['Dato Oficial', 'Detalle del Ejemplar']],
    body: [
      ['Anilla Oficial', animal.ring_number],
      ['Variedad / Capa', animal.variety || 'Milflores'],
      ['Sexo', animal.sex === 'M' ? 'Macho (1.0)' : 'Hembra (0.1)'],
      ['Fecha Nacimiento', animal.birth_date || 'No registrada'],
      ['Coef. Consanguinidad (Wright)', `${inbreeding.toFixed(2)}%`],
      ['Criador / Creador', animal.breeder_code || 'ESGA025']
    ],
    theme: 'striped',
    headStyles: { fillColor: [217, 119, 6] }
  });

  // Árbol de 3 Generaciones
  doc.setFontSize(12);
  doc.setTextColor(30, 41, 59);
  doc.text('Genealogía de 3 Generaciones', 14, doc.lastAutoTable.finalY + 12);

  doc.autoTable({
    startY: doc.lastAutoTable.finalY + 16,
    head: [['Padres (Gen 1)', 'Abuelos (Gen 2)', 'Bisabuelos (Gen 3)']],
    body: [
      [
        `Padre:\n${tree.sire ? tree.sire.ring_number : 'Desconocido'}`,
        `Abuelo P.: ${tree.sire?.sire ? tree.sire.sire.ring_number : '-'}\nAbuela P.: ${tree.sire?.dam ? tree.sire.dam.ring_number : '-'}`,
        `B. P.: ${tree.sire?.sire?.sire ? tree.sire.sire.sire.ring_number : '-'}`
      ],
      [
        `Madre:\n${tree.dam ? tree.dam.ring_number : 'Desconocida'}`,
        `Abuelo M.: ${tree.dam?.sire ? tree.dam.sire.ring_number : '-'}\nAbuela M.: ${tree.dam?.dam ? tree.dam.dam.ring_number : '-'}`,
        `B. M.: ${tree.dam?.dam?.dam ? tree.dam.dam.dam.ring_number : '-'}`
      ]
    ],
    theme: 'grid',
    headStyles: { fillColor: [51, 65, 85] }
  });

  // Pie de Página
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(`Documento generado automáticamente por AlacantinApp v3 - ${new Date().toLocaleDateString()}`, 14, 285);

  doc.save(`Pedigri_ESGA025_${animal.ring_number}.pdf`);
}

// ============================================================================
// 7. CONTROLADORES DE MODALES, BÚSQUEDAS Y EXPORTACIÓN DE DATOS
// ============================================================================

function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.remove('hidden');
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.add('hidden');
}

function setupFilters() {
  const searchInput = document.getElementById('search-input');
  const varietySelect = document.getElementById('filter-variety');
  const sexSelect = document.getElementById('filter-sex');

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      state.filters.search = e.target.value;
      renderAnimalsTable();
    });
  }

  if (varietySelect) {
    varietySelect.addEventListener('change', (e) => {
      state.filters.variety = e.target.value;
      renderAnimalsTable();
    });
  }

  if (sexSelect) {
    sexSelect.addEventListener('change', (e) => {
      state.filters.sex = e.target.value;
      renderAnimalsTable();
    });
  }
}

function exportJSON() {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", `Backup_AlacantinApp_${new Date().toISOString().split('T')[0]}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

// ============================================================================
// 8. INICIALIZACIÓN GLOBAL
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
  console.log('AlacantinApp v3 - Sistema Pre-Libro ESGA025 cargado completametne.');

  // Conectar formulario de inicio de sesión
  const loginForm = document.querySelector('form');
  if (loginForm) {
    loginForm.addEventListener('submit', handleAuth);
  }

  // Conectar formularios secundarios
  const animalForm = document.getElementById('form-animal');
  if (animalForm) animalForm.addEventListener('submit', saveAnimal);

  const breederForm = document.getElementById('form-breeder');
  if (breederForm) breederForm.addEventListener('submit', saveBreeder);

  const vaccineForm = document.getElementById('form-vaccine');
  if (vaccineForm) vaccineForm.addEventListener('submit', saveVaccine);

  setupFilters();
  checkSession();
});
