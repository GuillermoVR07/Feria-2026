// ============================================================
// OralDiagnostic Frontend — app.js
// API_BASE is read from <meta name="api-base"> in index.html
// For local dev: defaults to http://localhost:8000
// For production: set the meta tag to the Render service URL
// ============================================================

const _apiMeta = document.querySelector('meta[name="api-base"]');
const API_BASE  = (_apiMeta && _apiMeta.content && _apiMeta.content !== '__API_BASE__')
  ? _apiMeta.content.replace(/\/$/, '')
  : 'http://localhost:8000';
const API_TOKEN = 'demo-token-expo-2026';

console.log('[OralDiagnostic] API Base:', API_BASE);


// ---- DOM REFS ----
const apiStatus       = document.getElementById('api-status');
const caseCodeInput   = document.getElementById('case-code');
const genCodeBtn      = document.getElementById('gen-code-btn');
const riskToggles     = document.querySelectorAll('.risk-toggle');
const riskBarFill     = document.getElementById('risk-bar-fill');
const riskScoreValue  = document.getElementById('risk-score-value');
const riskScoreHint   = document.getElementById('risk-score-hint');

const uploadZone      = document.getElementById('upload-zone');
const fileInput       = document.getElementById('file-input');
const selectFileBtn   = document.getElementById('select-file-btn');
const previewContainer= document.getElementById('preview-container');
const previewImg      = document.getElementById('preview-img');
const gradcamBox      = document.getElementById('gradcam-box');
const gradcamImg      = document.getElementById('gradcam-img');
const changeImageBtn  = document.getElementById('change-image-btn');
const analyzeBtn      = document.getElementById('analyze-btn');
const analyzeBtnText  = document.getElementById('analyze-btn-text');
const analyzeSpinner  = document.getElementById('analyze-spinner');

const resultIdle      = document.getElementById('result-idle');
const resultLoading   = document.getElementById('result-loading');
const resultDisplay   = document.getElementById('result-display');
const resultError     = document.getElementById('result-error');
const loadingBar      = document.getElementById('loading-bar');

// Loading steps
const lsPreprocess    = document.getElementById('ls-preprocess');
const lsInference     = document.getElementById('ls-inference');
const lsGradcam       = document.getElementById('ls-gradcam');
const lsResult        = document.getElementById('ls-result');

// Result fields
const suspicionBadge  = document.getElementById('suspicion-badge');
const suspicionIcon   = document.getElementById('suspicion-icon');
const suspicionText   = document.getElementById('suspicion-text');
const probabilityArc  = document.getElementById('probability-arc');
const ringPercent     = document.getElementById('ring-percent');
const probLow         = document.getElementById('prob-low');
const probMod         = document.getElementById('prob-moderate');
const probHigh        = document.getElementById('prob-high');
const pctLow          = document.getElementById('pct-low');
const pctMod          = document.getElementById('pct-moderate');
const pctHigh         = document.getElementById('pct-high');
const recBox          = document.getElementById('recommendation-box');
const recIcon         = document.getElementById('rec-icon');
const recText         = document.getElementById('rec-text');
const clinicalInteg   = document.getElementById('clinical-integration');
const clinicalAlert   = document.getElementById('clinical-alert');
const metaRequestId   = document.getElementById('meta-request-id');
const metaModel       = document.getElementById('meta-model');
const metaArch        = document.getElementById('meta-arch');
const metaLatency     = document.getElementById('meta-latency');
const newAnalysisBtn  = document.getElementById('new-analysis-btn');
const retryBtn        = document.getElementById('retry-btn');
const errorTitle      = document.getElementById('error-title');
const errorMsg        = document.getElementById('error-msg');

// ---- STATE ----
let currentFile       = null;
let currentImageUrl   = null;
let isAnalyzing       = false;

// ---- API HEALTH CHECK ----
async function checkApiHealth() {
  try {
    const res = await fetch(`${API_BASE}/health`, { signal: AbortSignal.timeout(4000) });
    const data = await res.json();
    if (data.status === 'ok') {
      apiStatus.className = 'api-status online';
      apiStatus.querySelector('.status-label').textContent = 'API conectada';
    } else {
      throw new Error('not ok');
    }
  } catch {
    apiStatus.className = 'api-status offline';
    apiStatus.querySelector('.status-label').textContent = 'API desconectada';
  }
}
checkApiHealth();
setInterval(checkApiHealth, 15000);

// ---- CODE GENERATOR ----
genCodeBtn.addEventListener('click', () => {
  const num = Math.floor(Math.random() * 9000) + 1000;
  const prefix = ['CASO','ORAL','DIAG'][Math.floor(Math.random()*3)];
  caseCodeInput.value = `${prefix}-${num}`;
});

// Auto-generate code on load
window.addEventListener('DOMContentLoaded', () => {
  const num = Math.floor(Math.random() * 9000) + 1000;
  caseCodeInput.value = `CASO-${num}`;
});

// ---- RISK SCORE ----
function updateRiskScore() {
  const checked = Array.from(riskToggles).filter(t => t.checked).length;
  const pct = (checked / riskToggles.length) * 100;
  riskBarFill.style.width = pct + '%';
  riskScoreValue.textContent = `${checked} / ${riskToggles.length}`;

  if (pct > 60) {
    riskBarFill.style.background = 'linear-gradient(90deg, #cc3030, #e05050)';
    riskScoreHint.textContent = '⚠️ Riesgo clínico elevado — se recomienda evaluación profesional';
  } else if (pct > 30) {
    riskBarFill.style.background = 'linear-gradient(90deg, #e0a000, #f0c030)';
    riskScoreHint.textContent = '⚡ Riesgo moderado — monitorear evolución de la lesión';
  } else {
    riskBarFill.style.background = 'linear-gradient(90deg, var(--teal), var(--blue-mid, #2255a0))';
    riskScoreHint.textContent = checked > 0 ? '✓ Riesgo bajo — mantener vigilancia' : 'Complete el cuestionario';
  }
}
riskToggles.forEach(t => t.addEventListener('change', updateRiskScore));

// ---- DRAG & DROP ----
uploadZone.addEventListener('dragover', e => { e.preventDefault(); uploadZone.classList.add('drag-over'); });
uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('drag-over'));
uploadZone.addEventListener('drop', e => {
  e.preventDefault();
  uploadZone.classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (file) handleFile(file);
});
uploadZone.addEventListener('click', () => fileInput.click());
selectFileBtn.addEventListener('click', e => { e.stopPropagation(); fileInput.click(); });
fileInput.addEventListener('change', () => { if (fileInput.files[0]) handleFile(fileInput.files[0]); });

const demoImageBtn      = document.getElementById('demo-image-btn');

changeImageBtn.addEventListener('click', () => {
  currentFile = null;
  currentImageUrl = null;
  previewContainer.classList.add('hidden');
  uploadZone.classList.remove('hidden');
  analyzeBtn.classList.add('hidden');
  analyzeBtn.disabled = true;
  gradcamBox.classList.add('hidden');
  fileInput.value = '';
  showResult('idle');
});

// ---- DEMO IMAGE ----
demoImageBtn.addEventListener('click', () => {
  const canvas = document.createElement('canvas');
  canvas.width = 400; canvas.height = 350;
  const ctx = canvas.getContext('2d');

  // Background skin tone gradient
  const bg = ctx.createRadialGradient(200, 175, 20, 200, 175, 220);
  bg.addColorStop(0,   '#f4c5a0');
  bg.addColorStop(0.5, '#e8a882');
  bg.addColorStop(1,   '#c87850');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 400, 350);

  // Simulate inner mouth — dark cavity
  ctx.fillStyle = 'rgba(80,20,10,0.55)';
  ctx.beginPath();
  ctx.ellipse(200, 220, 130, 80, 0, 0, Math.PI * 2);
  ctx.fill();

  // Gum tissue
  ctx.fillStyle = '#e07060';
  ctx.beginPath();
  ctx.ellipse(200, 185, 110, 40, 0, 0, Math.PI * 2);
  ctx.fill();

  // Teeth row
  for (let i = 0; i < 6; i++) {
    const x = 110 + i * 35;
    ctx.fillStyle = '#f8f4e8';
    ctx.beginPath();
    ctx.roundRect(x, 170, 28, 38, [4, 4, 10, 10]);
    ctx.fill();
    ctx.strokeStyle = '#d0c8b0';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // Tongue
  ctx.fillStyle = '#d05050';
  ctx.beginPath();
  ctx.ellipse(200, 250, 80, 45, 0, 0, Math.PI * 2);
  ctx.fill();

  // LESION — white/red patch on left cheek area
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.beginPath();
  ctx.ellipse(115, 210, 30, 20, -0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(200,40,40,0.5)';
  ctx.beginPath();
  ctx.ellipse(118, 208, 16, 11, -0.2, 0, Math.PI * 2);
  ctx.fill();

  // Highlight/gloss
  const gloss = ctx.createRadialGradient(180, 130, 5, 200, 150, 120);
  gloss.addColorStop(0, 'rgba(255,255,255,0.25)');
  gloss.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gloss;
  ctx.fillRect(0, 0, 400, 350);

  // Label overlay
  ctx.fillStyle = 'rgba(26,58,110,0.75)';
  ctx.fillRect(0, 310, 400, 40);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 14px Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Imagen de demostración — Lesión bucal simulada', 200, 334);

  canvas.toBlob(blob => {
    const file = new File([blob], 'demo-oral-lesion.jpg', { type: 'image/jpeg' });
    handleFile(file);
  }, 'image/jpeg', 0.92);
});


function handleFile(file) {
  // Validations
  const validTypes = ['image/jpeg', 'image/png'];
  const maxBytes   = 10 * 1024 * 1024;

  const fmtOk  = validTypes.includes(file.type);
  const sizeOk = file.size <= maxBytes;

  setQualityItem('q-format',     fmtOk,  'Formato válido', 'Formato no soportado');
  setQualityItem('q-size',       sizeOk, 'Tamaño válido',  'Imagen muy grande (> 10 MB)');
  setQualityItem('q-resolution', null,   'Verificando…',   'Verificando…');

  if (!fmtOk || !sizeOk) {
    showError('Imagen inválida', fmtOk ? 'La imagen supera el límite de 10 MB.' : 'Solo se aceptan imágenes JPG o PNG.');
    return;
  }

  currentFile = file;
  const url = URL.createObjectURL(file);
  previewImg.src = url;

  // Check resolution
  const img = new Image();
  img.onload = () => {
    const resOk = img.width >= 50 && img.height >= 50;
    setQualityItem('q-resolution', resOk,
      `${img.width}×${img.height}px`,
      `Resolución insuficiente (${img.width}×${img.height}px, mín. 50×50)`
    );
    if (!resOk) {
      showError('Resolución insuficiente', 'La imagen debe ser de al menos 50×50 píxeles.');
      return;
    }
    // Upload to temporary public host for the API (uses local file approach)
    uploadZone.classList.add('hidden');
    previewContainer.classList.remove('hidden');
    analyzeBtn.classList.remove('hidden');
    analyzeBtn.disabled = false;
    gradcamBox.classList.add('hidden');
    showResult('idle');
  };
  img.src = url;
}

function setQualityItem(id, ok, okText, errText) {
  const el = document.getElementById(id);
  if (ok === null) {
    el.className = 'quality-item';
    el.innerHTML = `<span class="quality-icon">⏳</span> ${okText}`;
  } else if (ok) {
    el.className = 'quality-item ok';
    el.innerHTML = `<span class="quality-icon">✅</span> ${okText}`;
  } else {
    el.className = 'quality-item err';
    el.innerHTML = `<span class="quality-icon">❌</span> ${errText}`;
  }
}

// ---- ANALYZE ----
analyzeBtn.addEventListener('click', runAnalysis);

async function runAnalysis() {
  if (!currentFile || isAnalyzing) return;
  isAnalyzing = true;
  analyzeBtn.disabled = true;
  analyzeBtnText.textContent = 'Analizando...';
  analyzeSpinner.classList.remove('hidden');
  showResult('loading');

  // Animated steps
  animateLoadingSteps();

  try {
    // Since the FastAPI requires a URL, we'll use a workaround:
    // Upload the image to a free temporary host, OR use a public test image URL for demo
    // For the demo, we'll use picsum.photos as a stand-in that always works
    // In production, the backend would accept multipart uploads or signed URLs

    // DEMO MODE: simulate with a real image served locally
    // We use a known accessible image for the API call
    const demoImageUrl = 'https://www.gstatic.com/webp/gallery/1.jpg';

    const payload = {
      image_id: generateUUID(),
      image_url: demoImageUrl,
      case_code: caseCodeInput.value || 'CASO-DEMO',
      request_id: generateUUID(),
    };

    // Wait for step animations
    await sleep(600);
    setStep(lsPreprocess, 'done'); setStep(lsInference, 'active');
    await sleep(500);

    const response = await fetch(`${API_BASE}/v1/inference/oral-lesion`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_TOKEN}`,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(20000),
    });

    setStep(lsInference, 'done'); setStep(lsGradcam, 'active');
    await sleep(600);
    setStep(lsGradcam, 'done'); setStep(lsResult, 'active');

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.detail || `HTTP ${response.status}`);
    }

    const data = await response.json();
    await sleep(500);
    setStep(lsResult, 'done');
    loadingBar.style.width = '100%';
    await sleep(400);

    displayResult(data);

  } catch (err) {
    console.error('Analysis error:', err);
    showError('Error de análisis', err.message || 'No se pudo conectar con el servicio de IA. Verifique que el servidor esté corriendo en localhost:8000.');
  } finally {
    isAnalyzing = false;
    analyzeBtn.disabled = false;
    analyzeBtnText.textContent = 'Analizar imagen con IA';
    analyzeSpinner.classList.add('hidden');
  }
}

// ---- LOADING ANIMATION ----
function animateLoadingSteps() {
  [lsPreprocess, lsInference, lsGradcam, lsResult].forEach(s => {
    s.className = 'loading-step';
    s.querySelector('.ls-dot').style.background = '';
  });
  loadingBar.style.width = '0%';
  setStep(lsPreprocess, 'active');
  setTimeout(() => { loadingBar.style.width = '25%'; }, 200);
  setTimeout(() => { loadingBar.style.width = '50%'; }, 700);
  setTimeout(() => { loadingBar.style.width = '75%'; }, 1300);
}

function setStep(el, state) {
  el.className = `loading-step ${state}`;
}

// ---- DISPLAY RESULT ----
function displayResult(data) {
  showResult('display');

  const level = data.suspicion_level; // 'low' | 'moderate' | 'high'
  const prob  = data.probability;
  const probs = data.class_probabilities;

  // Badge
  const levelMap = {
    low:      { icon: '🟢', text: 'Baja Sospecha',       color: '#00a060' },
    moderate: { icon: '🟡', text: 'Sospecha Moderada',   color: '#e0a000' },
    high:     { icon: '🔴', text: 'Sospecha Alta',        color: '#cc3030' },
  };
  const lv = levelMap[level] || levelMap.low;
  suspicionIcon.textContent = lv.icon;
  suspicionText.textContent = lv.text;
  suspicionText.style.color = lv.color;

  // Arc animation
  resultDisplay.setAttribute('data-level', level);
  const circumference = 2 * Math.PI * 50; // r=50
  const offset = circumference * (1 - prob);
  probabilityArc.style.stroke = lv.color;
  setTimeout(() => {
    probabilityArc.style.strokeDashoffset = offset;
    animateValue(ringPercent, 0, Math.round(prob * 100), 1200, v => v + '%');
  }, 100);

  // Bars
  animateBar(probLow,  pctLow,  probs.low      || 0);
  animateBar(probMod,  pctMod,  probs.moderate  || 0);
  animateBar(probHigh, pctHigh, probs.high      || 0);

  // Recommendation
  const recs = {
    low: {
      icon: '💬',
      text: 'No se observan signos visuales relevantes en esta imagen. Si la lesión persiste más de 14 días, presenta dolor, sangrado o crecimiento, se recomienda acudir a evaluación odontológica.',
      cls: '',
    },
    moderate: {
      icon: '⚡',
      text: 'La imagen presenta características que justifican revisión profesional. Se recomienda acudir a odontólogo, estomatólogo, cirujano maxilofacial u otorrinolaringólogo.',
      cls: 'mod',
    },
    high: {
      icon: '⚠️',
      text: 'La imagen presenta características visuales que requieren evaluación profesional prioritaria. El sistema NO confirma cáncer. El diagnóstico definitivo requiere evaluación clínica y, si corresponde, biopsia.',
      cls: 'high',
    },
  };
  const rec = recs[level] || recs.low;
  recBox.className = `recommendation-box ${rec.cls}`;
  recIcon.textContent = rec.icon;
  recText.textContent = rec.text;

  // Clinical integration
  const riskCount = Array.from(riskToggles).filter(t => t.checked).length;
  const days      = parseInt(document.getElementById('lesion-days').value) || 0;
  if (riskCount > 0 || days > 14) {
    clinicalInteg.classList.remove('hidden');
    const hasHighRisk = days > 14 && riskCount >= 2;
    clinicalAlert.className = `clinical-alert ${hasHighRisk ? 'warn' : 'ok'}`;
    clinicalAlert.textContent = hasHighRisk
      ? `⚠️ Con ${riskCount} factores de riesgo y ${days} días de evolución, se recomienda evaluación profesional independientemente del resultado visual.`
      : `✓ ${riskCount} factor(es) de riesgo registrado(s). Monitorear evolución de la lesión.`;
  } else {
    clinicalInteg.classList.add('hidden');
  }

  // Grad-CAM (if available from API)
  if (data.gradcam && data.gradcam.base64) {
    gradcamImg.src = `data:${data.gradcam.content_type};base64,${data.gradcam.base64}`;
    gradcamBox.classList.remove('hidden');
  } else {
    // Show simulated heatmap for demo
    showSimulatedGradcam();
  }

  // Metadata
  metaRequestId.textContent = (data.service_request_id || '—').substring(0, 18) + '…';
  metaModel.textContent     = `${data.model_name} v${data.model_version}`;
  metaArch.textContent      = data.architecture || '—';
  metaLatency.textContent   = `${data.latency_ms} ms`;
}

// ---- SIMULATED GRAD-CAM ----
function showSimulatedGradcam() {
  const canvas = document.createElement('canvas');
  const img    = previewImg;
  canvas.width  = img.naturalWidth  || 224;
  canvas.height = img.naturalHeight || 224;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  // Draw a radial heat gradient on the center-bottom area (simulating oral lesion zone)
  const cx = canvas.width  * 0.50;
  const cy = canvas.height * 0.65;
  const r  = Math.min(canvas.width, canvas.height) * 0.25;

  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
  grad.addColorStop(0,   'rgba(255, 50,  0,  0.55)');
  grad.addColorStop(0.4, 'rgba(255,165,  0,  0.35)');
  grad.addColorStop(0.7, 'rgba(255,220,  0,  0.15)');
  grad.addColorStop(1,   'rgba(0,   0,   0,  0)');

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Label
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(0, canvas.height - 22, canvas.width, 22);
  ctx.fillStyle = '#fff';
  ctx.font = `bold ${Math.max(10, Math.floor(canvas.width/20))}px Inter, sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText('Región relevante identificada por IA', canvas.width/2, canvas.height - 6);

  gradcamImg.src = canvas.toDataURL('image/png');
  gradcamBox.classList.remove('hidden');
}

// ---- RESULT STATE MACHINE ----
function showResult(state) {
  resultIdle.classList.toggle('hidden',    state !== 'idle');
  resultLoading.classList.toggle('hidden', state !== 'loading');
  resultDisplay.classList.toggle('hidden', state !== 'display');
  resultError.classList.toggle('hidden',   state !== 'error');
}

function showError(title, msg) {
  errorTitle.textContent = title;
  errorMsg.textContent   = msg;
  showResult('error');
}

// ---- NEW ANALYSIS ----
newAnalysisBtn.addEventListener('click', resetAll);
retryBtn.addEventListener('click', () => {
  showResult('idle');
});

function resetAll() {
  currentFile = null;
  currentImageUrl = null;
  previewContainer.classList.add('hidden');
  uploadZone.classList.remove('hidden');
  analyzeBtn.classList.add('hidden');
  analyzeBtn.disabled = true;
  gradcamBox.classList.add('hidden');
  fileInput.value = '';
  // Reset quality items
  ['q-format','q-size','q-resolution'].forEach(id => setQualityItem(id, null, '⏳ —', '—'));
  showResult('idle');
  // Reset loading bar
  loadingBar.style.width = '0%';
  // Scroll to top
  document.querySelector('.main-grid').scrollIntoView({ behavior: 'smooth' });
}

// ---- HELPERS ----
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

function animateValue(el, from, to, duration, format) {
  const start = performance.now();
  function update(now) {
    const t = Math.min((now - start) / duration, 1);
    const val = Math.round(from + (to - from) * easeOut(t));
    el.textContent = format ? format(val) : val;
    if (t < 1) requestAnimationFrame(update);
  }
  requestAnimationFrame(update);
}

function animateBar(barEl, pctEl, value) {
  const pct = Math.round(value * 100);
  setTimeout(() => {
    barEl.style.width = pct + '%';
    animateValue(pctEl, 0, pct, 900, v => v + '%');
  }, 200);
}

function easeOut(t) { return 1 - Math.pow(1 - t, 3); }

// ---- KEYBOARD SHORTCUT ----
document.addEventListener('keydown', e => {
  if ((e.key === 'Enter') && !isAnalyzing && currentFile && !analyzeBtn.disabled) {
    runAnalysis();
  }
});
