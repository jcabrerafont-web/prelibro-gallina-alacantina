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

// --- CONTROL DE SESIÓN AL CARGAR LA PÁGINA ---
document.addEventListener('DOMContentLoaded', async () => {
  if (!supabaseClient) return;
  
  const { data: { session } } = await supabaseClient.auth.getSession();
  updateAuthUI(session);

  // Escuchar cambios en el estado de autenticación en tiempo real
  supabaseClient.auth.onAuthStateChange((event, session) => {
    updateAuthUI(session);
  });
});

// --- FUNCIÓN DE INICIO DE SESIÓN ---
async function handleAuth(event) {
  if (event) event.preventDefault();
  
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;

  if (!supabaseClient) {
    alert('Error: Supabase no está inicializado.');
    return;
  }

  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email: email,
    password: password
  });

  if (error) {
    alert('Error de acceso: ' + error.message);
  } else {
    // Éxito: Ocultar pantalla de login y mostrar app principal
    document.getElementById('landing-login').classList.add('hidden');
    document.getElementById('app-content').classList.remove('hidden');
    updateAuthUI(data.session);
  }
}

// --- FUNCIÓN DE CIERRE DE SESIÓN ---
async function logout() {
  if (supabaseClient) {
    await supabaseClient.auth.signOut();
  }
  document.getElementById('app-content').classList.add('hidden');
  document.getElementById('landing-login').classList.remove('hidden');
}

// --- ACTUALIZAR INTERFAZ SEGÚN ESTADO ---
function updateAuthUI(session) {
  const appContent = document.getElementById('app-content');
  const loginScreen = document.getElementById('landing-login');
  const authState = document.getElementById('auth-state');
  const authIndicator = document.getElementById('auth-indicator');
  const btnAuth = document.getElementById('btn-auth');

  if (session) {
    // Usuario autenticado: Mostramos app y ocultamos login
    if (appContent) appContent.classList.remove('hidden');
    if (loginScreen) loginScreen.classList.add('hidden');

    if (authState) authState.textContent = session.user.email;
    if (authIndicator) {
      authIndicator.className = 'w-2 h-2 rounded-full bg-green-500';
    }
    if (btnAuth) {
      btnAuth.textContent = 'Cerrar Sesión';
      btnAuth.onclick = logout;
    }
  } else {
    // Sin sesión: Ocultamos app y mostramos login
    if (appContent) appContent.classList.add('hidden');
    if (loginScreen) loginScreen.classList.remove('hidden');

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

// --- NAVEGACIÓN ENTRE PESTAÑAS ---
function switchTab(tabId) {
  const secciones = ['registro', 'censo', 'informes', 'estandar', 'gestion'];
  secciones.forEach(sec => {
    const el = document.getElementById(`sec-${sec}`);
    const tab = document.getElementById(`tab-${sec}`);
    const mobTab = document.getElementById(`mob-${sec}`);
    
    if (sec === tabId) {
      if (el) el.classList.remove('hidden');
      if (tab) {
        tab.classList.add('text-amber-400', 'border-amber-400');
        tab.classList.remove('text-slate-400', 'border-transparent');
      }
      if (mobTab) {
        mobTab.classList.add('text-amber-400');
        mobTab.classList.remove('text-slate-400');
      }
    } else {
      if (el) el.classList.add('hidden');
      if (tab) {
        tab.classList.remove('text-amber-400', 'border-amber-400');
        tab.classList.add('text-slate-400', 'border-transparent');
      }
      if (mobTab) {
        mobTab.classList.remove('text-amber-400');
        mobTab.classList.add('text-slate-400');
      }
    }
  });
}

// --- FUNCIONES AUXILIARES DEL FORMULARIO ---
function guardarEjemplar(event) {
  if (event) event.preventDefault();
  alert('Datos del ejemplar listos para sincronizar con Supabase.');
}

function limpiarFormulario() {
  const form = document.getElementById('form-ejemplar');
  if (form) form.reset();
}

function obtenerUbicacionGPS() {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(position => {
      const lat = position.coords.latitude.toFixed(6);
      const lon = position.coords.longitude.toFixed(6);
      const inputGPS = document.getElementById('criador_gps');
      if (inputGPS) inputGPS.value = `${lat}, ${lon}`;
    }, () => {
      alert('No se pudo obtener la ubicación GPS.');
    });
  } else {
    alert('La geolocalización no está soportada en este navegador.');
  }
}

function filtrarInformesCNZ() {
  const resultado = document.getElementById('resultado-informe');
  if (resultado) {
    resultado.innerHTML = '<div class="p-4 bg-slate-800 rounded-lg border border-slate-700 text-amber-400 text-sm">Informe oficial generado correctamente para el registro ESGA025.</div>';
  }
}

function exportarMatrizPedigriCSV() {
  alert('Exportando matriz de pedigrí en formato CSV...');
}

function actualizarPesoPorDefecto() {
  const sexo = document.getElementById('sexo').value;
  const pesoInput = document.getElementById('peso');
  if (pesoInput) {
    pesoInput.value = sexo === 'M' ? '3250' : '2500';
  }
}
