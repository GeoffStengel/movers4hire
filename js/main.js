// main.js - Movers4Hire | Estimator + Photo Upload + Branded PDF

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

  customerName: document.getElementById('customerName'),
  customerEmail: document.getElementById('customerEmail'),
  moveDate: document.getElementById('moveDate'),
  originAddress: document.getElementById('originAddress'),
  destinationAddress: document.getElementById('destinationAddress'),

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

function safeValue(value, fallback = 'Not provided') {
  return value && String(value).trim() ? String(value).trim() : fallback;
}

function formatDisplayDate(dateValue) {
  if (!dateValue) return 'Not provided';

  const parsed = new Date(`${dateValue}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return dateValue;

  return parsed.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

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

  const adjustedHours = getEstimatedHours(moveSize, els.hours?.value);

  if (els.hours && Number(els.hours.value) !== adjustedHours) {
    els.hours.value = adjustedHours;
  }

  const baseHourly = pricingConfig.baseHourlyByMovers[movers] || 165;
  const sizeMultiplier = pricingConfig.sizeMultipliers[moveSize] || 1;
  const hourlyRate = Math.round(baseHourly * sizeMultiplier);

  const laborCost = hourlyRate * adjustedHours;
  const mileageCost = miles * pricingConfig.mileageRate;
  const packingCost = els.packingHelp?.checked
    ? pricingConfig.packingLabor + pricingConfig.packingSupplies
    : 0;
  const specialtyCost = els.specialty?.checked ? pricingConfig.specialtyFee : 0;

  const selectedAddons = (els.addons || [])
    .filter((addon) => addon.checked)
    .map((addon) => ({
      name: addon.dataset.name,
      amount: Number(addon.value)
    }));

  const addonsTotal = selectedAddons.reduce((sum, item) => sum + item.amount, 0);

  const total = Math.round(
    laborCost +
    mileageCost +
    truckFee +
    travelFee +
    packingCost +
    specialtyCost +
    addonsTotal
  );

  const breakdownItems = [
    {label: `Labor (${adjustedHours} hrs • ${movers} mover${movers > 1 ? 's' : ''} @ ${currency(hourlyRate)}/hr)`, value: laborCost},
    { label: `Mileage (${miles} mi @ ${currency(pricingConfig.mileageRate)}/mi)`, value: mileageCost },
    { label: 'Truck fee', value: truckFee },
    { label: 'Travel / dispatch', value: travelFee }
  ];

  if (packingCost) {
    breakdownItems.push({ label: 'Packing service + supplies', value: packingCost });
  }

  if (specialtyCost) {
    breakdownItems.push({ label: 'Specialty item handling', value: specialtyCost });
  }

  selectedAddons.forEach((item) => {
    breakdownItems.push({ label: item.name, value: item.amount });
  });

  if (els.breakdown) {
    els.breakdown.innerHTML = breakdownItems.map((item) => `
      <div class="summary-row">
        <span>${item.label}</span>
        <span>${currency(item.value)}</span>
      </div>
    `).join('');
  }

  if (els.estimateTotal) els.estimateTotal.textContent = currency(total);
  if (els.grandTotalRow) els.grandTotalRow.textContent = currency(total);
  if (els.hourlyRateDisplay) els.hourlyRateDisplay.textContent = `${currency(hourlyRate)} / hr`;
  if (els.mileageRateDisplay) els.mileageRateDisplay.textContent = `${currency(pricingConfig.mileageRate)} / mile`;

  if (els.timeEstimateText) {
    els.timeEstimateText.textContent =
      `Suggested minimum: ${pricingConfig.minimumHours[moveSize]} hours • ${movers} mover${movers > 1 ? 's' : ''}`;
  }
}

// ====================== RESET ======================
function resetEstimator() {
  if (!els.moveSize) return;

  els.moveSize.value = 'studio';
  if (els.movers) els.movers.value = '3';
  if (els.hours) els.hours.value = pricingConfig.minimumHours.studio;
  if (els.miles) els.miles.value = '12';
  if (els.truckFee) els.truckFee.value = '95';
  if (els.travelFee) els.travelFee.value = '45';
  if (els.packingHelp) els.packingHelp.checked = false;
  if (els.specialty) els.specialty.checked = false;
  (els.addons || []).forEach((addon) => { addon.checked = false; });

  if (els.customerName) els.customerName.value = '';
  if (els.customerEmail) els.customerEmail.value = '';
  if (els.moveDate) els.moveDate.value = '';
  if (els.originAddress) els.originAddress.value = '';
  if (els.destinationAddress) els.destinationAddress.value = '';

  calculateEstimate();
}

// ====================== PHOTO UPLOAD HELPERS ======================
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

  photoEls.count.textContent = String(uploadedPhotos.length);
  if (photoEls.size) photoEls.size.textContent = formatFileSize(totalBytes);
  if (photoEls.confidenceLevel) photoEls.confidenceLevel.textContent = conf.level;
  if (photoEls.guidance) photoEls.guidance.textContent = conf.guidance;
  if (photoEls.note) photoEls.note.textContent = conf.note;
}

function syncPhotoInput() {
  if (!photoEls.upload) return;

  try {
    const dt = new DataTransfer();
    uploadedPhotos.forEach(file => dt.items.add(file));
    photoEls.upload.files = dt.files;
  } catch (err) {
    console.warn('Could not sync files to hidden input:', err);
  }
}

function createPhotoCard(file, index) {
  const card = document.createElement('article');
  card.className = 'photo-preview-card';
  card.dataset.index = String(index);

  card.innerHTML = `
    <img src="" alt="Move photo ${index + 1}">
    <div class="photo-preview-meta">
      <strong>${file.name}</strong>
      <span>${formatFileSize(file.size)}</span>
    </div>
    <button class="remove-photo" data-index="${index}" aria-label="Remove this photo" type="button">×</button>
  `;

  const img = card.querySelector('img');
  const reader = new FileReader();
  reader.onload = (e) => {
    img.src = e.target?.result || '';
  };
  reader.readAsDataURL(file);

  return card;
}

function renderPhotoPreviews() {
  if (!photoEls.previewGrid) return;
  photoEls.previewGrid.innerHTML = '';

  const fragment = document.createDocumentFragment();
  uploadedPhotos.forEach((file, index) => {
    fragment.appendChild(createPhotoCard(file, index));
  });
  photoEls.previewGrid.appendChild(fragment);
}

function removePhoto(index) {
  if (index < 0 || index >= uploadedPhotos.length) return;
  if (!photoEls.previewGrid) return;

  uploadedPhotos.splice(index, 1);
  syncPhotoInput();

  const cardToRemove = photoEls.previewGrid.querySelector(`.photo-preview-card[data-index="${index}"]`);

  if (cardToRemove) {
    cardToRemove.style.transition = 'opacity 180ms ease, transform 180ms ease';
    cardToRemove.style.opacity = '0';
    cardToRemove.style.transform = 'scale(0.95)';

    setTimeout(() => {
      cardToRemove.remove();

      const remainingCards = photoEls.previewGrid.querySelectorAll('.photo-preview-card');
      remainingCards.forEach((card, newIndex) => {
        card.dataset.index = String(newIndex);

        const removeBtn = card.querySelector('.remove-photo');
        if (removeBtn) removeBtn.dataset.index = String(newIndex);

        const img = card.querySelector('img');
        if (img) img.alt = `Move photo ${newIndex + 1}`;
      });

      renderPhotoSummary();
    }, 180);
  } else {
    renderPhotoPreviews();
    renderPhotoSummary();
  }
}

function handleFiles(fileList) {
  const valid = Array.from(fileList).filter(f => f.type.startsWith('image/'));

  const newFiles = valid.filter(f => !uploadedPhotos.some(ex =>
    ex.name === f.name &&
    ex.size === f.size &&
    ex.lastModified === f.lastModified
  ));

  if (newFiles.length === 0) return;

  let filesToAdd = newFiles;

  filesToAdd = filesToAdd.filter(file => {
    const sizeMB = file.size / (1024 * 1024);
    if (sizeMB > PHOTO_LIMITS.maxFileSizeMB) {
      alert(`"${file.name}" is too large (${sizeMB.toFixed(1)} MB). Maximum allowed is ${PHOTO_LIMITS.maxFileSizeMB} MB per photo.`);
      return false;
    }
    return true;
  });

  if (uploadedPhotos.length + filesToAdd.length > PHOTO_LIMITS.maxFiles) {
    alert(`You can upload a maximum of ${PHOTO_LIMITS.maxFiles} photos total.`);
    filesToAdd = filesToAdd.slice(0, PHOTO_LIMITS.maxFiles - uploadedPhotos.length);
  }

  const currentTotalMB = uploadedPhotos.reduce((sum, f) => sum + f.size, 0) / (1024 * 1024);
  const addedMB = filesToAdd.reduce((sum, f) => sum + f.size, 0) / (1024 * 1024);

  if (currentTotalMB + addedMB > PHOTO_LIMITS.maxTotalSizeMB) {
    alert(`Total upload size would exceed ${PHOTO_LIMITS.maxTotalSizeMB} MB. Please remove some photos.`);
    return;
  }

  if (filesToAdd.length === 0) return;

  const startIndex = uploadedPhotos.length;
  uploadedPhotos.push(...filesToAdd);
  syncPhotoInput();

  if (photoEls.previewGrid) {
    const fragment = document.createDocumentFragment();
    filesToAdd.forEach((file, offset) => {
      fragment.appendChild(createPhotoCard(file, startIndex + offset));
    });
    photoEls.previewGrid.appendChild(fragment);
  }

  renderPhotoSummary();
}

// ====================== SCROLL REVEAL ======================
function initScrollReveal() {
  const revealEls = document.querySelectorAll('.reveal');
  if (!revealEls.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) entry.target.classList.add('visible');
    });
  }, { threshold: 0.15 });

  revealEls.forEach((el) => observer.observe(el));
}

// ====================== HAMBURGER MENU ======================
function initHamburger() {
  const hamburger = document.getElementById('hamburger');
  const mobileMenu = document.getElementById('mobileMenu');

  if (!hamburger || !mobileMenu) return;

  hamburger.addEventListener('click', () => {
    const isOpen = hamburger.classList.toggle('active');
    mobileMenu.classList.toggle('open');
    hamburger.setAttribute('aria-expanded', String(isOpen));
    document.body.style.overflow = isOpen ? 'hidden' : '';
  });

  const mobileLinks = mobileMenu.querySelectorAll('a');
  mobileLinks.forEach(link => {
    link.addEventListener('click', () => {
      hamburger.classList.remove('active');
      mobileMenu.classList.remove('open');
      document.body.style.overflow = '';
      hamburger.setAttribute('aria-expanded', 'false');
    });
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && mobileMenu.classList.contains('open')) {
      hamburger.classList.remove('active');
      mobileMenu.classList.remove('open');
      document.body.style.overflow = '';
      hamburger.setAttribute('aria-expanded', 'false');
    }
  });
}

// ====================== PDF GENERATION - BRANDED ======================
function generateEstimateId() {
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomPart = Math.floor(1000 + Math.random() * 9000);
  return `M4H-${datePart}-${randomPart}`;
}

function generatePDF() {
  if (!els.estimateTotal || !els.breakdown) {
    alert('Please calculate an estimate first.');
    return;
  }

  if (!window.jspdf?.jsPDF) {
    alert('PDF library failed to load.');
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'pt', format: 'letter' });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 40;

  const brandBlue = [30, 58, 138];
  const brandTeal = [79, 209, 197];
  const darkText = [35, 35, 35];
  const mutedText = [110, 110, 110];
  const lightGray = [245, 247, 250];

  const today = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const estimateId = generateEstimateId();

  const moveSizeText =
    els.moveSize?.options[els.moveSize.selectedIndex]?.text || 'Not selected';

  const customerName = safeValue(els.customerName?.value, 'Customer');
  const customerEmail = safeValue(els.customerEmail?.value);
  const moveDate = formatDisplayDate(els.moveDate?.value);
  const originAddress = safeValue(els.originAddress?.value);
  const destinationAddress = safeValue(els.destinationAddress?.value);

  const moversText = `${els.movers?.value || '0'} movers`;
  const hoursText = `${els.hours?.value || '0'} hrs`;
  const milesText = `${els.miles?.value || '0'} mi`;
  const truckFeeText = els.truckFee?.value ? currency(Number(els.truckFee.value)) : '$0';
  const travelFeeText = els.travelFee?.value ? currency(Number(els.travelFee.value)) : '$0';

  const drawHeader = () => {
    doc.setFillColor(...brandBlue);
    doc.rect(0, 0, pageWidth, 90, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(255, 255, 255);
    doc.text('Movers4Hire', margin, 32);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text('Eugene, Oregon • Professional Moving Services', margin, 50);
    doc.text('(541) 555-0199 • hello@movers4hire.com', margin, 64);

    doc.setFontSize(9);
    doc.text(`Estimate Date: ${today}`, pageWidth - margin, 32, { align: 'right' });
    doc.text(`Estimate ID: ${estimateId}`, pageWidth - margin, 50, { align: 'right' });

    doc.setFillColor(...brandTeal);
    doc.rect(0, 90, pageWidth, 6, 'F');
  };

  const drawFooter = () => {
    const footerY = pageHeight - 50;

    doc.setDrawColor(220, 226, 232);
    doc.line(margin, footerY - 12, pageWidth - margin, footerY - 12);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...mutedText);
    doc.text(
      'Preliminary estimate. Final pricing may vary based on actual inventory and conditions.',
      margin,
      footerY
    );

    doc.text(
      'Movers4Hire • Eugene, Oregon',
      pageWidth / 2,
      pageHeight - 18,
      { align: 'center' }
    );
  };

  const ensureSpace = (needed, y) => {
    if (y + needed > pageHeight - 80) {
      drawFooter();
      doc.addPage();
      drawHeader();
      return 115;
    }
    return y;
  };

  drawHeader();

  let y = 115;

  // ================= SIDE BY SIDE TABLES =================
  const columnGap = 14;
  const usableWidth = pageWidth - margin * 2;
  const colWidth = (usableWidth - columnGap) / 2;

  // LEFT: Customer Info
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(...brandBlue);
  doc.text('Customer Information', margin, y);

  doc.autoTable({
    startY: y + 6,
    theme: 'grid',
    head: [['Field', 'Value']],
    body: [
      ['Name', customerName],
      ['Email', customerEmail],
      ['Move Date', moveDate],
      ['Origin', originAddress],
      ['Destination', destinationAddress]
    ],
    tableWidth: colWidth,
    margin: { left: margin },
    styles: { fontSize: 9, cellPadding: 5 },
    headStyles: { fillColor: brandTeal }
  });

  const leftEndY = doc.lastAutoTable.finalY;

  // RIGHT: Move Details
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(...brandBlue);
  doc.text('Move Details', margin + colWidth + columnGap, y);

  doc.autoTable({
    startY: y + 6,
    theme: 'grid',
    head: [['Detail', 'Value']],
    body: [
      ['Move Size', moveSizeText],
      ['Crew', moversText],
      ['Hours', hoursText],
      ['Miles', milesText],
      ['Truck Fee', truckFeeText],
      ['Travel Fee', travelFeeText]
    ],
    tableWidth: colWidth,
    margin: { left: margin + colWidth + columnGap },
    styles: { fontSize: 9, cellPadding: 5 },
    headStyles: { fillColor: brandTeal }
  });

  const rightEndY = doc.lastAutoTable.finalY;

  y = Math.max(leftEndY, rightEndY) + 20;

  // ================= COST BREAKDOWN =================
  y = ensureSpace(120, y);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(...brandBlue);
  doc.text('Cost Breakdown', margin, y);

  y += 10;

  const breakdownRows = [];
  els.breakdown.querySelectorAll('.summary-row').forEach((row) => {
    const spans = row.querySelectorAll('span');
    if (spans.length >= 2) {
      breakdownRows.push([
        spans[0].textContent.trim(),
        spans[1].textContent.trim()
      ]);
    }
  });

  doc.autoTable({
    startY: y,
    theme: 'striped',
    head: [['Description', 'Amount']],
    body: breakdownRows,
    styles: { fontSize: 9, cellPadding: 5 },
    headStyles: { fillColor: brandTeal },
    alternateRowStyles: { fillColor: lightGray }
  });

  y = doc.lastAutoTable.finalY + 18;

  // ================= TOTAL =================
  y = ensureSpace(70, y);

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(...brandTeal);
  doc.roundedRect(margin, y, pageWidth - margin * 2, 65, 10, 10, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...darkText);
  doc.text('Estimated Total', margin + 15, y + 26);

  doc.setFontSize(26);
  doc.setTextColor(...brandBlue);
  doc.text(
    els.estimateTotal.textContent,
    pageWidth - margin - 15,
    y + 42,
    { align: 'right' }
  );

  drawFooter();

  doc.save(`Movers4Hire_Estimate_${estimateId}.pdf`);
}

// ====================== INIT HELPERS ======================
function initEstimator() {
  const debouncedCalc = debounce(calculateEstimate);

  [els.moveSize, els.movers, els.packingHelp, els.specialty, ...els.addons]
    .filter(Boolean)
    .forEach((el) => el.addEventListener('change', calculateEstimate));

  [els.hours, els.miles, els.truckFee, els.travelFee]
    .filter(Boolean)
    .forEach((el) => el.addEventListener('input', debouncedCalc));

  els.recalculateBtn?.addEventListener('click', calculateEstimate);
  els.resetBtn?.addEventListener('click', resetEstimator);

  if (els.year) {
    els.year.textContent = new Date().getFullYear();
  }
}

function initPhotoUpload() {
  if (!photoEls.upload || !photoEls.dropzone) return;

  photoEls.upload.addEventListener('change', (e) => {
    if (e.target.files) handleFiles(e.target.files);
  });

  const dz = photoEls.dropzone;

  ['dragenter', 'dragover'].forEach((ev) => {
    dz.addEventListener(ev, (e) => {
      e.preventDefault();
      dz.classList.add('dragover');
    });
  });

  ['dragleave', 'drop'].forEach((ev) => {
    dz.addEventListener(ev, (e) => {
      e.preventDefault();
      dz.classList.remove('dragover');
    });
  });

  dz.addEventListener('drop', (e) => {
    if (e.dataTransfer?.files) handleFiles(e.dataTransfer.files);
  });

  document.addEventListener('click', (e) => {
    const target = e.target;
    if (!(target instanceof HTMLElement)) return;

    if (target.classList.contains('remove-photo')) {
      const idx = Number.parseInt(target.dataset.index || '', 10);
      if (!Number.isNaN(idx)) removePhoto(idx);
    }
  });
}

function initPdfButton() {
  document.getElementById('downloadPdfBtn')?.addEventListener('click', generatePDF);
}

// ====================== START ======================
function init() {
  initEstimator();
  initPhotoUpload();
  initScrollReveal();
  initHamburger();
  initPdfButton();

  calculateEstimate();
  renderPhotoSummary();
}

document.addEventListener('DOMContentLoaded', init);