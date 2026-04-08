// main.js - Movers4Hire | Estimator + Photo Upload (Final Version)


// ====================== PRICING CONFIG ======================
const pricingConfig = {
  baseHourlyByMovers: { 2: 120, 3: 165, 4: 220 },
  sizeMultipliers: { studio: 1.0, onebed: 1.1, threebed: 1.22, fourbed: 1.38, office: 1.3 },
  mileageRate: 3.25,
  packingLabor: 95,
  packingSupplies: 45,
  specialtyFee: 150,
  minimumHours: { studio: 2.5, onebed: 3, threebed: 5, fourbed: 7, office: 4 }
};

// ====================== PHOTO LIMITS ======================
const PHOTO_LIMITS = {
  maxFiles: 12,
  maxFileSizeMB: 8,
  maxTotalSizeMB: 40
};

// ====================== DOM REFERENCES ======================
const els = {
  moveSize: document.getElementById('moveSize'),
  movers: document.getElementById('movers'),
  hours: document.getElementById('hours'),
  miles: document.getElementById('miles'),
  truckFee: document.getElementById('truckFee'),
  travelFee: document.getElementById('travelFee'),
  packingHelp: document.getElementById('packingHelp'),
  specialty: document.getElementById('specialty'),
  addons: Array.from(document.querySelectorAll('.addon')),

  estimateTotal: document.getElementById('estimateTotal'),
  grandTotalRow: document.getElementById('grandTotalRow'),
  breakdown: document.getElementById('breakdown'),
  hourlyRateDisplay: document.getElementById('hourlyRateDisplay'),
  mileageRateDisplay: document.getElementById('mileageRateDisplay'),
  timeEstimateText: document.getElementById('timeEstimateText'),

  recalculateBtn: document.getElementById('recalculateBtn'),
  resetBtn: document.getElementById('resetBtn'),
  year: document.getElementById('year')
};

const photoEls = {
  upload: document.getElementById('photoUpload'),
  dropzone: document.getElementById('uploadDropzone'),
  previewGrid: document.getElementById('photoPreviewGrid'),
  count: document.getElementById('photoCount'),
  size: document.getElementById('photoSize'),
  confidenceLevel: document.getElementById('confidenceLevel'),
  guidance: document.getElementById('photoGuidance'),
  note: document.getElementById('photoEstimateNote')
};

let uploadedPhotos = [];

// ====================== UTILITIES ======================
const currency = (value) => 
  new Intl.NumberFormat('en-US', { 
    style: 'currency', 
    currency: 'USD', 
    maximumFractionDigits: 0 
  }).format(Math.round(value));

const debounce = (fn, delay = 280) => {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), delay);
  };
};

// ====================== ESTIMATOR ======================
function getEstimatedHours(size, inputHours) {
  const min = pricingConfig.minimumHours[size] || 3;
  return Math.max(Number(inputHours) || min, min);
}

function calculateEstimate() {
  if (!els.moveSize || !els.movers) return;

  const moveSize = els.moveSize.value;
  const movers = Number(els.movers.value);
  const miles = Math.max(0, Number(els.miles?.value) || 0);
  const truckFee = Math.max(0, Number(els.truckFee?.value) || 0);
  const travelFee = Math.max(0, Number(els.travelFee?.value) || 0);

  let adjustedHours = getEstimatedHours(moveSize, els.hours?.value);

  if (els.hours && Number(els.hours.value) !== adjustedHours) {
    els.hours.value = adjustedHours;
  }

  const baseHourly = pricingConfig.baseHourlyByMovers[movers] || 165;
  const sizeMultiplier = pricingConfig.sizeMultipliers[moveSize] || 1;
  const hourlyRate = Math.round(baseHourly * sizeMultiplier);

  const laborCost = hourlyRate * adjustedHours;
  const mileageCost = miles * pricingConfig.mileageRate;
  const packingCost = els.packingHelp?.checked ? pricingConfig.packingLabor + pricingConfig.packingSupplies : 0;
  const specialtyCost = els.specialty?.checked ? pricingConfig.specialtyFee : 0;

  const selectedAddons = (els.addons || [])
    .filter(addon => addon.checked)
    .map(addon => ({ name: addon.dataset.name, amount: Number(addon.value) }));

  const addonsTotal = selectedAddons.reduce((sum, item) => sum + item.amount, 0);

  const total = Math.round(laborCost + mileageCost + truckFee + travelFee + packingCost + specialtyCost + addonsTotal);

  const breakdownItems = [
    { label: `Labor (${adjustedHours} hrs @ ${currency(hourlyRate)}/hr)`, value: laborCost },
    { label: `Mileage (${miles} mi @ ${currency(pricingConfig.mileageRate)}/mi)`, value: mileageCost },
    { label: 'Truck fee', value: truckFee },
    { label: 'Travel / dispatch', value: travelFee }
  ];

  if (packingCost) breakdownItems.push({ label: 'Packing service + supplies', value: packingCost });
  if (specialtyCost) breakdownItems.push({ label: 'Specialty item handling', value: specialtyCost });
  selectedAddons.forEach(item => breakdownItems.push({ label: item.name, value: item.amount }));

  if (els.breakdown) {
    els.breakdown.innerHTML = breakdownItems.map(item => `
      <div class="summary-row">
        <span>${item.label}</span>
        <span>${currency(item.value)}</span>
      </div>
    `).join('');
  }

  els.estimateTotal && (els.estimateTotal.textContent = currency(total));
  els.grandTotalRow && (els.grandTotalRow.textContent = currency(total));
  els.hourlyRateDisplay && (els.hourlyRateDisplay.textContent = `${currency(hourlyRate)} / hr`);
  els.mileageRateDisplay && (els.mileageRateDisplay.textContent = `${currency(pricingConfig.mileageRate)} / mile`);

  if (els.timeEstimateText) {
    els.timeEstimateText.textContent = 
      `Suggested minimum: ${pricingConfig.minimumHours[moveSize]} hours • ${movers} mover${movers > 1 ? 's' : ''}`;
  }
}

// ====================== RESET ======================
function resetEstimator() {
  if (!els.moveSize) return;

  els.moveSize.value = 'studio';
  els.movers && (els.movers.value = '3');
  els.miles && (els.miles.value = '12');
  els.truckFee && (els.truckFee.value = '95');
  els.travelFee && (els.travelFee.value = '45');
  els.packingHelp && (els.packingHelp.checked = false);
  els.specialty && (els.specialty.checked = false);
  (els.addons || []).forEach(addon => addon.checked = false);

  if (els.hours) els.hours.value = pricingConfig.minimumHours.studio;

  calculateEstimate();
}

// ====================== PHOTO UPLOAD ======================
function formatFileSize(bytes) {
  return bytes === 0 ? '0 MB' : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getConfidenceData(count) {
  if (count === 0) return { level: 'Basic', guidance: 'Add room photos', note: 'Upload wide shots of rooms, boxes, and large furniture.' };
  if (count <= 2) return { level: 'Low', guidance: 'Add more rooms', note: 'A couple photos help, but wider coverage improves accuracy.' };
  if (count <= 5) return { level: 'Medium', guidance: 'Good start', note: 'This gives a better preliminary estimate.' };
  if (count <= 9) return { level: 'Strong', guidance: 'Well documented', note: 'Great context for the moving team.' };
  return { level: 'High', guidance: 'Highly informed', note: 'Excellent coverage — this will help a lot!' };
}

function renderPhotoSummary() {
  if (!photoEls.count) return;
  const totalBytes = uploadedPhotos.reduce((sum, f) => sum + f.size, 0);
  const conf = getConfidenceData(uploadedPhotos.length);

  photoEls.count.textContent = uploadedPhotos.length;
  photoEls.size && (photoEls.size.textContent = formatFileSize(totalBytes));
  photoEls.confidenceLevel && (photoEls.confidenceLevel.textContent = conf.level);
  photoEls.guidance && (photoEls.guidance.textContent = conf.guidance);
  photoEls.note && (photoEls.note.textContent = conf.note);
}

function renderPhotoPreviews() {
  if (!photoEls.previewGrid) return;
  photoEls.previewGrid.innerHTML = '';

  uploadedPhotos.forEach((file, index) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const card = document.createElement('article');
      card.className = 'photo-preview-card';
      card.innerHTML = `
        <img src="${e.target.result}" alt="Move photo ${index + 1}">
        <div class="photo-preview-meta">
          <strong>${file.name}</strong>
          <span>${formatFileSize(file.size)}</span>
        </div>
        <button class="remove-photo" data-index="${index}" aria-label="Remove this photo">×</button>
      `;
      photoEls.previewGrid.appendChild(card);
    };
    reader.readAsDataURL(file);
  });
}

function syncPhotoInput() {
  if (!photoEls.upload) return;
  const dt = new DataTransfer();
  uploadedPhotos.forEach(file => dt.items.add(file));
  photoEls.upload.files = dt.files;
}

function removePhoto(index) {
  uploadedPhotos.splice(index, 1);
  syncPhotoInput();
  renderPhotoPreviews();
  renderPhotoSummary();
}

function handleFiles(fileList) {
  const valid = Array.from(fileList).filter(f => f.type.startsWith('image/'));

  const newFiles = valid.filter(f => !uploadedPhotos.some(ex => 
    ex.name === f.name && ex.size === f.size && ex.lastModified === f.lastModified
  ));

  if (newFiles.length === 0) return;

  // === LIMITS ===
  let filesToAdd = newFiles;

  // Per-file size limit
  filesToAdd = filesToAdd.filter(file => {
    const sizeMB = file.size / (1024 * 1024);
    if (sizeMB > PHOTO_LIMITS.maxFileSizeMB) {
      alert(`"${file.name}" is too large (${sizeMB.toFixed(1)} MB). Maximum allowed is ${PHOTO_LIMITS.maxFileSizeMB} MB per photo.`);
      return false;
    }
    return true;
  });

  // Total file count limit
  if (uploadedPhotos.length + filesToAdd.length > PHOTO_LIMITS.maxFiles) {
    alert(`You can upload a maximum of ${PHOTO_LIMITS.maxFiles} photos at once.`);
    filesToAdd = filesToAdd.slice(0, PHOTO_LIMITS.maxFiles - uploadedPhotos.length);
  }

  // Total size limit (rough check)
  const currentTotalMB = uploadedPhotos.reduce((sum, f) => sum + f.size, 0) / (1024 * 1024);
  const addedMB = filesToAdd.reduce((sum, f) => sum + f.size, 0) / (1024 * 1024);
  if (currentTotalMB + addedMB > PHOTO_LIMITS.maxTotalSizeMB) {
    alert(`Total upload size would exceed ${PHOTO_LIMITS.maxTotalSizeMB} MB. Please remove some photos.`);
    return;
  }

  if (filesToAdd.length === 0) return;

  uploadedPhotos.push(...filesToAdd);
  syncPhotoInput();
  renderPhotoPreviews();
  renderPhotoSummary();
}

// ====================== INIT FUNCTIONS ======================
function initEstimator() {
  const debouncedCalc = debounce(calculateEstimate);

  [els.moveSize, els.movers, els.packingHelp, els.specialty, ...els.addons]
    .filter(Boolean)
    .forEach(el => el.addEventListener('change', calculateEstimate));

  [els.hours, els.miles, els.truckFee, els.travelFee]
    .filter(Boolean)
    .forEach(el => el.addEventListener('input', debouncedCalc));

  els.recalculateBtn?.addEventListener('click', calculateEstimate);
  els.resetBtn?.addEventListener('click', resetEstimator);

  els.year && (els.year.textContent = new Date().getFullYear());
}

function initPhotoUpload() {
  if (!photoEls.upload || !photoEls.dropzone) return;

  photoEls.upload.addEventListener('change', e => e.target.files && handleFiles(e.target.files));

  const dz = photoEls.dropzone;
  ['dragenter', 'dragover'].forEach(ev => dz.addEventListener(ev, e => { 
    e.preventDefault(); 
    dz.classList.add('dragover'); 
  }));

  ['dragleave', 'drop'].forEach(ev => dz.addEventListener(ev, e => { 
    e.preventDefault(); 
    dz.classList.remove('dragover'); 
  }));

  dz.addEventListener('drop', e => {
    if (e.dataTransfer?.files) handleFiles(e.dataTransfer.files);
  });

  // Remove photo (event delegation)
  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('remove-photo')) {
      const idx = parseInt(e.target.dataset.index, 10);
      if (!isNaN(idx)) removePhoto(idx);
    }
  });
}

function initScrollReveal() {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) entry.target.classList.add('visible');
    });
  }, { threshold: 0.15 });

  document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
}

// ====================== START ======================
function init() {
  initEstimator();
  initPhotoUpload();
  initScrollReveal();

  calculateEstimate();
  renderPhotoSummary();
}

document.addEventListener('DOMContentLoaded', init);