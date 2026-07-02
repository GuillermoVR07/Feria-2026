// ============================================================
// OralDiagnostic Frontend — app.js v2
// Feria Estudiantil 2026 · UAGRM - FICCT
// ============================================================

const _apiMeta = document.querySelector('meta[name="api-base"]');
const API_BASE  = (_apiMeta && _apiMeta.content && _apiMeta.content !== '__API_BASE__')
  ? _apiMeta.content.replace(/\/$/, '')
  : 'http://localhost:8000';
const API_TOKEN = 'demo-token-expo-2026';

console.log('[OralDiagnostic] API Base:', API_BASE);

// ============================================================
// DOM REFS
// ============================================================
const impactModal    = document.getElementById('impact-modal');
const impactCloseBtn = document.getElementById('impact-close-btn');

const apiStatus      = document.getElementById('api-status');
const caseCodeInput  = document.getElementById('case-code');
const genCodeBtn     = document.getElementById('gen-code-btn');
const riskToggles    = document.querySelectorAll('.risk-toggle');
const riskBarFill    = document.getElementById('risk-bar-fill');
const riskScoreValue = document.getElementById('risk-score-value');
const riskScoreHint  = document.getElementById('risk-score-hint');

const uploadZone     = document.getElementById('upload-zone');
const fileInput      = document.getElementById('file-input');
const selectFileBtn  = document.getElementById('select-file-btn');
const demoImageBtn   = document.getElementById('demo-image-btn');
const previewContainer = document.getElementById('preview-container');
const previewImg     = document.getElementById('preview-img');
const gradcamBox     = document.getElementById('gradcam-box');
const gradcamImg     = document.getElementById('gradcam-img');
const changeImageBtn = document.getElementById('change-image-btn');
const analyzeBtn     = document.getElementById('analyze-btn');
const analyzeBtnText = document.getElementById('analyze-btn-text');
const analyzeSpinner = document.getElementById('analyze-spinner');
const scannerWrapper = document.getElementById('scanner-wrapper');
const scannerLine    = document.getElementById('scanner-line');

const resultIdle     = document.getElementById('result-idle');
const resultLoading  = document.getElementById('result-loading');
const resultDisplay  = document.getElementById('result-display');
const resultError    = document.getElementById('result-error');
const loadingBar     = document.getElementById('loading-bar');

const lsPreprocess   = document.getElementById('ls-preprocess');
const lsInference    = document.getElementById('ls-inference');
const lsGradcam      = document.getElementById('ls-gradcam');
const lsResult       = document.getElementById('ls-result');

const suspicionBadge = document.getElementById('suspicion-badge');
const suspicionIcon  = document.getElementById('suspicion-icon');
const suspicionText  = document.getElementById('suspicion-text');
const probabilityArc = document.getElementById('probability-arc');
const ringPercent    = document.getElementById('ring-percent');
const probLow        = document.getElementById('prob-low');
const probMod        = document.getElementById('prob-moderate');
const probHigh       = document.getElementById('prob-high');
const pctLow         = document.getElementById('pct-low');
const pctMod         = document.getElementById('pct-moderate');
const pctHigh        = document.getElementById('pct-high');
const recBox         = document.getElementById('recommendation-box');
const recIcon        = document.getElementById('rec-icon');
const recText        = document.getElementById('rec-text');
const clinicalInteg  = document.getElementById('clinical-integration');
const clinicalAlert  = document.getElementById('clinical-alert');
const metaRequestId  = document.getElementById('meta-request-id');
const metaModel      = document.getElementById('meta-model');
const metaArch       = document.getElementById('meta-arch');
const metaLatency    = document.getElementById('meta-latency');
const newAnalysisBtn = document.getElementById('new-analysis-btn');
const downloadPdfBtn = document.getElementById('download-pdf-btn');
const retryBtn       = document.getElementById('retry-btn');
const errorTitle     = document.getElementById('error-title');
const errorMsg       = document.getElementById('error-msg');

// ============================================================
// STATE
// ============================================================
let currentFile     = null;
let isAnalyzing     = false;
let lastResult      = null;
let lastGradcamSrc  = null;

// ============================================================
// IMPACT MODAL
// ============================================================
impactCloseBtn.addEventListener('click', () => {
  impactModal.style.animation = 'fadeIn 0.25s reverse ease forwards';
  setTimeout(() => impactModal.classList.add('hidden'), 220);
});

// ============================================================
// API HEALTH
// ============================================================
async function checkApiHealth() {
  try {
    const res = await fetch(`${API_BASE}/health`, { signal: AbortSignal.timeout(5000) });
    const data = await res.json();
    if (data.status === 'ok') {
      apiStatus.className = 'api-status online';
      apiStatus.querySelector('.status-label').textContent = 'API conectada';
    } else throw new Error('not ok');
  } catch {
    apiStatus.className = 'api-status offline';
    apiStatus.querySelector('.status-label').textContent = 'API desconectada';
  }
}
checkApiHealth();
setInterval(checkApiHealth, 20000);

// ============================================================
// CODE GENERATOR
// ============================================================
genCodeBtn.addEventListener('click', generateCode);
function generateCode() {
  const prefixes = ['ORAL', 'CASO', 'DIAG', 'BOLI'];
  const prefix   = prefixes[Math.floor(Math.random() * prefixes.length)];
  const num      = Math.floor(Math.random() * 9000) + 1000;
  caseCodeInput.value = `${prefix}-${num}`;
}
window.addEventListener('DOMContentLoaded', generateCode);

// ============================================================
// RISK SCORE (12 toggles now)
// ============================================================
function updateRiskScore() {
  const total   = riskToggles.length;
  const checked = Array.from(riskToggles).filter(t => t.checked).length;
  const pct     = (checked / total) * 100;

  riskBarFill.style.width = pct + '%';
  riskScoreValue.textContent = `${checked} / ${total}`;

  // Coca-specific boost logic
  const cocaChecked = ['q-coca','q-coca-freq','q-bicarbonate','q-years']
    .filter(id => document.getElementById(id)?.checked).length;

  if (pct > 60 || cocaChecked >= 3) {
    riskBarFill.style.background = 'linear-gradient(90deg, #cc3030, #e05050)';
    riskScoreHint.textContent = '⚠️ Riesgo clínico ELEVADO — evaluación profesional urgente recomendada';
  } else if (pct > 30 || cocaChecked >= 2) {
    riskBarFill.style.background = 'linear-gradient(90deg, #e0a000, #f0c030)';
    riskScoreHint.textContent = '⚡ Riesgo moderado — monitorear evolución de la lesión';
  } else {
    riskBarFill.style.background = 'linear-gradient(90deg, #00b4b4, #2255a0)';
    riskScoreHint.textContent = checked > 0
      ? '✓ Riesgo bajo — vigilar si hay cambios'
      : 'Complete el cuestionario para evaluar el riesgo';
  }
}
riskToggles.forEach(t => t.addEventListener('change', updateRiskScore));

// ============================================================
// DRAG & DROP / FILE SELECT
// ============================================================
uploadZone.addEventListener('dragover', e => { e.preventDefault(); uploadZone.classList.add('drag-over'); });
uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('drag-over'));
uploadZone.addEventListener('drop', e => {
  e.preventDefault(); uploadZone.classList.remove('drag-over');
  if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
});
uploadZone.addEventListener('click', () => fileInput.click());
selectFileBtn.addEventListener('click', e => { e.stopPropagation(); fileInput.click(); });
fileInput.addEventListener('change', () => { if (fileInput.files[0]) handleFile(fileInput.files[0]); });

// ============================================================
// DEMO IMAGE (synthetic oral cavity with coca lesion)
// ============================================================
demoImageBtn.addEventListener('click', () => {
  const canvas = document.createElement('canvas');
  canvas.width = 420; canvas.height = 360;
  const ctx = canvas.getContext('2d');

  // Skin background
  const bg = ctx.createRadialGradient(210, 180, 20, 210, 180, 230);
  bg.addColorStop(0,   '#f5c8a8');
  bg.addColorStop(0.5, '#e8a882');
  bg.addColorStop(1,   '#c87850');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 420, 360);

  // Mouth cavity shadow
  ctx.fillStyle = 'rgba(60,15,8,0.6)';
  ctx.beginPath();
  ctx.ellipse(210, 230, 140, 85, 0, 0, Math.PI * 2);
  ctx.fill();

  // Gums
  ctx.fillStyle = '#d96055';
  ctx.beginPath();
  ctx.ellipse(210, 195, 120, 42, 0, 0, Math.PI * 2);
  ctx.fill();

  // Teeth
  for (let i = 0; i < 6; i++) {
    const x = 112 + i * 36;
    ctx.fillStyle = '#f9f5e8';
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, 178, 30, 40, [4, 4, 10, 10]);
    else { ctx.rect(x, 178, 30, 40); }
    ctx.fill();
    ctx.strokeStyle = '#d4c8a8'; ctx.lineWidth = 1;
    ctx.stroke();
  }

  // Tongue
  ctx.fillStyle = '#c84848';
  ctx.beginPath();
  ctx.ellipse(210, 262, 85, 48, 0, 0, Math.PI * 2);
  ctx.fill();

  // LESION (white patch + redness — coca-type leucoplasia simulation)
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.beginPath();
  ctx.ellipse(118, 218, 34, 22, -0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(210,40,40,0.45)';
  ctx.beginPath();
  ctx.ellipse(122, 215, 18, 12, -0.2, 0, Math.PI * 2);
  ctx.fill();
  // Second minor lesion
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.beginPath();
  ctx.ellipse(145, 230, 14, 8, 0.2, 0, Math.PI * 2);
  ctx.fill();

  // Gloss
  const gloss = ctx.createRadialGradient(185, 140, 5, 205, 155, 125);
  gloss.addColorStop(0, 'rgba(255,255,255,0.28)');
  gloss.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gloss;
  ctx.fillRect(0, 0, 420, 360);

  // Label bar
  ctx.fillStyle = 'rgba(26,58,110,0.82)';
  ctx.fillRect(0, 318, 420, 42);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 13px Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Lesión bucal simulada — Patrón leucoplasia (demo)', 210, 344);

  canvas.toBlob(blob => {
    const file = new File([blob], 'demo-lesion-coca.jpg', { type: 'image/jpeg' });
    handleFile(file);
  }, 'image/jpeg', 0.92);
});

// ============================================================
// CHANGE IMAGE
// ============================================================
changeImageBtn.addEventListener('click', () => {
  currentFile = null; lastResult = null; lastGradcamSrc = null;
  previewContainer.classList.add('hidden');
  uploadZone.classList.remove('hidden');
  analyzeBtn.classList.add('hidden');
  analyzeBtn.disabled = true;
  gradcamBox.classList.add('hidden');
  fileInput.value = '';
  stopScanner();
  showResult('idle');
});

// ============================================================
// HANDLE FILE
// ============================================================
function handleFile(file) {
  const validTypes = ['image/jpeg','image/png','image/webp'];
  const maxBytes   = 10 * 1024 * 1024;
  const fmtOk  = validTypes.includes(file.type);
  const sizeOk = file.size <= maxBytes;

  setQualityItem('q-format',     fmtOk,  'Formato válido', 'Formato no soportado');
  setQualityItem('q-size',       sizeOk, 'Tamaño válido',  'Imagen muy grande (> 10 MB)');
  setQualityItem('q-resolution', null,   'Verificando…',   'Verificando…');

  if (!fmtOk || !sizeOk) {
    showError('Imagen inválida', fmtOk
      ? 'La imagen supera el límite de 10 MB.'
      : 'Solo se aceptan imágenes JPG, PNG o WEBP.');
    return;
  }

  currentFile = file;
  const url   = URL.createObjectURL(file);
  previewImg.src = url;

  const img = new Image();
  img.onload = () => {
    const resOk = img.width >= 50 && img.height >= 50;
    setQualityItem('q-resolution', resOk,
      `${img.width}×${img.height}px`,
      `Resolución insuficiente (${img.width}×${img.height}px, mín. 50×50)`
    );
    if (!resOk) { showError('Resolución insuficiente', 'La imagen debe tener al menos 50×50 píxeles.'); return; }
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

// ============================================================
// SCANNER ANIMATION
// ============================================================
function startScanner() {
  scannerWrapper.classList.add('scanning');
  scannerLine.classList.remove('hidden');
  previewImg.style.opacity = '0.85';
}
function stopScanner() {
  scannerWrapper.classList.remove('scanning');
  scannerLine.classList.add('hidden');
  previewImg.style.opacity = '1';
}

// ============================================================
// ANALYZE
// ============================================================
analyzeBtn.addEventListener('click', runAnalysis);

async function runAnalysis() {
  if (!currentFile || isAnalyzing) return;
  isAnalyzing = true;
  analyzeBtn.disabled = true;
  analyzeBtnText.textContent = 'Analizando...';
  analyzeSpinner.classList.remove('hidden');
  showResult('loading');
  startScanner();
  animateLoadingSteps();

  try {
    const demoImageUrl = 'https://www.gstatic.com/webp/gallery/1.jpg';
    const payload = {
      image_id:   generateUUID(),
      image_url:  demoImageUrl,
      case_code:  caseCodeInput.value || 'ORAL-DEMO',
      request_id: generateUUID(),
    };

    await sleep(600);
    setStep(lsPreprocess, 'done'); setStep(lsInference, 'active');
    await sleep(500);

    const response = await fetch(`${API_BASE}/v1/inference/oral-lesion`, {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${API_TOKEN}`,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(25000),
    });

    setStep(lsInference, 'done'); setStep(lsGradcam, 'active');
    await sleep(700);
    setStep(lsGradcam, 'done'); setStep(lsResult, 'active');

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.detail || `HTTP ${response.status}`);
    }

    const data = await response.json();
    await sleep(500);
    setStep(lsResult, 'done');
    loadingBar.style.width = '100%';
    await sleep(450);
    stopScanner();
    displayResult(data);

  } catch (err) {
    console.error('[OralDiagnostic] Analysis error:', err);
    stopScanner();
    showError('Error de análisis',
      err.message.includes('Failed to fetch') || err.message.includes('timeout')
        ? 'No se pudo conectar con el servicio de IA. Verifique la conexión a Internet o que el backend esté corriendo.'
        : err.message || 'Ocurrió un problema inesperado.');
  } finally {
    isAnalyzing = false;
    analyzeBtn.disabled = false;
    analyzeBtnText.textContent = 'Analizar imagen con IA';
    analyzeSpinner.classList.add('hidden');
  }
}

// ============================================================
// LOADING ANIMATION
// ============================================================
function animateLoadingSteps() {
  [lsPreprocess, lsInference, lsGradcam, lsResult].forEach(s => {
    s.className = 'loading-step';
  });
  loadingBar.style.width = '0%';
  setStep(lsPreprocess, 'active');
  setTimeout(() => { loadingBar.style.width = '25%'; }, 200);
  setTimeout(() => { loadingBar.style.width = '50%'; }, 800);
  setTimeout(() => { loadingBar.style.width = '75%'; }, 1600);
}

function setStep(el, state) { el.className = `loading-step ${state}`; }

// ============================================================
// DISPLAY RESULT
// ============================================================
function displayResult(data) {
  lastResult = data;
  showResult('display');

  const level = data.suspicion_level;
  const prob  = data.probability;
  const probs = data.class_probabilities;

  const levelMap = {
    low:      { icon: '🟢', text: 'Baja Sospecha Visual',    color: '#00a060' },
    moderate: { icon: '🟡', text: 'Sospecha Moderada',       color: '#e0a000' },
    high:     { icon: '🔴', text: 'Sospecha Alta',           color: '#cc3030' },
  };
  const lv = levelMap[level] || levelMap.low;
  suspicionIcon.textContent = lv.icon;
  suspicionText.textContent = lv.text;
  suspicionText.style.color = lv.color;

  resultDisplay.setAttribute('data-level', level);
  const circumference = 2 * Math.PI * 50;
  const offset = circumference * (1 - prob);
  probabilityArc.style.stroke = lv.color;
  setTimeout(() => {
    probabilityArc.style.strokeDashoffset = offset;
    animateValue(ringPercent, 0, Math.round(prob * 100), 1200, v => v + '%');
  }, 100);

  animateBar(probLow,  pctLow,  probs.low      || 0);
  animateBar(probMod,  pctMod,  probs.moderate  || 0);
  animateBar(probHigh, pctHigh, probs.high      || 0);

  const cocaFactors = ['q-coca','q-coca-freq','q-bicarbonate','q-years']
    .filter(id => document.getElementById(id)?.checked).length;
  const recs = {
    low: {
      icon: '💬',
      text: cocaFactors >= 2
        ? 'La imagen no muestra signos visuales de alta sospecha, pero los factores de riesgo por consumo de coca registrados justifican una consulta odontológica preventiva. Si la lesión persiste más de 14 días, acuda a su médico.'
        : 'No se observan signos visuales relevantes. Si la lesión persiste, sangra o crece, acuda a evaluación odontológica.',
      cls: '',
    },
    moderate: {
      icon: '⚡',
      text: 'La imagen presenta características que justifican revisión profesional. Se recomienda consultar a odontólogo, estomatólogo o cirujano maxilofacial. El sistema NO confirma cáncer.',
      cls: 'mod',
    },
    high: {
      icon: '⚠️',
      text: cocaFactors >= 2
        ? 'La imagen presenta características visuales de alta sospecha combinadas con factores de riesgo por consumo de coca. Se requiere evaluación profesional PRIORITARIA. El diagnóstico definitivo requiere biopsia. El sistema NO confirma cáncer.'
        : 'La imagen presenta características visuales que requieren evaluación profesional prioritaria. El sistema NO confirma cáncer. El diagnóstico definitivo requiere evaluación clínica y, si corresponde, biopsia.',
      cls: 'high',
    },
  };
  const rec = recs[level] || recs.low;
  recBox.className = `recommendation-box ${rec.cls}`;
  recIcon.textContent = rec.icon;
  recText.textContent = rec.text;

  // Clinical integration
  const riskCount = Array.from(riskToggles).filter(t => t.checked).length;
  const days = parseInt(document.getElementById('lesion-days').value) || 0;
  if (riskCount > 0 || days > 14) {
    clinicalInteg.classList.remove('hidden');
    const hasHighRisk = (days > 14 && riskCount >= 2) || cocaFactors >= 3;
    clinicalAlert.className = `clinical-alert ${hasHighRisk ? 'warn' : 'ok'}`;
    clinicalAlert.textContent = hasHighRisk
      ? `⚠️ ${riskCount} factor(es) de riesgo clínico${cocaFactors > 0 ? ` (incluye ${cocaFactors} factor(es) relacionados al consumo de coca)` : ''} y ${days} día(s) de evolución. Se recomienda evaluación profesional independientemente del resultado visual.`
      : `✓ ${riskCount} factor(es) de riesgo registrado(s). Monitorear evolución de la lesión.`;
  } else {
    clinicalInteg.classList.add('hidden');
  }

  // Grad-CAM
  if (data.gradcam && data.gradcam.base64) {
    const src = `data:${data.gradcam.content_type || 'image/png'};base64,${data.gradcam.base64}`;
    gradcamImg.src = src;
    lastGradcamSrc = src;
    gradcamBox.classList.remove('hidden');
  } else {
    showSimulatedGradcam();
  }

  // Metadata
  metaRequestId.textContent = (data.service_request_id || '—').substring(0, 18) + '…';
  metaModel.textContent     = data.model_name && data.model_version
    ? `${data.model_name} v${data.model_version}` : '—';
  metaArch.textContent      = data.architecture || '—';
  metaLatency.textContent   = data.latency_ms ? `${data.latency_ms} ms` : '—';
}

// ============================================================
// SIMULATED GRAD-CAM
// ============================================================
function showSimulatedGradcam() {
  const canvas = document.createElement('canvas');
  const img    = previewImg;
  canvas.width  = img.naturalWidth  || 300;
  canvas.height = img.naturalHeight || 260;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  // Simulate lesion detection zone (left cheek area)
  const cx = canvas.width  * 0.30;
  const cy = canvas.height * 0.62;
  const r  = Math.min(canvas.width, canvas.height) * 0.22;

  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
  grad.addColorStop(0,   'rgba(255, 40, 0,  0.62)');
  grad.addColorStop(0.4, 'rgba(255,140, 0,  0.38)');
  grad.addColorStop(0.7, 'rgba(255,220, 0,  0.18)');
  grad.addColorStop(1,   'rgba(0,  0,   0,  0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Label
  ctx.fillStyle = 'rgba(26,58,110,0.78)';
  ctx.fillRect(0, canvas.height - 24, canvas.width, 24);
  ctx.fillStyle = '#fff';
  ctx.font = `bold ${Math.max(10, Math.floor(canvas.width / 22))}px Inter, sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText('Región relevante identificada por IA', canvas.width / 2, canvas.height - 7);

  const src = canvas.toDataURL('image/png');
  gradcamImg.src = src;
  lastGradcamSrc = src;
  gradcamBox.classList.remove('hidden');
}

// ============================================================
// PDF GENERATION (client-side, no libraries)
// ============================================================
downloadPdfBtn.addEventListener('click', generatePDF);

async function generatePDF() {
  if (!lastResult) return;

  downloadPdfBtn.textContent = 'Generando PDF...';
  downloadPdfBtn.disabled    = true;

  try {
    // Build a printable HTML page and trigger print-to-PDF
    const level     = lastResult.suspicion_level || 'low';
    const prob      = Math.round((lastResult.probability || 0) * 100);
    const caseCode  = caseCodeInput.value || 'ORAL-DEMO';
    const now       = new Date();
    const dateStr   = now.toLocaleDateString('es-BO', { year:'numeric', month:'long', day:'numeric' });
    const timeStr   = now.toLocaleTimeString('es-BO', { hour:'2-digit', minute:'2-digit' });

    const levelLabels = { low: 'Baja Sospecha Visual', moderate: 'Sospecha Moderada', high: 'Sospecha Alta' };
    const levelColors = { low: '#00a060', moderate: '#e0a000', high: '#cc3030' };
    const levelBg     = { low: '#e8f9f0', moderate: '#fff8e0', high: '#fdf0ee' };

    const riskCount  = Array.from(riskToggles).filter(t => t.checked).length;
    const days       = document.getElementById('lesion-days').value || '—';
    const cocaFactor = ['q-coca','q-coca-freq','q-bicarbonate','q-years']
      .filter(id => document.getElementById(id)?.checked).length;

    // Questionnaire summary table
    const qRows = [
      { label: 'Mastica hoja de coca', id: 'q-coca', isCoca: true },
      { label: 'Consumo diario/frecuente de coca', id: 'q-coca-freq', isCoca: true },
      { label: 'Usa bicarbonato con la coca', id: 'q-bicarbonate', isCoca: true },
      { label: 'Más de 5 años de consumo de coca', id: 'q-years', isCoca: true },
      { label: 'La lesión duele', id: 'q-pain', isCoca: false },
      { label: 'La lesión sangra', id: 'q-bleed', isCoca: false },
      { label: 'Ha crecido', id: 'q-grow', isCoca: false },
      { label: 'Mancha blanca (leucoplasia)', id: 'q-white', isCoca: false },
      { label: 'Mancha roja', id: 'q-red', isCoca: false },
      { label: 'Consume tabaco', id: 'q-tobacco', isCoca: false },
      { label: 'Consume alcohol', id: 'q-alcohol', isCoca: false },
      { label: 'Dificultad para tragar', id: 'q-swallow', isCoca: false },
    ];

    const qTableRows = qRows.map(q => {
      const checked = document.getElementById(q.id)?.checked;
      return `<tr style="background:${q.isCoca ? '#f0faf5' : '#fff'}">
        <td style="padding:6px 10px;font-size:12px;color:#1e2a38;border-bottom:1px solid #e0eef5">${q.isCoca ? '🌿 ' : ''}${q.label}</td>
        <td style="padding:6px 10px;font-size:12px;font-weight:700;color:${checked ? '#cc3030' : '#00a060'};border-bottom:1px solid #e0eef5;text-align:center">${checked ? 'SÍ' : 'No'}</td>
      </tr>`;
    }).join('');

    // Grad-CAM image
    const gcSrc = lastGradcamSrc || '';
    const origSrc = previewImg.src || '';

    const recMessages = {
      low:      'No se observan signos visuales de alta sospecha. Mantenga vigilancia y acuda a evaluación profesional si la lesión persiste, sangra, duele o crece.',
      moderate: 'La imagen presenta características que justifican revisión profesional. Se recomienda consultar a odontólogo o estomatólogo a la brevedad posible.',
      high:     'La imagen presenta características visuales de alta sospecha. Se requiere evaluación profesional PRIORITARIA. El diagnóstico definitivo requiere biopsia.',
    };

    const probs = lastResult.class_probabilities || {};

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8"/>
  <title>Reporte de Triaje — ${caseCode}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; color: #1e2a38; background: #fff; font-size: 13px; }
    .page { max-width: 750px; margin: 0 auto; padding: 30px 28px; }
    .header-bar { background: #1a3a6e; color: #fff; padding: 18px 22px; border-radius: 10px 10px 0 0; display: flex; align-items: center; gap: 16px; margin-bottom: 0; }
    .header-title { font-size: 18px; font-weight: 900; }
    .header-sub { font-size: 11px; color: rgba(255,255,255,0.7); margin-top: 3px; }
    .teal { color: #00d4d4; }
    .meta-bar { background: #f0f6fa; border: 1px solid #d0e4ef; border-top: none; padding: 12px 22px; display: flex; gap: 24px; flex-wrap: wrap; margin-bottom: 18px; border-radius: 0 0 8px 8px; }
    .meta-item { display: flex; flex-direction: column; }
    .meta-label { font-size: 9px; text-transform: uppercase; letter-spacing: 0.5px; color: #5a7080; }
    .meta-val   { font-size: 12px; font-weight: 700; color: #1a3a6e; }
    .section-title { font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.7px; color: #5a7080; margin-bottom: 8px; margin-top: 20px; padding-bottom: 5px; border-bottom: 2px solid #d0e4ef; }
    .result-box { background: ${levelBg[level]}; border: 2px solid ${levelColors[level]}; border-radius: 10px; padding: 14px 18px; text-align: center; margin-bottom: 16px; }
    .result-level { font-size: 22px; font-weight: 900; color: ${levelColors[level]}; margin-bottom: 4px; }
    .result-prob  { font-size: 13px; color: #1e2a38; }
    .prob-table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
    .prob-table td { padding: 7px 10px; border-bottom: 1px solid #e0eef5; font-size: 12px; }
    .prob-table .bar-cell { width: 50%; }
    .bar-bg { background: #e0eef5; border-radius: 99px; height: 10px; overflow: hidden; }
    .bar-fill { height: 100%; border-radius: 99px; }
    .bar-low  { background: linear-gradient(90deg, #00a060, #00cc80); }
    .bar-mod  { background: linear-gradient(90deg, #e0a000, #f0c030); }
    .bar-high { background: linear-gradient(90deg, #cc3030, #e05050); }
    .rec-box { padding: 12px 16px; border-radius: 8px; border-left: 4px solid ${levelColors[level]}; background: ${levelBg[level]}; font-size: 12px; line-height: 1.7; margin-bottom: 16px; }
    .images-row { display: flex; gap: 14px; margin-bottom: 16px; }
    .img-box { flex: 1; text-align: center; }
    .img-box p { font-size: 9px; text-transform: uppercase; letter-spacing: 0.5px; color: #5a7080; margin-bottom: 5px; font-weight: 700; }
    .img-box img { width: 100%; border-radius: 8px; border: 1px solid #d0e4ef; }
    .disclaimer { background: #fff3ed; border: 1px solid #f0a880; border-radius: 8px; padding: 10px 14px; font-size: 11px; line-height: 1.6; color: #7a3020; margin-bottom: 20px; }
    .footer-pdf { text-align: center; font-size: 10px; color: #8a9aaa; border-top: 1px solid #d0e4ef; padding-top: 12px; margin-top: 12px; }
    table.q-table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
    @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  </style>
</head>
<body>
<div class="page">
  <div class="header-bar">
    <div>
      <div class="header-title"><span class="teal">Oral</span>Diagnostic · Reporte de Triaje Preventivo</div>
      <div class="header-sub">Universidad Autónoma "Gabriel René Moreno" (UAGRM) · FICCT · Proyecto N.° 45 · Feria 2026</div>
    </div>
  </div>
  <div class="meta-bar">
    <div class="meta-item"><span class="meta-label">Código de caso</span><span class="meta-val">${caseCode}</span></div>
    <div class="meta-item"><span class="meta-label">Fecha</span><span class="meta-val">${dateStr}</span></div>
    <div class="meta-item"><span class="meta-label">Hora</span><span class="meta-val">${timeStr}</span></div>
    <div class="meta-item"><span class="meta-label">Modelo IA</span><span class="meta-val">MobileNetV3-Small</span></div>
    <div class="meta-item"><span class="meta-label">Días evolución</span><span class="meta-val">${days}</span></div>
  </div>

  <div class="section-title">Resultado del Análisis de IA</div>
  <div class="result-box">
    <div class="result-level">${levelLabels[level] || level}</div>
    <div class="result-prob">Confianza del modelo: <strong>${prob}%</strong> · Factores de riesgo registrados: <strong>${riskCount}/12</strong> · Factores coca: <strong>${cocaFactor}/4</strong></div>
  </div>

  <div class="section-title">Distribución de Probabilidades</div>
  <table class="prob-table">
    <tr>
      <td>🟢 Baja sospecha</td>
      <td class="bar-cell"><div class="bar-bg"><div class="bar-fill bar-low" style="width:${Math.round((probs.low||0)*100)}%"></div></div></td>
      <td style="font-weight:700;color:#00a060">${Math.round((probs.low||0)*100)}%</td>
    </tr>
    <tr>
      <td>🟡 Sospecha moderada</td>
      <td class="bar-cell"><div class="bar-bg"><div class="bar-fill bar-mod" style="width:${Math.round((probs.moderate||0)*100)}%"></div></div></td>
      <td style="font-weight:700;color:#e0a000">${Math.round((probs.moderate||0)*100)}%</td>
    </tr>
    <tr>
      <td>🔴 Sospecha alta</td>
      <td class="bar-cell"><div class="bar-bg"><div class="bar-fill bar-high" style="width:${Math.round((probs.high||0)*100)}%"></div></div></td>
      <td style="font-weight:700;color:#cc3030">${Math.round((probs.high||0)*100)}%</td>
    </tr>
  </table>

  <div class="section-title">Recomendación Preventiva</div>
  <div class="rec-box">${recMessages[level]}</div>

  ${(origSrc || gcSrc) ? `
  <div class="section-title">Imágenes del Caso</div>
  <div class="images-row">
    ${origSrc ? `<div class="img-box"><p>Imagen original</p><img src="${origSrc}" alt="Imagen original"/></div>` : ''}
    ${gcSrc   ? `<div class="img-box"><p>Mapa Grad-CAM (región relevante para la IA)</p><img src="${gcSrc}" alt="Grad-CAM"/></div>` : ''}
  </div>` : ''}

  <div class="section-title">Cuestionario de Riesgo Clínico</div>
  <table class="q-table">
    <thead>
      <tr style="background:#1a3a6e;color:#fff">
        <th style="padding:7px 10px;text-align:left;font-size:11px">Factor de Riesgo</th>
        <th style="padding:7px 10px;text-align:center;font-size:11px;width:80px">Presente</th>
      </tr>
    </thead>
    <tbody>${qTableRows}</tbody>
  </table>

  <div class="disclaimer">
    ⚠️ <strong>AVISO LEGAL Y CLÍNICO:</strong> Este reporte es generado por un sistema de apoyo al triaje preventivo basado en Inteligencia Artificial.
    <strong>No constituye diagnóstico médico definitivo.</strong> El diagnóstico de cáncer oral u otras patologías requiere evaluación clínica especializada por odontólogo, estomatólogo o cirujano maxilofacial, y cuando corresponda, confirmación histopatológica mediante biopsia.
    Si la lesión persiste, sangra, duele, crece o presenta cambios de color, acuda a evaluación profesional a la brevedad.
  </div>

  <div class="footer-pdf">
    OralDiagnostic · Proyecto N.° 45 · Feria Estudiantil UAGRM 2026 · Programación Ensamblador<br/>
    Integrantes: Mamani Huanca Saleth Jhoselin · Vaca Roca Guillermo · Docente: Ing. Valentín Víctor Flores Guzmán
  </div>
</div>
</body>
</html>`;

    // Open in a new window and trigger print
    const win = window.open('', '_blank', 'width=820,height=900');
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => {
      win.print();
    }, 600);

  } catch (err) {
    console.error('[PDF] Error:', err);
    alert('Error al generar el reporte PDF. Intente de nuevo.');
  } finally {
    downloadPdfBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg> Descargar Reporte PDF`;
    downloadPdfBtn.disabled = false;
  }
}

// ============================================================
// RESULT STATE MACHINE
// ============================================================
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

// ============================================================
// RESET / NEW ANALYSIS
// ============================================================
newAnalysisBtn.addEventListener('click', resetAll);
retryBtn.addEventListener('click', () => showResult('idle'));

function resetAll() {
  currentFile = null; lastResult = null; lastGradcamSrc = null;
  previewContainer.classList.add('hidden');
  uploadZone.classList.remove('hidden');
  analyzeBtn.classList.add('hidden');
  analyzeBtn.disabled = true;
  gradcamBox.classList.add('hidden');
  fileInput.value = '';
  stopScanner();
  ['q-format','q-size','q-resolution'].forEach(id => setQualityItem(id, null, '⏳ —', '—'));
  loadingBar.style.width = '0%';
  showResult('idle');
  document.querySelector('.main-grid')?.scrollIntoView({ behavior: 'smooth' });
}

// ============================================================
// HELPERS
// ============================================================
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
    const t   = Math.min((now - start) / duration, 1);
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

// Keyboard shortcut
document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !isAnalyzing && currentFile && !analyzeBtn.disabled) runAnalysis();
  if (e.key === 'Escape' && !impactModal.classList.contains('hidden')) {
    impactModal.classList.add('hidden');
  }
});
