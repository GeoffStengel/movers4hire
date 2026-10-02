// main.js - Movers4Hire
// Production estimator + photo upload + branded PDF + form submission

'use strict';


// ============================================================
// BUSINESS CONFIG
// ============================================================
// Fill these in after Movers4Hire confirms the real information.
//
// Example Formspree endpoint:
// formEndpoint: 'https://formspree.io/f/xxxxxxxx'
//
// Leave blank while demonstrating the site to the customer.
// The website will NOT pretend a request was successfully submitted
// until a real endpoint has been configured.
// ============================================================

const BUSINESS_CONFIG = {
  phone: '',
  email: '',
  formEndpoint: ''
};


// ============================================================
// PRICING CONFIG
// ============================================================
// IMPORTANT:
// These are the current website/demo pricing values.
//
// Confirm these numbers with Movers4Hire before production launch.
// Once confirmed, this is the main place to update pricing.
// ============================================================

const pricingConfig = {
  baseHourlyByMovers: {
    2: 120,
    3: 165,
    4: 220
  },

  sizeMultipliers: {
    studio: 1.0,
    onebed: 1.1,
    threebed: 1.22,
    fourbed: 1.38,
    office: 1.3
  },

  mileageRate: 3.25,

  packingLabor: 95,
  packingSupplies: 45,

  specialtyFee: 150,

  minimumHours: {
    studio: 2.5,
    onebed: 3,
    threebed: 5,
    fourbed: 7,
    office: 4
  }
};


// ============================================================
// PHOTO UPLOAD LIMITS
// ============================================================

const PHOTO_LIMITS = {
  maxFiles: 12,
  maxFileSizeMB: 8,
  maxTotalSizeMB: 40
};


// ============================================================
// DOM REFERENCES
// ============================================================

const els = {
  moveSize: document.getElementById('moveSize'),
  movers: document.getElementById('movers'),
  hours: document.getElementById('hours'),
  miles: document.getElementById('miles'),

  truckFee: document.getElementById('truckFee'),
  travelFee: document.getElementById('travelFee'),

  packingHelp: document.getElementById('packingHelp'),
  specialty: document.getElementById('specialty'),

  addons: Array.from(
    document.querySelectorAll('.addon')
  ),

  customerName: document.getElementById('customerName'),
  customerEmail: document.getElementById('customerEmail'),
  customerPhone: document.getElementById('customerPhone'),

  moveDate: document.getElementById('moveDate'),

  originAddress: document.getElementById('originAddress'),
  destinationAddress: document.getElementById('destinationAddress'),

  customerNotes: document.getElementById('customerNotes'),

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


// ============================================================
// GENERAL UTILITIES
// ============================================================

const currencyFormatter = new Intl.NumberFormat(
  'en-US',
  {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  }
);


function currency(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return '$0';
  }

  return currencyFormatter.format(
    Math.round(number)
  );
}


function debounce(fn, delay = 280) {
  let timeout;

  return (...args) => {
    window.clearTimeout(timeout);

    timeout = window.setTimeout(
      () => fn(...args),
      delay
    );
  };
}


function safeValue(
  value,
  fallback = 'Not provided'
) {
  if (
    value !== undefined &&
    value !== null &&
    String(value).trim()
  ) {
    return String(value).trim();
  }

  return fallback;
}


function formatDisplayDate(dateValue) {
  if (!dateValue) {
    return 'Not provided';
  }

  const parsed = new Date(
    `${dateValue}T00:00:00`
  );

  if (
    Number.isNaN(parsed.getTime())
  ) {
    return dateValue;
  }

  return parsed.toLocaleDateString(
    'en-US',
    {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }
  );
}


function formatFileSize(bytes) {
  if (!bytes) {
    return '0 MB';
  }

  return `${
    (
      bytes /
      (1024 * 1024)
    ).toFixed(1)
  } MB`;
}


function clampNumber(
  value,
  min = 0,
  max = Number.MAX_SAFE_INTEGER
) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return min;
  }

  return Math.min(
    Math.max(number, min),
    max
  );
}


// ============================================================
// ESTIMATOR
// ============================================================

function getEstimatedHours(
  size,
  inputHours
) {
  const minimum =
    pricingConfig.minimumHours[size] || 3;

  const requested =
    Number(inputHours);

  if (!Number.isFinite(requested)) {
    return minimum;
  }

  return Math.max(
    requested,
    minimum
  );
}


function getSelectedAddons() {
  return els.addons
    .filter(
      addon => addon.checked
    )
    .map(
      addon => ({
        name:
          addon.dataset.name ||
          addon.value ||
          'Additional service',

        amount:
          Math.max(
            0,
            Number(
              addon.dataset.amount || 0
            )
          )
      })
    );
}


function createBreakdownRow(
  label,
  amount
) {
  const row =
    document.createElement('div');

  row.className = 'summary-row';

  const labelSpan =
    document.createElement('span');

  const amountSpan =
    document.createElement('span');

  labelSpan.textContent = label;
  amountSpan.textContent =
    currency(amount);

  row.append(
    labelSpan,
    amountSpan
  );

  return row;
}


function calculateEstimate() {
  if (
    !els.moveSize ||
    !els.movers
  ) {
    return null;
  }

  const moveSize =
    els.moveSize.value;

  const movers =
    Number(els.movers.value) || 3;

  const miles =
    clampNumber(
      els.miles?.value,
      0,
      500
    );

  const truckFee =
    clampNumber(
      els.truckFee?.value,
      0,
      1000
    );

  const travelFee =
    clampNumber(
      els.travelFee?.value,
      0,
      500
    );

  const adjustedHours =
    getEstimatedHours(
      moveSize,
      els.hours?.value
    );


  // Keep displayed hours synchronized
  // with the minimum-hours rule.

  if (
    els.hours &&
    Number(els.hours.value) !==
      adjustedHours
  ) {
    els.hours.value =
      String(adjustedHours);
  }


  const baseHourly =
    pricingConfig
      .baseHourlyByMovers[movers] ||
    pricingConfig
      .baseHourlyByMovers[3];

  const sizeMultiplier =
    pricingConfig
      .sizeMultipliers[moveSize] ||
    1;

  const hourlyRate =
    Math.round(
      baseHourly *
      sizeMultiplier
    );


  const laborCost =
    hourlyRate *
    adjustedHours;

  const mileageCost =
    miles *
    pricingConfig.mileageRate;


  const packingCost =
    els.packingHelp?.checked
      ? (
          pricingConfig.packingLabor +
          pricingConfig.packingSupplies
        )
      : 0;


  const specialtyCost =
    els.specialty?.checked
      ? pricingConfig.specialtyFee
      : 0;


  const selectedAddons =
    getSelectedAddons();


  const addonsTotal =
    selectedAddons.reduce(
      (
        sum,
        item
      ) =>
        sum +
        item.amount,
      0
    );


  const total =
    Math.round(
      laborCost +
      mileageCost +
      truckFee +
      travelFee +
      packingCost +
      specialtyCost +
      addonsTotal
    );


  const breakdownItems = [
    {
      label:
        `Labor (${adjustedHours} hrs • ` +
        `${movers} mover${movers === 1 ? '' : 's'} ` +
        `@ ${currency(hourlyRate)}/hr)`,

      value: laborCost
    },

    {
      label:
        `Mileage (${miles} mi @ ` +
        `${currency(
          pricingConfig.mileageRate
        )}/mi)`,

      value: mileageCost
    },

    {
      label: 'Truck fee',
      value: truckFee
    },

    {
      label: 'Travel / dispatch',
      value: travelFee
    }
  ];


  if (packingCost) {
    breakdownItems.push({
      label:
        'Packing service + supplies',

      value: packingCost
    });
  }


  if (specialtyCost) {
    breakdownItems.push({
      label:
        'Specialty item handling',

      value: specialtyCost
    });
  }


  selectedAddons.forEach(
    item => {
      breakdownItems.push({
        label: item.name,
        value: item.amount
      });
    }
  );


  // Render safely with DOM methods rather
  // than injecting strings into innerHTML.

  if (els.breakdown) {
    els.breakdown.replaceChildren();

    const fragment =
      document.createDocumentFragment();

    breakdownItems.forEach(
      item => {
        fragment.appendChild(
          createBreakdownRow(
            item.label,
            item.value
          )
        );
      }
    );

    els.breakdown.appendChild(
      fragment
    );
  }


  if (els.estimateTotal) {
    els.estimateTotal.textContent =
      currency(total);
  }


  if (els.grandTotalRow) {
    els.grandTotalRow.textContent =
      currency(total);
  }


  if (els.hourlyRateDisplay) {
    els.hourlyRateDisplay.textContent =
      `${currency(hourlyRate)} / hr`;
  }


  if (els.mileageRateDisplay) {
    els.mileageRateDisplay.textContent =
      `${currency(
        pricingConfig.mileageRate
      )} / mile`;
  }


  if (els.timeEstimateText) {
    const minimum =
      pricingConfig
        .minimumHours[moveSize] ||
      adjustedHours;

    els.timeEstimateText.textContent =
      `Suggested minimum: ${minimum} hours • ` +
      `${movers} mover${movers === 1 ? '' : 's'}`;
  }


  syncHiddenEstimateFields();


  return {
    moveSize,
    movers,
    adjustedHours,
    miles,
    hourlyRate,
    laborCost,
    mileageCost,
    truckFee,
    travelFee,
    packingCost,
    specialtyCost,
    selectedAddons,
    addonsTotal,
    total,
    breakdownItems
  };
}


// ============================================================
// RESET ESTIMATOR
// ============================================================

function resetEstimator() {
  if (els.moveSize) {
    els.moveSize.value = 'studio';
  }

  if (els.movers) {
    els.movers.value = '3';
  }

  if (els.hours) {
    els.hours.value =
      String(
        pricingConfig
          .minimumHours
          .studio
      );
  }

  if (els.miles) {
    els.miles.value = '12';
  }

  if (els.truckFee) {
    els.truckFee.value = '95';
  }

  if (els.travelFee) {
    els.travelFee.value = '45';
  }

  if (els.packingHelp) {
    els.packingHelp.checked =
      false;
  }

  if (els.specialty) {
    els.specialty.checked =
      false;
  }

  els.addons.forEach(
    addon => {
      addon.checked = false;
    }
  );


  // Customer information is intentionally
  // cleared when the user chooses Reset.

  if (els.customerName) {
    els.customerName.value = '';
  }

  if (els.customerEmail) {
    els.customerEmail.value = '';
  }

  if (els.customerPhone) {
    els.customerPhone.value = '';
  }

  if (els.moveDate) {
    els.moveDate.value = '';
  }

  if (els.originAddress) {
    els.originAddress.value = '';
  }

  if (els.destinationAddress) {
    els.destinationAddress.value = '';
  }

  if (els.customerNotes) {
    els.customerNotes.value = '';
  }


  clearPhotos();

  setFormStatus('');

  calculateEstimate();
}


// ============================================================
// PHOTO SUMMARY
// ============================================================

function getConfidenceData(count) {
  if (count === 0) {
    return {
      level: 'Basic',
      guidance:
        'Add room photos',

      note:
        'Photos can provide useful context but do not create or guarantee a final quote.'
    };
  }


  if (count <= 2) {
    return {
      level: 'Low',
      guidance:
        'Add more rooms',

      note:
        'A couple of photos help. Wider room coverage can provide more context.'
    };
  }


  if (count <= 5) {
    return {
      level: 'Medium',
      guidance:
        'Good coverage',

      note:
        'These photos provide useful context for reviewing the move.'
    };
  }


  if (count <= 9) {
    return {
      level: 'Strong',
      guidance:
        'Well documented',

      note:
        'This gives the moving team a strong visual overview of the job.'
    };
  }


  return {
    level: 'High',
    guidance:
      'Detailed coverage',

    note:
      'The uploaded photos provide detailed visual context for the estimate request.'
  };
}


function renderPhotoSummary() {
  const totalBytes =
    uploadedPhotos.reduce(
      (
        sum,
        file
      ) =>
        sum +
        file.size,
      0
    );


  const confidence =
    getConfidenceData(
      uploadedPhotos.length
    );


  if (photoEls.count) {
    photoEls.count.textContent =
      String(
        uploadedPhotos.length
      );
  }


  if (photoEls.size) {
    photoEls.size.textContent =
      formatFileSize(
        totalBytes
      );
  }


  if (
    photoEls.confidenceLevel
  ) {
    photoEls.confidenceLevel
      .textContent =
        confidence.level;
  }


  if (photoEls.guidance) {
    photoEls.guidance.textContent =
      confidence.guidance;
  }


  if (photoEls.note) {
    photoEls.note.textContent =
      confidence.note;
  }


  const hiddenPhotoCount =
    document.getElementById(
      'formPhotoCount'
    );

  if (hiddenPhotoCount) {
    hiddenPhotoCount.value =
      String(
        uploadedPhotos.length
      );
  }
}


// ============================================================
// KEEP FILE INPUT SYNCHRONIZED
// ============================================================

function syncPhotoInput() {
  if (!photoEls.upload) {
    return;
  }


  // DataTransfer allows the actual file input
  // to stay synchronized after removing photos.

  try {
    const dataTransfer =
      new DataTransfer();

    uploadedPhotos.forEach(
      file => {
        dataTransfer.items.add(
          file
        );
      }
    );

    photoEls.upload.files =
      dataTransfer.files;
  }

  catch (error) {
    console.warn(
      'Could not synchronize uploaded photo input.',
      error
    );
  }
}


// ============================================================
// PHOTO PREVIEW CARD
// ============================================================

function createPhotoCard(
  file,
  index
) {
  const card =
    document.createElement(
      'article'
    );

  card.className =
    'photo-preview-card';

  card.dataset.index =
    String(index);


  const image =
    document.createElement(
      'img'
    );

  image.alt =
    `Move photo ${index + 1}`;

  image.loading = 'lazy';


  const meta =
    document.createElement(
      'div'
    );

  meta.className =
    'photo-preview-meta';


  const fileName =
    document.createElement(
      'strong'
    );

  // textContent prevents filenames from
  // being interpreted as HTML.

  fileName.textContent =
    file.name;


  const fileSize =
    document.createElement(
      'span'
    );

  fileSize.textContent =
    formatFileSize(
      file.size
    );


  meta.append(
    fileName,
    fileSize
  );


  const removeButton =
    document.createElement(
      'button'
    );

  removeButton.className =
    'remove-photo';

  removeButton.type =
    'button';

  removeButton.dataset.index =
    String(index);

  removeButton.setAttribute(
    'aria-label',
    `Remove ${file.name}`
  );

  removeButton.textContent =
    '×';


  card.append(
    image,
    meta,
    removeButton
  );


  // Object URLs are more efficient than
  // converting every image to base64.

  const objectUrl =
    URL.createObjectURL(file);

  image.src = objectUrl;


  image.addEventListener(
    'load',
    () => {
      URL.revokeObjectURL(
        objectUrl
      );
    },
    {
      once: true
    }
  );


  image.addEventListener(
    'error',
    () => {
      URL.revokeObjectURL(
        objectUrl
      );
    },
    {
      once: true
    }
  );


  return card;
}


// ============================================================
// RENDER PHOTO PREVIEWS
// ============================================================

function renderPhotoPreviews() {
  if (!photoEls.previewGrid) {
    return;
  }


  photoEls.previewGrid
    .replaceChildren();


  const fragment =
    document.createDocumentFragment();


  uploadedPhotos.forEach(
    (
      file,
      index
    ) => {
      fragment.appendChild(
        createPhotoCard(
          file,
          index
        )
      );
    }
  );


  photoEls.previewGrid
    .appendChild(fragment);
}


// ============================================================
// REMOVE PHOTO
// ============================================================

function removePhoto(index) {
  if (
    index < 0 ||
    index >=
      uploadedPhotos.length
  ) {
    return;
  }


  uploadedPhotos.splice(
    index,
    1
  );


  syncPhotoInput();
  renderPhotoPreviews();
  renderPhotoSummary();
}


// ============================================================
// CLEAR PHOTOS
// ============================================================

function clearPhotos() {
  uploadedPhotos = [];


  if (photoEls.upload) {
    photoEls.upload.value = '';
  }


  if (photoEls.previewGrid) {
    photoEls.previewGrid
      .replaceChildren();
  }


  renderPhotoSummary();
}


// ============================================================
// HANDLE UPLOADED FILES
// ============================================================

function handleFiles(fileList) {
  if (!fileList) {
    return;
  }


  const incomingFiles =
    Array.from(fileList);


  // Only accept image files.

  const validImages =
    incomingFiles.filter(
      file =>
        file.type.startsWith(
          'image/'
        )
    );


  if (
    validImages.length !==
    incomingFiles.length
  ) {
    alert(
      'Only image files can be uploaded.'
    );
  }


  // Ignore duplicate files.

  let newFiles =
    validImages.filter(
      file =>
        !uploadedPhotos.some(
          existing =>
            existing.name ===
              file.name &&

            existing.size ===
              file.size &&

            existing.lastModified ===
              file.lastModified
        )
    );


  if (!newFiles.length) {
    return;
  }


  // Per-file size limit.

  newFiles =
    newFiles.filter(
      file => {
        const sizeMB =
          file.size /
          (1024 * 1024);


        if (
          sizeMB >
          PHOTO_LIMITS
            .maxFileSizeMB
        ) {
          alert(
            `"${file.name}" is ${sizeMB.toFixed(1)} MB. ` +
            `The maximum size is ${PHOTO_LIMITS.maxFileSizeMB} MB per photo.`
          );

          return false;
        }


        return true;
      }
    );


  if (!newFiles.length) {
    return;
  }


  // Maximum photo count.

  const availableSlots =
    PHOTO_LIMITS.maxFiles -
    uploadedPhotos.length;


  if (availableSlots <= 0) {
    alert(
      `You can upload a maximum of ${PHOTO_LIMITS.maxFiles} photos.`
    );

    return;
  }


  if (
    newFiles.length >
    availableSlots
  ) {
    alert(
      `You can upload a maximum of ${PHOTO_LIMITS.maxFiles} photos. ` +
      `Only the first ${availableSlots} new photo${availableSlots === 1 ? '' : 's'} will be added.`
    );

    newFiles =
      newFiles.slice(
        0,
        availableSlots
      );
  }


  // Total upload-size limit.

  let currentBytes =
    uploadedPhotos.reduce(
      (
        sum,
        file
      ) =>
        sum +
        file.size,
      0
    );


  const maximumBytes =
    PHOTO_LIMITS
      .maxTotalSizeMB *
    1024 *
    1024;


  const acceptedFiles = [];


  for (
    const file of newFiles
  ) {
    if (
      currentBytes +
      file.size >
      maximumBytes
    ) {
      alert(
        `The total photo upload limit is ${PHOTO_LIMITS.maxTotalSizeMB} MB. ` +
        'Some photos were not added.'
      );

      break;
    }


    acceptedFiles.push(
      file
    );

    currentBytes +=
      file.size;
  }


  if (!acceptedFiles.length) {
    return;
  }


  uploadedPhotos.push(
    ...acceptedFiles
  );


  syncPhotoInput();
  renderPhotoPreviews();
  renderPhotoSummary();
}


// ============================================================
// PHOTO UPLOAD INITIALIZATION
// ============================================================

function initPhotoUpload() {
  if (
    !photoEls.upload ||
    !photoEls.dropzone
  ) {
    return;
  }


  photoEls.upload
    .addEventListener(
      'change',
      event => {
        if (
          event.target.files
        ) {
          handleFiles(
            event.target.files
          );
        }
      }
    );


  const dropzone =
    photoEls.dropzone;


  [
    'dragenter',
    'dragover'
  ].forEach(
    eventName => {
      dropzone.addEventListener(
        eventName,
        event => {
          event.preventDefault();
          event.stopPropagation();

          dropzone.classList.add(
            'dragover'
          );
        }
      );
    }
  );


  [
    'dragleave',
    'drop'
  ].forEach(
    eventName => {
      dropzone.addEventListener(
        eventName,
        event => {
          event.preventDefault();
          event.stopPropagation();

          dropzone.classList.remove(
            'dragover'
          );
        }
      );
    }
  );


  dropzone.addEventListener(
    'drop',
    event => {
      const files =
        event.dataTransfer?.files;

      if (files?.length) {
        handleFiles(files);
      }
    }
  );


  if (photoEls.previewGrid) {
    photoEls.previewGrid
      .addEventListener(
        'click',
        event => {
          const target =
            event.target;

          if (
            !(
              target instanceof
              HTMLElement
            )
          ) {
            return;
          }


          const removeButton =
            target.closest(
              '.remove-photo'
            );


          if (!removeButton) {
            return;
          }


          const index =
            Number.parseInt(
              removeButton
                .dataset
                .index || '',
              10
            );


          if (
            !Number.isNaN(index)
          ) {
            removePhoto(index);
          }
        }
      );
  }
}


// ============================================================
// SCROLL REVEAL
// ============================================================

function initScrollReveal() {
  const revealElements =
    document.querySelectorAll(
      '.reveal'
    );


  if (!revealElements.length) {
    return;
  }


  // Respect reduced-motion preferences.

  const reducedMotion =
    window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;


  if (
    reducedMotion ||
    !(
      'IntersectionObserver'
      in window
    )
  ) {
    revealElements.forEach(
      element => {
        element.classList.add(
          'visible'
        );
      }
    );

    return;
  }


  const observer =
    new IntersectionObserver(
      entries => {
        entries.forEach(
          entry => {
            if (
              entry.isIntersecting
            ) {
              entry.target
                .classList.add(
                  'visible'
                );

              observer.unobserve(
                entry.target
              );
            }
          }
        );
      },
      {
        threshold: 0.12,
        rootMargin:
          '0px 0px -30px 0px'
      }
    );


  revealElements.forEach(
    element => {
      observer.observe(
        element
      );
    }
  );
}


// ============================================================
// MOBILE NAVIGATION
// ============================================================

function initHamburger() {
  const hamburger =
    document.getElementById(
      'hamburger'
    );

  const mobileMenu =
    document.getElementById(
      'mobileMenu'
    );


  if (
    !hamburger ||
    !mobileMenu
  ) {
    return;
  }


  const closeMenu = (
    returnFocus = false
  ) => {
    hamburger.classList.remove(
      'active'
    );

    mobileMenu.classList.remove(
      'open'
    );

    hamburger.setAttribute(
      'aria-expanded',
      'false'
    );

    hamburger.setAttribute(
      'aria-label',
      'Open navigation menu'
    );

    document.body.style
      .overflow = '';


    if (returnFocus) {
      hamburger.focus();
    }
  };


  const openMenu = () => {
    hamburger.classList.add(
      'active'
    );

    mobileMenu.classList.add(
      'open'
    );

    hamburger.setAttribute(
      'aria-expanded',
      'true'
    );

    hamburger.setAttribute(
      'aria-label',
      'Close navigation menu'
    );

    document.body.style
      .overflow = '';


    const firstLink =
      mobileMenu.querySelector(
        'a'
      );


    firstLink?.focus();
  };


  hamburger.addEventListener(
    'click',
    () => {
      const isOpen =
        mobileMenu.classList
          .contains('open');


      if (isOpen) {
        closeMenu();
      }

      else {
        openMenu();
      }
    }
  );


  mobileMenu
    .querySelectorAll('a')
    .forEach(
      link => {
        link.addEventListener(
          'click',
          () => {
            closeMenu();
          }
        );
      }
    );


  document.addEventListener(
    'keydown',
    event => {
      if (
        event.key ===
          'Escape' &&

        mobileMenu
          .classList
          .contains('open')
      ) {
        closeMenu(true);
      }
    }
  );


  window.addEventListener(
    'resize',
    () => {
      if (
        window.innerWidth >
        900
      ) {
        closeMenu();
      }
    }
  );
}


// ============================================================
// BUSINESS INFORMATION
// ============================================================

function initBusinessConfig() {
  document
    .querySelectorAll(
      '[data-business-phone]'
    )
    .forEach(
      element => {
        element.textContent =
          BUSINESS_CONFIG.phone ||
          'Phone number coming soon';
      }
    );


  document
    .querySelectorAll(
      '[data-business-email]'
    )
    .forEach(
      element => {
        element.textContent =
          BUSINESS_CONFIG.email ||
          'Email coming soon';
      }
    );
}


// ============================================================
// ESTIMATE SNAPSHOT
// ============================================================

function getEstimateSnapshot() {
  const rows =
    Array.from(
      document.querySelectorAll(
        '#breakdown .summary-row'
      )
    )
      .map(
        row => {
          const cells =
            Array.from(
              row.children
            )
              .map(
                element =>
                  element
                    .textContent
                    .trim()
              );

          return cells.join(
            ': '
          );
        }
      );


  return {
    total:
      els.estimateTotal
        ?.textContent
        ?.trim() || '',

    breakdown:
      rows.join(' | '),

    hourlyRate:
      els.hourlyRateDisplay
        ?.textContent
        ?.trim() || '',

    crewSummary:
      `${els.movers?.value || ''} movers • ` +
      `${els.hours?.value || ''} hours`,

    photoCount:
      uploadedPhotos.length
  };
}


// ============================================================
// SYNCHRONIZE HIDDEN FORM FIELDS
// ============================================================

function syncHiddenEstimateFields() {
  const data =
    getEstimateSnapshot();


  const setField = (
    id,
    value
  ) => {
    const field =
      document.getElementById(
        id
      );

    if (field) {
      field.value = value;
    }
  };


  setField(
    'formEstimateTotal',
    data.total
  );

  setField(
    'formBreakdown',
    data.breakdown
  );

  setField(
    'formHourlyRate',
    data.hourlyRate
  );

  setField(
    'formCrewSummary',
    data.crewSummary
  );

  setField(
    'formPhotoCount',
    String(
      data.photoCount
    )
  );
}


// ============================================================
// FORM STATUS
// ============================================================

function setFormStatus(
  message,
  type = ''
) {
  const form =
    document.getElementById(
      'estimateForm'
    );


  if (!form) {
    return;
  }


  let status =
    document.getElementById(
      'formStatus'
    );


  // Backward-compatible fallback if the
  // status element is missing from HTML.

  if (!status) {
    status =
      document.createElement(
        'div'
      );

    status.id =
      'formStatus';

    status.className =
      'form-status';

    status.setAttribute(
      'role',
      'status'
    );

    status.setAttribute(
      'aria-live',
      'polite'
    );


    const summary =
      form.querySelector(
        '.summary-card'
      );


    if (summary) {
      summary.appendChild(
        status
      );
    }

    else {
      form.appendChild(
        status
      );
    }
  }


  status.className =
    `form-status ${type}`.trim();


  status.textContent =
    message;


  status.hidden =
    !message;
}


// ============================================================
// GET FORM ENDPOINT
// ============================================================

function getFormEndpoint(form) {
  const configuredEndpoint =
    BUSINESS_CONFIG
      .formEndpoint
      .trim();


  if (configuredEndpoint) {
    return configuredEndpoint;
  }


  const dataEndpoint =
    (
      form.dataset
        .formEndpoint || ''
    ).trim();


  if (dataEndpoint) {
    return dataEndpoint;
  }


  const actionAttribute =
    (
      form.getAttribute(
        'action'
      ) || ''
    ).trim();


  if (actionAttribute) {
    return actionAttribute;
  }


  return '';
}


function isValidFormEndpoint(
  endpoint
) {
  if (!endpoint) {
    return false;
  }


  if (
    endpoint.includes(
      'YOUR_FORM_ID'
    )
  ) {
    return false;
  }


  try {
    const url =
      new URL(endpoint);

    return (
      url.protocol ===
      'https:'
    );
  }

  catch {
    return false;
  }
}


// ============================================================
// FORM SUBMISSION
// ============================================================

function initEstimateForm() {
  const form =
    document.getElementById(
      'estimateForm'
    );

  const submitButton =
    document.getElementById(
      'submitEstimateBtn'
    );


  if (
    !form ||
    !submitButton
  ) {
    return;
  }


  form.addEventListener(
    'submit',
    async event => {
      event.preventDefault();


      calculateEstimate();
      syncHiddenEstimateFields();


      if (
        !form.reportValidity()
      ) {
        return;
      }


      const endpoint =
        getFormEndpoint(form);


      if (
        !isValidFormEndpoint(
          endpoint
        )
      ) {
        setFormStatus(
          'The estimate request form is ready, but the business submission service still needs to be connected before launch.',
          'error'
        );

        return;
      }


      const originalLabel =
        submitButton.textContent;


      submitButton.disabled =
        true;

      submitButton.textContent =
        'Sending…';

      submitButton.setAttribute(
        'aria-busy',
        'true'
      );


      setFormStatus(
        'Sending your estimate request…'
      );


      try {
        const formData =
          new FormData(form);


        const response =
          await fetch(
            endpoint,
            {
              method: 'POST',
              body: formData,

              headers: {
                Accept:
                  'application/json'
              }
            }
          );


        if (!response.ok) {
          throw new Error(
            `Estimate request failed with HTTP ${response.status}.`
          );
        }


        setFormStatus(
          'Thanks! Your estimate request was sent successfully. Movers4Hire can review the details and follow up with you.',
          'success'
        );


        submitButton.textContent =
          'Request Sent';

        submitButton.removeAttribute(
          'aria-busy'
        );


        // Prevent accidental duplicate
        // submissions after success.

        submitButton.disabled =
          true;
      }

      catch (error) {
        console.error(
          'Estimate form submission failed:',
          error
        );


        setFormStatus(
          'We could not send your request right now. Please try again in a moment or contact Movers4Hire directly.',
          'error'
        );


        submitButton.disabled =
          false;

        submitButton.textContent =
          originalLabel;

        submitButton.removeAttribute(
          'aria-busy'
        );
      }
    }
  );
}


// ============================================================
// PDF HELPERS
// ============================================================

function generateEstimateId() {
  const datePart =
    new Date()
      .toISOString()
      .slice(0, 10)
      .replace(
        /-/g,
        ''
      );


  const randomPart =
    Math.floor(
      1000 +
      Math.random() *
      9000
    );


  return (
    `M4H-${datePart}-${randomPart}`
  );
}


// ============================================================
// GENERATE BRANDED PDF
// ============================================================

function generatePDF() {
  calculateEstimate();


  if (
    !els.estimateTotal ||
    !els.breakdown
  ) {
    alert(
      'Please calculate an estimate first.'
    );

    return;
  }


  if (
    !window.jspdf?.jsPDF
  ) {
    alert(
      'The PDF generator has not finished loading. Please try again in a moment.'
    );

    return;
  }


  const { jsPDF } =
    window.jspdf;


  const doc =
    new jsPDF({
      unit: 'pt',
      format: 'letter'
    });


  if (
    typeof doc.autoTable !==
    'function'
  ) {
    alert(
      'The PDF table library failed to load. Please refresh the page and try again.'
    );

    return;
  }


  const pageWidth =
    doc.internal.pageSize
      .getWidth();

  const pageHeight =
    doc.internal.pageSize
      .getHeight();

  const margin = 40;


  // Brand colors.

  const brandBlue =
    [30, 58, 138];

  const brandTeal =
    [79, 209, 197];

  const darkText =
    [35, 35, 35];

  const mutedText =
    [110, 110, 110];

  const lightGray =
    [245, 247, 250];


  const today =
    new Date()
      .toLocaleDateString(
        'en-US',
        {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }
      );


  const estimateId =
    generateEstimateId();


  const moveSizeText =
    els.moveSize
      ?.options[
        els.moveSize
          .selectedIndex
      ]
      ?.text ||
    'Not selected';


  const customerName =
    safeValue(
      els.customerName?.value,
      'Customer'
    );


  const customerEmail =
    safeValue(
      els.customerEmail?.value
    );


  const customerPhone =
    safeValue(
      els.customerPhone?.value
    );


  const moveDate =
    formatDisplayDate(
      els.moveDate?.value
    );


  const originAddress =
    safeValue(
      els.originAddress?.value
    );


  const destinationAddress =
    safeValue(
      els.destinationAddress?.value
    );


  const customerNotes =
    safeValue(
      els.customerNotes?.value,
      ''
    );


  const moversText =
    `${els.movers?.value || '0'} movers`;


  const hoursText =
    `${els.hours?.value || '0'} hrs`;


  const milesText =
    `${els.miles?.value || '0'} mi`;


  const truckFeeText =
    els.truckFee?.value
      ? currency(
          Number(
            els.truckFee.value
          )
        )
      : '$0';


  const travelFeeText =
    els.travelFee?.value
      ? currency(
          Number(
            els.travelFee.value
          )
        )
      : '$0';


  // ==========================================================
  // PDF HEADER
  // ==========================================================

  const drawHeader = () => {
    doc.setFillColor(
      ...brandBlue
    );

    doc.rect(
      0,
      0,
      pageWidth,
      90,
      'F'
    );


    doc.setFont(
      'helvetica',
      'bold'
    );

    doc.setFontSize(22);

    doc.setTextColor(
      255,
      255,
      255
    );

    doc.text(
      'Movers4Hire',
      margin,
      32
    );


    doc.setFont(
      'helvetica',
      'normal'
    );

    doc.setFontSize(10);

    doc.text(
      'Eugene, Oregon • Professional Moving Services',
      margin,
      50
    );


    const businessContact =
      [
        BUSINESS_CONFIG.phone,
        BUSINESS_CONFIG.email
      ]
        .filter(Boolean)
        .join(' • ');


    doc.text(
      businessContact ||
      'Contact information available from Movers4Hire',
      margin,
      64
    );


    doc.setFontSize(9);


    doc.text(
      `Estimate Date: ${today}`,
      pageWidth - margin,
      32,
      {
        align: 'right'
      }
    );


    doc.text(
      `Estimate ID: ${estimateId}`,
      pageWidth - margin,
      50,
      {
        align: 'right'
      }
    );


    doc.setFillColor(
      ...brandTeal
    );

    doc.rect(
      0,
      90,
      pageWidth,
      6,
      'F'
    );
  };


  // ==========================================================
  // PDF FOOTER
  // ==========================================================

  const drawFooter = () => {
    const footerY =
      pageHeight - 50;


    doc.setDrawColor(
      220,
      226,
      232
    );


    doc.line(
      margin,
      footerY - 12,
      pageWidth - margin,
      footerY - 12
    );


    doc.setFont(
      'helvetica',
      'normal'
    );

    doc.setFontSize(8);

    doc.setTextColor(
      ...mutedText
    );


    doc.text(
      'Preliminary estimate. Final pricing may vary after inventory, access, route, services, and job conditions are reviewed.',
      margin,
      footerY,
      {
        maxWidth:
          pageWidth -
          margin * 2
      }
    );


    doc.text(
      'Movers4Hire • Eugene, Oregon',
      pageWidth / 2,
      pageHeight - 18,
      {
        align: 'center'
      }
    );
  };


  const ensureSpace = (
    needed,
    currentY
  ) => {
    if (
      currentY +
      needed >
      pageHeight - 80
    ) {
      drawFooter();

      doc.addPage();

      drawHeader();

      return 115;
    }


    return currentY;
  };


  drawHeader();


  let y = 115;


  // ==========================================================
  // CUSTOMER + MOVE INFORMATION
  // ==========================================================

  const columnGap = 14;

  const usableWidth =
    pageWidth -
    margin * 2;

  const columnWidth =
    (
      usableWidth -
      columnGap
    ) / 2;


  // Customer Information heading.

  doc.setFont(
    'helvetica',
    'bold'
  );

  doc.setFontSize(13);

  doc.setTextColor(
    ...brandBlue
  );


  doc.text(
    'Customer Information',
    margin,
    y
  );


  doc.autoTable({
    startY: y + 6,

    theme: 'grid',

    head: [
      [
        'Field',
        'Value'
      ]
    ],

    body: [
      [
        'Name',
        customerName
      ],

      [
        'Email',
        customerEmail
      ],

      [
        'Phone',
        customerPhone
      ],

      [
        'Move Date',
        moveDate
      ],

      [
        'Origin',
        originAddress
      ],

      [
        'Destination',
        destinationAddress
      ]
    ],

    tableWidth:
      columnWidth,

    margin: {
      left: margin
    },

    styles: {
      fontSize: 8.5,
      cellPadding: 4.5,
      overflow: 'linebreak'
    },

    headStyles: {
      fillColor:
        brandTeal
    }
  });


  const leftEndY =
    doc.lastAutoTable
      .finalY;


  // Move details heading.

  doc.setFont(
    'helvetica',
    'bold'
  );

  doc.setFontSize(13);

  doc.setTextColor(
    ...brandBlue
  );


  doc.text(
    'Move Details',
    margin +
      columnWidth +
      columnGap,
    y
  );


  doc.autoTable({
    startY: y + 6,

    theme: 'grid',

    head: [
      [
        'Detail',
        'Value'
      ]
    ],

    body: [
      [
        'Move Size',
        moveSizeText
      ],

      [
        'Crew',
        moversText
      ],

      [
        'Hours',
        hoursText
      ],

      [
        'Miles',
        milesText
      ],

      [
        'Truck Fee',
        truckFeeText
      ],

      [
        'Travel Fee',
        travelFeeText
      ],

      [
        'Photos',
        String(
          uploadedPhotos.length
        )
      ]
    ],

    tableWidth:
      columnWidth,

    margin: {
      left:
        margin +
        columnWidth +
        columnGap
    },

    styles: {
      fontSize: 8.5,
      cellPadding: 4.5,
      overflow: 'linebreak'
    },

    headStyles: {
      fillColor:
        brandTeal
    }
  });


  const rightEndY =
    doc.lastAutoTable
      .finalY;


  y =
    Math.max(
      leftEndY,
      rightEndY
    ) + 20;


  // ==========================================================
  // CUSTOMER NOTES
  // ==========================================================

  if (customerNotes) {
    y =
      ensureSpace(
        80,
        y
      );


    doc.setFont(
      'helvetica',
      'bold'
    );

    doc.setFontSize(13);

    doc.setTextColor(
      ...brandBlue
    );


    doc.text(
      'Customer Notes',
      margin,
      y
    );


    y += 6;


    const wrappedNotes =
      doc.splitTextToSize(
        customerNotes,
        pageWidth -
          margin * 2 -
          20
      );


    doc.autoTable({
      startY: y,

      theme: 'grid',

      body: [
        [
          wrappedNotes.join(
            '\n'
          )
        ]
      ],

      styles: {
        font: 'helvetica',
        fontSize: 9,
        cellPadding: 6,
        textColor:
          darkText,
        lineColor: [
          225,
          230,
          236
        ],
        lineWidth: 0.5
      },

      columnStyles: {
        0: {
          cellWidth:
            pageWidth -
            margin * 2
        }
      },

      margin: {
        left: margin,
        right: margin
      }
    });


    y =
      doc.lastAutoTable
        .finalY + 18;
  }


  // ==========================================================
  // COST BREAKDOWN
  // ==========================================================

  y =
    ensureSpace(
      120,
      y
    );


  doc.setFont(
    'helvetica',
    'bold'
  );

  doc.setFontSize(13);

  doc.setTextColor(
    ...brandBlue
  );


  doc.text(
    'Preliminary Cost Breakdown',
    margin,
    y
  );


  y += 10;


  const breakdownRows = [];


  els.breakdown
    .querySelectorAll(
      '.summary-row'
    )
    .forEach(
      row => {
        const spans =
          row.querySelectorAll(
            'span'
          );


        if (
          spans.length >= 2
        ) {
          breakdownRows.push([
            spans[0]
              .textContent
              .trim(),

            spans[1]
              .textContent
              .trim()
          ]);
        }
      }
    );


  doc.autoTable({
    startY: y,

    theme: 'striped',

    head: [
      [
        'Description',
        'Amount'
      ]
    ],

    body:
      breakdownRows,

    styles: {
      fontSize: 9,
      cellPadding: 5
    },

    headStyles: {
      fillColor:
        brandTeal
    },

    alternateRowStyles: {
      fillColor:
        lightGray
    }
  });


  y =
    doc.lastAutoTable
      .finalY + 18;


  // ==========================================================
  // TOTAL
  // ==========================================================

  y =
    ensureSpace(
      80,
      y
    );


  doc.setFillColor(
    248,
    250,
    252
  );

  doc.setDrawColor(
    ...brandTeal
  );


  doc.roundedRect(
    margin,
    y,
    pageWidth -
      margin * 2,
    65,
    10,
    10,
    'FD'
  );


  doc.setFont(
    'helvetica',
    'bold'
  );

  doc.setFontSize(14);

  doc.setTextColor(
    ...darkText
  );


  doc.text(
    'Estimated Total',
    margin + 15,
    y + 26
  );


  doc.setFontSize(26);

  doc.setTextColor(
    ...brandBlue
  );


  doc.text(
    els.estimateTotal
      .textContent,
    pageWidth -
      margin -
      15,
    y + 42,
    {
      align: 'right'
    }
  );


  drawFooter();


  doc.save(
    `Movers4Hire_Estimate_${estimateId}.pdf`
  );
}


// ============================================================
// PDF BUTTON
// ============================================================

function initPdfButton() {
  const button =
    document.getElementById(
      'downloadPdfBtn'
    );


  button?.addEventListener(
    'click',
    generatePDF
  );
}


// ============================================================
// ESTIMATOR EVENT LISTENERS
// ============================================================

function initEstimator() {
  const debouncedCalculation =
    debounce(
      calculateEstimate
    );


  [
    els.moveSize,
    els.movers,
    els.packingHelp,
    els.specialty,
    ...els.addons
  ]
    .filter(Boolean)
    .forEach(
      element => {
        element.addEventListener(
          'change',
          calculateEstimate
        );
      }
    );


  [
    els.hours,
    els.miles,
    els.truckFee,
    els.travelFee
  ]
    .filter(Boolean)
    .forEach(
      element => {
        element.addEventListener(
          'input',
          debouncedCalculation
        );
      }
    );


  els.recalculateBtn
    ?.addEventListener(
      'click',
      calculateEstimate
    );


  els.resetBtn
    ?.addEventListener(
      'click',
      resetEstimator
    );


  if (els.year) {
    els.year.textContent =
      String(
        new Date()
          .getFullYear()
      );
  }
}


// ============================================================
// MOVE DATE
// ============================================================

function initMoveDate() {
  if (!els.moveDate) {
    return;
  }


  // Use the browser's local date instead of UTC
  // so users near midnight do not receive the
  // wrong minimum date.

  const now =
    new Date();

  const year =
    now.getFullYear();

  const month =
    String(
      now.getMonth() + 1
    ).padStart(
      2,
      '0'
    );

  const day =
    String(
      now.getDate()
    ).padStart(
      2,
      '0'
    );


  els.moveDate.min =
    `${year}-${month}-${day}`;
}


// ============================================================
// SMOOTH ANCHOR / FOCUS HANDLING
// ============================================================

function initAnchorAccessibility() {
  document
    .querySelectorAll(
      'a[href^="#"]'
    )
    .forEach(
      link => {
        link.addEventListener(
          'click',
          () => {
            const href =
              link.getAttribute(
                'href'
              );


            if (
              !href ||
              href === '#'
            ) {
              return;
            }


            const target =
              document.querySelector(
                href
              );


            if (!target) {
              return;
            }


            window.setTimeout(
              () => {
                if (
                  !target.hasAttribute(
                    'tabindex'
                  )
                ) {
                  target.setAttribute(
                    'tabindex',
                    '-1'
                  );

                  target.addEventListener(
                    'blur',
                    () => {
                      target.removeAttribute(
                        'tabindex'
                      );
                    },
                    {
                      once: true
                    }
                  );
                }


                target.focus({
                  preventScroll:
                    true
                });
              },
              450
            );
          }
        );
      }
    );
}


// ============================================================
// INITIALIZE WEBSITE
// ============================================================

function init() {
  initBusinessConfig();

  initEstimator();

  initPhotoUpload();

  initScrollReveal();

  initHamburger();

  initPdfButton();

  initEstimateForm();

  initMoveDate();

  initAnchorAccessibility();


  calculateEstimate();

  renderPhotoSummary();
}


// ============================================================
// START
// ============================================================

document.addEventListener(
  'DOMContentLoaded',
  init
);