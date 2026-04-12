// ============================================================
// results.js
// Lahat ng function para sa pagpapakita ng detection results.
// Kasama dito ang confidence threshold check at
// weather alert integration.
// ============================================================

// ============================================================
// FUNCTION: showResults
// Pangunahing function para ipakita ang resulta ng AI detection.
// Tinatawag ng runDetection() sa model.js pagkatapos mag-predict.
//
// Input: predictions - Array ng { className, probability }
//                      mula sa model.predict()
// ============================================================
function showResults(predictions) {
  // I-sort ang predictions — pinakamataas na confidence muna
  const sorted = [...predictions].sort((a, b) => b.probability - a.probability);
  const top    = sorted[0]; // Pinaka-probable na klase
  const pct    = Math.round(top.probability * 100); // I-convert sa percent

  // ── CONFIDENCE THRESHOLD CHECK ─────────────────────────────
  // Kung mababa ang confidence, ibig sabihin hindi sigurado
  // ang AI sa resulta nito. Posibleng:
  //   1. Hindi dahon ang ipinakita
  //   2. Malabo o masyadong malapit/malayo ang larawan
  //   3. Masyadong madilim o maliwanag ang ilaw
  // Sa halip na magbigay ng maling resulta, ipakita ang warning.
  if (pct < CONFIG.confidenceThreshold) {
    showLowConfidenceWarning(pct, sorted);
    return; // Ihinto dito — huwag ipakita ang maling resulta
  }

  // ── NORMAL RESULT DISPLAY ──────────────────────────────────
  // Sapat ang confidence — ipakita ang resulta
  STATE.detection.lastResult = top.className;
  STATE.detection.lastPct    = pct;

  const disease  = (DISEASES[STATE.currentCrop] || {})[top.className];
  const isHealthy = !disease?.warning;
  const langData  = disease
    ? disease[STATE.currentLang]
    : { title: top.className, steps: [] };

  // ── CROP BADGE ─────────────────────────────────────────────
  const badge = document.getElementById('result-badge');
  badge.textContent = STATE.currentCrop === 'rice' ? '🌾 Palay' : '🍅 Kamatis';
  badge.className   = 'result-crop-badge ' +
    (STATE.currentCrop === 'rice' ? 'badge-rice' : 'badge-tomato');

  // ── DISEASE NAME ───────────────────────────────────────────
  const nameEl = document.getElementById('result-name');
  nameEl.textContent  = top.className;
  nameEl.className    = 'result-disease-name ' + (isHealthy ? 'healthy' : 'disease');
  nameEl.style.color  = ''; // I-clear ang custom color (para sa low confidence)

  // ── CONFIDENCE BAR ─────────────────────────────────────────
  // Visual na bar na nagpapakita ng gaano katumpak ang AI.
  // Berde = malusog, Orange = may sakit
  document.getElementById('conf-label').textContent =
    (STATE.currentLang === 'fil' ? 'Katumpakan: ' : 'Confidence: ') + pct + '%';

  const fill = document.getElementById('conf-fill');
  fill.style.width    = pct + '%';
  fill.style.background = isHealthy ? '#1e7a3e' : '#c05000';

  // ── TREATMENT STEPS ────────────────────────────────────────
  renderTreatment(disease, langData, isHealthy);

  // ── WEATHER ALERT ──────────────────────────────────────────
  // Kapag may sakit at may weather data — tingnan kung
  // connected ang weather sa nadetektang sakit
  renderWeatherAlert(top.className, disease);

  // ── ALL SCORES ─────────────────────────────────────────────
  // Ipakita ang confidence ng lahat ng klase para transparency
  renderAllScores(sorted, '#5a7a5a');

  // ── IPAKITA ANG RESULT CARD ────────────────────────────────
  document.getElementById('result-card').style.display = 'block';
  document.getElementById('btn-speak').style.display   = 'block';
  document.getElementById('btn-speak').textContent     =
    STATE.currentLang === 'fil' ? '🔊 Basahin nang Malakas' : '🔊 Read Aloud';

  // Auto-speak pagkatapos ng delay para may time mag-render ang UI
  setTimeout(() => speakResult(), CONFIG.delays.autoSpeak);

  setStatus(STATE.currentLang === 'fil'
    ? 'Tapos na ang pagsusuri!'
    : 'Detection complete!');

  // I-scroll para makita ng farmer ang resulta
  setTimeout(() => {
    document.getElementById('result-card').scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    });
  }, CONFIG.delays.scrollResult);
}

// ============================================================
// FUNCTION: showLowConfidenceWarning
// Ipinakita ang warning kapag mababa ang confidence ng AI.
// Hindi nagbibigay ng diagnosis — nagbibigay ng tulong
// para maayos ang larawan.
//
// Input:
//   pct    - Confidence percentage ng top prediction
//   sorted - Lahat ng predictions, sorted
// ============================================================
function showLowConfidenceWarning(pct, sorted) {
  const lang     = STATE.currentLang;
  const cropName = STATE.currentCrop === 'rice'
    ? (lang === 'fil' ? 'palay' : 'rice')
    : (lang === 'fil' ? 'kamatis' : 'tomato');

  // I-set ang crop badge
  const badge = document.getElementById('result-badge');
  badge.textContent = STATE.currentCrop === 'rice' ? '🌾 Palay' : '🍅 Kamatis';
  badge.className   = 'result-crop-badge ' +
    (STATE.currentCrop === 'rice' ? 'badge-rice' : 'badge-tomato');

  // I-set ang disease name — "Hindi Malinaw"
  const nameEl = document.getElementById('result-name');
  nameEl.textContent   = lang === 'fil' ? 'Hindi Malinaw' : 'Unclear Result';
  nameEl.className     = 'result-disease-name';
  nameEl.style.color   = '#8a6a00'; // Dilaw-orange para sa warning

  // Confidence bar — orange at mababa
  document.getElementById('conf-label').textContent =
    (lang === 'fil' ? 'Katumpakan: ' : 'Confidence: ') + pct + '% — ' +
    (lang === 'fil' ? 'Masyadong Mababa' : 'Too Low');

  const fill = document.getElementById('conf-fill');
  fill.style.width    = pct + '%';
  fill.style.background = '#c08000'; // Orange para sa babala

  // Ipakita ang helpful tips kung paano ayusin ang larawan
  document.getElementById('treatment-box').innerHTML = `
    <div class="low-conf-warning">
      <div class="low-conf-title">
        ${lang === 'fil' ? '⚠ Hindi Sigurado ang AI' : '⚠ AI is Not Confident'}
      </div>
      <div class="low-conf-reasons">
        ${lang === 'fil' ? 'Posibleng dahilan:' : 'Possible reasons:'}
        <div class="low-conf-item">• ${lang === 'fil'
          ? `Hindi dahon ng ${cropName} ang ipinakita`
          : `Image shown is not a ${cropName} leaf`}</div>
        <div class="low-conf-item">• ${lang === 'fil'
          ? 'Malabo o masyadong malapit ang larawan'
          : 'Photo is blurry or too close'}</div>
        <div class="low-conf-item">• ${lang === 'fil'
          ? 'Masyadong madilim o maliwanag ang ilaw'
          : 'Lighting is too dark or too bright'}</div>
      </div>
      <div class="low-conf-tip">
        <strong>${lang === 'fil' ? 'Subukan muli:' : 'Try again:'}</strong>
        ${lang === 'fil'
          ? `Itutok ng maayos ang camera sa dahon ng ${cropName}. Siguraduhing malinaw at sapat ang ilaw. Ang dahon ay dapat puno ng frame.`
          : `Point the camera clearly at the ${cropName} leaf. Ensure good lighting. The leaf should fill most of the frame.`}
      </div>
    </div>`;

  // Walang weather alert para sa low confidence
  document.getElementById('weather-alert-result').innerHTML = '';

  // Ipakita ang lahat ng scores para alam ng user kung bakit mababa
  renderAllScores(sorted, '#c08000');

  // Ipakita ang result card pero walang speak button
  document.getElementById('result-card').style.display = 'block';
  document.getElementById('btn-speak').style.display   = 'none';

  setStatus(lang === 'fil'
    ? `Mababang confidence (${pct}%) — subukan muli ng malinaw na larawan.`
    : `Low confidence (${pct}%) — try again with a clearer photo.`);

  // I-scroll para makita ang warning
  setTimeout(() => {
    document.getElementById('result-card').scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    });
  }, CONFIG.delays.scrollResult);
}

// ============================================================
// FUNCTION: renderTreatment
// Nagre-render ng treatment steps sa result card.
//
// Input:
//   disease  - Disease object mula sa DISEASES database
//   langData - Language-specific data (fil o eng)
//   isHealthy - true kapag walang sakit
// ============================================================
function renderTreatment(disease, langData, isHealthy) {
  if (!langData) return;

  // Gawing HTML ang steps array
  const stepsHtml = (langData.steps || [])
    .map(step => `<div class="treat-step">${step}</div>`)
    .join('');

  document.getElementById('treatment-box').innerHTML = `
    <div class="treatment-box ${isHealthy ? 'ok' : 'warning'}">
      <div class="treat-title ${isHealthy ? 'ok' : 'warning'}">
        ${langData.title}
      </div>
      ${stepsHtml}
    </div>`;
}

// ============================================================
// FUNCTION: renderWeatherAlert
// Nagre-render ng weather alert sa result card kapag
// ang weather ay konektado sa nadetektang sakit.
//
// Input:
//   className - Pangalan ng detected na sakit
//   disease   - Disease object
// ============================================================
function renderWeatherAlert(className, disease) {
  const alertEl = document.getElementById('weather-alert-result');
  alertEl.innerHTML = '';

  // Ipakita lang ang alert kung may sakit at may weather data
  if (!STATE.weather || !disease?.warning) return;

  const risks = evaluateWeatherRisk(STATE.currentCrop, STATE.weather);

  // Hanapin kung may weather risk na tumutugma sa nadetektang sakit
  // Naghahanap ng partial match sa disease name
  const match = risks.find(r => {
    const detectedWords = className.toLowerCase().split(' ');
    const ruleWords     = r.disease.toLowerCase().split(' ');
    // Nag-match kung may kahit isang salitang magkapareho
    return detectedWords.some(w => ruleWords.includes(w));
  });

  if (!match) return;

  alertEl.innerHTML = `
    <div class="weather-alert-box">
      <strong>⚠ ${STATE.currentLang === 'fil' ? 'Weather Alert' : 'Weather Alert'}</strong>
      ${match[STATE.currentLang]}
    </div>`;
}

// ============================================================
// FUNCTION: renderAllScores
// Nagre-render ng horizontal bars para sa lahat ng
// disease classes — para transparent ang AI sa farmer.
//
// Input:
//   sorted    - Sorted predictions array
//   barColor  - Kulay ng bars (hex string)
// ============================================================
function renderAllScores(sorted, barColor) {
  const lang = STATE.currentLang;

  document.getElementById('all-scores').innerHTML =
    `<div class="scores-title">
      ${lang === 'fil' ? 'Lahat ng Resulta' : 'All Scores'}
     </div>` +
    sorted.map(p => {
      const p100 = Math.round(p.probability * 100);
      return `
        <div class="score-item">
          <div class="score-label">
            <span>${p.className}</span>
            <span>${p100}%</span>
          </div>
          <div class="score-track">
            <div class="score-fill" style="width:${p100}%;background:${barColor}"></div>
          </div>
        </div>`;
    }).join('');
}

// ============================================================
// FUNCTION: clearResults
// Nagta-tanggal ng resulta sa result card.
// Tinatawag kapag nagpalit ng crop o nag-reset ng larawan.
// ============================================================
function clearResults() {
  document.getElementById('result-card').style.display = 'none';
  document.getElementById('btn-speak').style.display   = 'none';
  document.getElementById('all-scores').innerHTML       = '';
  document.getElementById('treatment-box').innerHTML    = '';
  document.getElementById('weather-alert-result').innerHTML = '';
  STATE.resetDetection();
}
