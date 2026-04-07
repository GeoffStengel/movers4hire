
    const pricingConfig = {
      baseHourlyByMovers: {
        2: 120,
        3: 165,
        4: 220,
      },
      sizeMultipliers: {
        studio: 1,
        onebed: 1.1,
        threebed: 1.22,
        fourbed: 1.38,
        office: 1.3,
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
        office: 4,
      }
    };

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
      year: document.getElementById('year'),
    };

    const currency = (value) =>
      new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0,
      }).format(value);

    function getEstimatedHours(size, inputHours) {
      const min = pricingConfig.minimumHours[size] || 3;
      return Math.max(Number(inputHours) || min, min);
    }

    function calculateEstimate() {
      const moveSize = els.moveSize.value;
      const movers = Number(els.movers.value);
      const miles = Math.max(0, Number(els.miles.value) || 0);
      const truckFee = Math.max(0, Number(els.truckFee.value) || 0);
      const travelFee = Math.max(0, Number(els.travelFee.value) || 0);
      const adjustedHours = getEstimatedHours(moveSize, els.hours.value);

      if (Number(els.hours.value) !== adjustedHours) {
        els.hours.value = adjustedHours;
      }

      const baseHourly = pricingConfig.baseHourlyByMovers[movers] || 165;
      const sizeMultiplier = pricingConfig.sizeMultipliers[moveSize] || 1;
      const hourlyRate = Math.round(baseHourly * sizeMultiplier);
      const laborCost = hourlyRate * adjustedHours;
      const mileageCost = miles * pricingConfig.mileageRate;

      const packingCost = els.packingHelp.checked
        ? pricingConfig.packingLabor + pricingConfig.packingSupplies
        : 0;

      const specialtyCost = els.specialty.checked ? pricingConfig.specialtyFee : 0;

      const selectedAddons = els.addons
        .filter((addon) => addon.checked)
        .map((addon) => ({
          name: addon.dataset.name,
          amount: Number(addon.value),
        }));

      const addonsTotal = selectedAddons.reduce((sum, item) => sum + item.amount, 0);
      const subtotal = laborCost + mileageCost + truckFee + travelFee + packingCost + specialtyCost + addonsTotal;
      const estimateTotal = Math.round(subtotal);

      const breakdownItems = [
        { label: `Labor (${adjustedHours} hrs @ ${currency(hourlyRate)}/hr)`, value: laborCost },
        { label: `Mileage (${miles} mi @ ${currency(pricingConfig.mileageRate)}/mi)`, value: mileageCost },
        { label: 'Truck fee', value: truckFee },
        { label: 'Travel / dispatch', value: travelFee },
      ];

      if (packingCost) breakdownItems.push({ label: 'Packing service + supplies', value: packingCost });
      if (specialtyCost) breakdownItems.push({ label: 'Specialty item handling', value: specialtyCost });
      selectedAddons.forEach((item) => breakdownItems.push({ label: item.name, value: item.amount }));

      els.breakdown.innerHTML = breakdownItems
        .map((item) => `
          <div class="summary-row">
            <span>${item.label}</span>
            <span>${currency(item.value)}</span>
          </div>
        `)
        .join('');

      els.estimateTotal.textContent = currency(estimateTotal);
      els.grandTotalRow.textContent = currency(estimateTotal);
      els.hourlyRateDisplay.textContent = `${currency(hourlyRate)} / hr`;
      els.mileageRateDisplay.textContent = `${currency(pricingConfig.mileageRate)} / mile`;
      els.timeEstimateText.textContent = `Suggested minimum for this move type: ${pricingConfig.minimumHours[moveSize]} hours. Crew size selected: ${movers} mover${movers > 1 ? 's' : ''}.`;
    }

    function resetEstimator() {
      els.moveSize.value = 'studio';
      els.movers.value = '3';
      els.hours.value = '4';
      els.miles.value = '12';
      els.truckFee.value = '95';
      els.travelFee.value = '45';
      els.packingHelp.checked = false;
      els.specialty.checked = false;
      els.addons.forEach((addon) => { addon.checked = false; });
      calculateEstimate();
    }

    const observedEls = document.querySelectorAll('.reveal');
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
        }
      });
    }, { threshold: 0.15 });

    observedEls.forEach((el) => observer.observe(el));

    [
      els.moveSize,
      els.movers,
      els.hours,
      els.miles,
      els.truckFee,
      els.travelFee,
      els.packingHelp,
      els.specialty,
      ...els.addons,
    ].forEach((el) => {
      el.addEventListener('input', calculateEstimate);
      el.addEventListener('change', calculateEstimate);
    });

    els.recalculateBtn.addEventListener('click', calculateEstimate);
    els.resetBtn.addEventListener('click', resetEstimator);
    els.year.textContent = new Date().getFullYear();

    calculateEstimate();
