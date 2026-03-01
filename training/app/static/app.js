const modelSelect = document.getElementById('modelSelect');
const modelState = document.getElementById('modelState');
const resultEl = document.getElementById('result');
const fileInput = document.getElementById('fileInput');
const bucketEl = document.getElementById('bucket');
const prefixEl = document.getElementById('prefix');
const statusBanner = document.getElementById('statusBanner');
const modelSummary = document.getElementById('modelSummary');
const video = document.getElementById('video');
let captureCanvas = document.getElementById('captureCanvas');
let videoOverlay = document.getElementById('videoOverlay');
let uploadPreview = document.getElementById('uploadPreview');
let uploadOverlay = document.getElementById('uploadOverlay');
const refreshBtn = document.getElementById('refreshBtn');
const activateBtn = document.getElementById('activateBtn');
const uploadInferBtn = document.getElementById('uploadInferBtn');
const startCamBtn = document.getElementById('startCamBtn');
let stopCamBtn = document.getElementById('stopCamBtn');
const captureBtn = document.getElementById('captureBtn');
const toggleLiveBtn = document.getElementById('toggleLiveBtn');

let liveTimer = null;
let cameraStream = null;
let uploadPreviewUrl = null;

function ensureUiElements() {
  if (!video) return;

  const videoWrap = video.parentElement;

  if (!videoOverlay && videoWrap) {
    const overlay = document.createElement('canvas');
    overlay.id = 'videoOverlay';
    overlay.className = 'hidden';
    videoWrap.appendChild(overlay);
    videoOverlay = overlay;
  }

  if (!captureCanvas) {
    const hiddenCanvas = document.createElement('canvas');
    hiddenCanvas.id = 'captureCanvas';
    hiddenCanvas.className = 'hidden';
    video.parentElement?.insertAdjacentElement('afterend', hiddenCanvas);
    captureCanvas = hiddenCanvas;
  }

  if (!stopCamBtn && startCamBtn) {
    const btn = document.createElement('button');
    btn.id = 'stopCamBtn';
    btn.textContent = 'Stop Camera';
    btn.disabled = true;
    startCamBtn.insertAdjacentElement('afterend', btn);
    stopCamBtn = btn;
  }

  const imageWrap = document.querySelector('.image-wrap');
  if (imageWrap && !uploadPreview) {
    const img = document.createElement('img');
    img.id = 'uploadPreview';
    img.alt = 'Uploaded preview';
    img.className = 'hidden';
    imageWrap.appendChild(img);
    uploadPreview = img;
  }

  if (imageWrap && !uploadOverlay) {
    const overlay = document.createElement('canvas');
    overlay.id = 'uploadOverlay';
    overlay.className = 'hidden';
    imageWrap.appendChild(overlay);
    uploadOverlay = overlay;
  }
}

ensureUiElements();

function setStatus(message, type = 'neutral') {
  statusBanner.textContent = message;
  statusBanner.className = `status status-${type}`;
}

function syncCameraControls() {
  const hasStream = !!cameraStream;
  startCamBtn.disabled = hasStream;
  if (stopCamBtn) stopCamBtn.disabled = !hasStream;
  captureBtn.disabled = !hasStream;
  toggleLiveBtn.disabled = !hasStream;
}

function setButtonsDisabled(disabled) {
  refreshBtn.disabled = disabled;
  activateBtn.disabled = disabled;
  uploadInferBtn.disabled = disabled;
  if (disabled) {
    startCamBtn.disabled = true;
    if (stopCamBtn) stopCamBtn.disabled = true;
    captureBtn.disabled = true;
    toggleLiveBtn.disabled = true;
  } else {
    syncCameraControls();
  }
}

async function runAction(label, fn) {
  setButtonsDisabled(true);
  setStatus(label, 'working');
  try {
    await fn();
    setStatus(`${label} complete`, 'success');
  } catch (err) {
    const message = err?.message || String(err);
    setStatus(message, 'error');
    showResult({ error: message });
  } finally {
    setButtonsDisabled(false);
  }
}

async function api(path, options = {}) {
  const res = await fetch(path, options);
  const contentType = (res.headers.get('content-type') || '').toLowerCase();
  let body;

  if (contentType.includes('application/json')) {
    body = await res.json();
  } else {
    const text = await res.text();
    try {
      body = JSON.parse(text);
    } catch {
      body = { error: text || `HTTP ${res.status}` };
    }
  }

  if (!res.ok) {
    const detail = body?.detail || body?.error || JSON.stringify(body);
    throw new Error(detail);
  }
  return body;
}

function showResult(obj) {
  resultEl.textContent = JSON.stringify(obj, null, 2);
}

function drawDetections(ctx, detections) {
  if (!detections || detections.length === 0) return;

  const lineWidth = Math.max(2, Math.round(Math.min(ctx.canvas.width, ctx.canvas.height) * 0.004));
  const fontSize = Math.max(12, Math.round(Math.min(ctx.canvas.width, ctx.canvas.height) * 0.022));

  for (const detection of detections) {
    const [x1, y1, x2, y2] = detection.xyxy;
    const width = x2 - x1;
    const height = y2 - y1;
    const label = `${detection.class_name} ${(detection.confidence * 100).toFixed(1)}%`;

    ctx.strokeStyle = '#00e676';
    ctx.lineWidth = lineWidth;
    ctx.strokeRect(x1, y1, width, height);

    ctx.font = `${fontSize}px Arial`;
    ctx.textBaseline = 'top';

    const textWidth = ctx.measureText(label).width;
    const labelHeight = fontSize + 6;
    const labelX = x1;
    const labelY = Math.max(0, y1 - labelHeight);

    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(labelX, labelY, textWidth + 8, labelHeight);

    ctx.fillStyle = '#ffffff';
    ctx.fillText(label, labelX + 4, labelY + 3);
  }
}

function clearCanvas(canvasEl) {
  if (!canvasEl) return;
  const ctx = canvasEl.getContext('2d');
  ctx.clearRect(0, 0, canvasEl.width || 0, canvasEl.height || 0);
}

function renderVideoDetections(detections) {
  if (!videoOverlay || !video.videoWidth || !video.videoHeight) return;
  videoOverlay.width = video.videoWidth;
  videoOverlay.height = video.videoHeight;
  videoOverlay.classList.remove('hidden');

  const ctx = videoOverlay.getContext('2d');
  ctx.clearRect(0, 0, videoOverlay.width, videoOverlay.height);
  drawDetections(ctx, detections || []);
}

function renderUploadDetections(resultData) {
  if (!uploadOverlay || !uploadPreview) return;
  const detections = resultData?.result?.detections || [];
  uploadOverlay.classList.remove('hidden');
  uploadOverlay.width = uploadPreview.naturalWidth;
  uploadOverlay.height = uploadPreview.naturalHeight;

  const ctx = uploadOverlay.getContext('2d');
  ctx.clearRect(0, 0, uploadOverlay.width, uploadOverlay.height);
  drawDetections(ctx, detections);
}

async function refreshModels() {
  const body = {
    artifacts_bucket: bucketEl.value.trim(),
    artifacts_prefix: prefixEl.value.trim() || 'output',
    max_models: 30,
    region: 'us-east-1'
  };
  const data = await api('/api/models/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  showResult(data);
  await loadModels();
}

async function loadModels() {
  const data = await api('/api/models');
  modelSelect.innerHTML = '';
  for (const model of data.models) {
    const opt = document.createElement('option');
    opt.value = model;
    opt.textContent = model;
    modelSelect.appendChild(opt);
  }
  if (data.models.length > 0) {
    modelSummary.textContent = `${data.models.length} model(s) available.`;
    if (data.active_model) {
      modelSummary.textContent += ` Active: ${data.active_model} (${data.active_kind || 'unknown'}).`;
    }
  } else {
    modelSummary.textContent = 'No models found. Enter bucket/prefix and refresh from S3.';
  }
  modelState.textContent = JSON.stringify(data, null, 2);
}

async function activateModel() {
  const model_name = modelSelect.value;
  const data = await api('/api/models/select', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model_name })
  });
  showResult(data);
  await loadModels();

  if (data.kind !== 'detector') {
    clearCanvas(videoOverlay);
    if (uploadOverlay) uploadOverlay.classList.add('hidden');
  }
}

async function inferBlob(blob) {
  const fd = new FormData();
  fd.append('file', blob, 'frame.jpg');
  const data = await api('/api/infer', { method: 'POST', body: fd });
  showResult(data);
  return data;
}

async function inferUpload() {
  if (!fileInput.files.length) {
    alert('Choose an image first.');
    return;
  }

  if (uploadPreviewUrl) {
    URL.revokeObjectURL(uploadPreviewUrl);
  }
  if (uploadPreview) {
    uploadPreviewUrl = URL.createObjectURL(fileInput.files[0]);
    uploadPreview.src = uploadPreviewUrl;
    uploadPreview.classList.remove('hidden');
  }

  await new Promise((resolve) => {
    if (!uploadPreview || uploadPreview.complete) {
      resolve();
      return;
    }
    uploadPreview.onload = () => resolve();
  });

  const data = await inferBlob(fileInput.files[0]);
  if (data.kind === 'detector') {
    renderUploadDetections(data);
  } else {
    if (uploadOverlay) uploadOverlay.classList.add('hidden');
  }
}

async function startCamera() {
  if (cameraStream) {
    return;
  }

  cameraStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
  video.srcObject = cameraStream;

  await new Promise((resolve) => {
    if (video.videoWidth && video.videoHeight) {
      resolve();
      return;
    }
    video.onloadedmetadata = () => resolve();
  });

  if (videoOverlay) {
    videoOverlay.width = video.videoWidth;
    videoOverlay.height = video.videoHeight;
    videoOverlay.classList.remove('hidden');
  }
  syncCameraControls();
}

function stopCamera() {
  if (liveTimer) {
    clearInterval(liveTimer);
    liveTimer = null;
    toggleLiveBtn.textContent = 'Start Live (1 fps)';
  }

  if (cameraStream) {
    for (const track of cameraStream.getTracks()) {
      track.stop();
    }
    cameraStream = null;
  }

  video.srcObject = null;
  clearCanvas(videoOverlay);
  if (videoOverlay) videoOverlay.classList.add('hidden');
  syncCameraControls();
  setStatus('Camera stopped', 'neutral');
}

async function captureAndInfer() {
  if (!video.videoWidth) {
    alert('Camera not started yet.');
    return;
  }
  captureCanvas.width = video.videoWidth;
  captureCanvas.height = video.videoHeight;
  const ctx = captureCanvas.getContext('2d');
  ctx.drawImage(video, 0, 0, captureCanvas.width, captureCanvas.height);
  const blob = await new Promise(resolve => captureCanvas.toBlob(resolve, 'image/jpeg', 0.9));
  const data = await inferBlob(blob);

  if (data.kind === 'detector') {
    renderVideoDetections(data?.result?.detections || []);
  } else {
    clearCanvas(videoOverlay);
  }
}

function toggleLive() {
  if (!cameraStream) {
    setStatus('Start camera before using live mode', 'error');
    return;
  }

  if (liveTimer) {
    clearInterval(liveTimer);
    liveTimer = null;
    toggleLiveBtn.textContent = 'Start Live (1 fps)';
    setStatus('Live capture stopped', 'neutral');
    return;
  }
  liveTimer = setInterval(() => {
    captureAndInfer().catch(err => {
      setStatus(err.message, 'error');
      showResult({ error: err.message });
    });
  }, 1000);
  toggleLiveBtn.textContent = 'Stop Live';
  setStatus('Live capture started (1 fps)', 'working');
}

refreshBtn.addEventListener('click', () => runAction('Refreshing models', refreshModels));
activateBtn.addEventListener('click', () => runAction('Activating model', activateModel));
uploadInferBtn.addEventListener('click', () => runAction('Running upload inference', inferUpload));
startCamBtn.addEventListener('click', () => runAction('Starting camera', startCamera));
if (stopCamBtn) {
  stopCamBtn.addEventListener('click', stopCamera);
}
captureBtn.addEventListener('click', () => runAction('Capturing frame and running inference', captureAndInfer));
toggleLiveBtn.addEventListener('click', toggleLive);

window.addEventListener('beforeunload', stopCamera);

syncCameraControls();

runAction('Loading models', loadModels);
