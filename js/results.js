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

  // ── SMART NOT-A-LEAF DETECTION (walang training data kailangan) ──
  // Ginagamit ang confidence distribution analysis para malaman
  // kung ang ipinakita ay hindi dahon ng pananim.
  //
  // Tatlong senaryo ang sinusuri:
  //
  // 1. VERY LOW TOP (< 50%) + EVENLY SPREAD scores
  //    Ibig sabihin: ang AI ay "naguguluhan" — walang klase ang
  //    nangingibabaw. Posibleng hindi ito kilala ng model.
  //    → "Hindi ito mukhang dahon"
  //
  // 2. LOW TOP (50–69%) — hindi sapat ang confidence
  //    Posibleng hindi dahon o malabong larawan.
  //    → "Hindi Malinaw — subukan muli"
  //
  // 3. HIGH TOP (70%+) — normal na detection
  //    → Ipakita ang resulta
  // ──────────────────────────────────────────────────────────────

  // Kalkulahin ang spread ng scores —
  // Kung malapit ang lahat ng scores sa isa't isa, nangangahulugang
  // hindi alam ng AI kung ano ang nasa larawan.
  // Halimbawa: [26%, 25%, 25%, 24%] = evenly spread = hindi kilala
  // Halimbawa: [88%, 7%, 3%, 2%]   = clear winner  = kilala
  const topScore    = sorted[0].probability;    // Pinakamataas na score
  const secondScore = sorted[1]?.probability || 0; // Pangalawang score
  const scoreGap    = topScore - secondScore;   // Agwat ng 1st at 2nd

  // Ang score spread ay nagpapakita kung gaano ka-confident ang AI.
  // Malaking gap (>0.40) = sigurado ang AI
  // Maliit na gap (<0.20) = naguguluhan ang AI

  if (topScore < 0.50 && scoreGap < 0.20) {
    // SENARYO 1: Lahat ng scores ay malapit sa isa't isa at mababa —
    // Ang AI ay hindi kilala ang ipinakita.
    // Ito ang pinaka-reliable na "Not a Leaf" indicator
    // kahit walang training data para sa Not a Leaf class.
    showNotALeafWarning(pct, sorted, 'unknown');
    return;
  }

  if (pct < CONFIG.confidenceThreshold) {
    // SENARYO 2: May nangunguna pero hindi sapat ang confidence —
    // Posibleng hindi dahon o malabong larawan.
    showLowConfidenceWarning(pct, sorted);
    return;
  }

  // SENARYO 3: Sapat ang confidence — ipakita ang normal na resulta.

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
// FUNCTION: showNotALeafWarning
// Ipinakita kapag ang AI ay hindi nakakilala sa larawan —
// posibleng hindi dahon ng pananim ang ipinakita.
//
// Gumagana kahit WALANG "Not a Leaf" training class sa model —
// ginagamit ang confidence distribution analysis para malaman.
//
// Input:
//   pct    - Top confidence percentage
//   sorted - All predictions sorted
//   type   - 'unknown' (evenly spread) o 'not_leaf' (explicit class)
// ============================================================
function showNotALeafWarning(pct, sorted, type) {
  const lang     = STATE.currentLang;
  const cropName = STATE.currentCrop === 'rice'
    ? (lang === 'fil' ? 'palay' : 'rice')
    : (lang === 'fil' ? 'kamatis' : 'tomato');

  // I-set ang crop badge
  const badge = document.getElementById('result-badge');
  badge.textContent = STATE.currentCrop === 'rice' ? '🌾 Palay' : '🍅 Kamatis';
  badge.className   = 'result-crop-badge ' +
    (STATE.currentCrop === 'rice' ? 'badge-rice' : 'badge-tomato');

  // I-set ang title
  const nameEl = document.getElementById('result-name');
  nameEl.textContent = lang === 'fil' ? 'Hindi Dahon ng Pananim' : 'Not a Plant Leaf';
  nameEl.className   = 'result-disease-name';
  nameEl.style.color = '#7a4a00';

  // Confidence bar — mababa at orange/brown
  document.getElementById('conf-label').textContent =
    (lang === 'fil' ? 'Katumpakan: ' : 'Confidence: ') + pct + '%';
  const fill = document.getElementById('conf-fill');
  fill.style.width    = pct + '%';
  fill.style.background = '#8a5a00';

  // Ipakita ang friendly explanation
  document.getElementById('treatment-box').innerHTML = `
    <div class="not-a-leaf-box">
      <div class="not-a-leaf-icon">🍃</div>
      <div class="not-a-leaf-title">
        ${lang === 'fil'
          ? 'Hindi nakakilala ang AI sa larawan'
          : 'AI could not recognize the image'}
      </div>
      <div class="not-a-leaf-desc">
        ${lang === 'fil'
          ? `Mukhang hindi dahon ng ${cropName} ang ipinakita. Ang AI ay naguguluhan dahil ang larawan ay hindi katulad ng mga dahon sa training data nito.`
          : `The image does not appear to be a ${cropName} leaf. The AI is confused because the image is unlike any leaf in its training data.`}
      </div>
      <div class="not-a-leaf-tips">
        <div class="tips-title">${lang === 'fil' ? 'Para maayos ang resulta:' : 'To get accurate results:'}</div>
        <div class="tips-item">✓ ${lang === 'fil'
          ? `Itutok ang camera DIREKTA sa isang dahon ng ${cropName}`
          : `Point camera DIRECTLY at a single ${cropName} leaf`}</div>
        <div class="tips-item">✓ ${lang === 'fil'
          ? 'Ang dahon ay dapat puno ng frame — malapit at malinaw'
          : 'The leaf should fill the frame — close and clear'}</div>
        <div class="tips-item">✓ ${lang === 'fil'
          ? 'Siguraduhing maayos ang ilaw — hindi masyadong madilim o maliwanag'
          : 'Ensure good lighting — not too dark or too bright'}</div>
        <div class="tips-item">✓ ${lang === 'fil'
          ? 'Huwag kasama ang lupa, kamay, o ibang bagay sa larawan'
          : 'Avoid including soil, hands, or other objects in the frame'}</div>
      </div>
    </div>`;

  // Walang weather alert para sa not-a-leaf
  document.getElementById('weather-alert-result').innerHTML = '';

  // Ipakita ang all scores para sa transparency
  // (Makikita ng user kung bakit naguguluhan ang AI)
  renderAllScores(sorted, '#8a5a00');

  // Ipakita ang result card
  document.getElementById('result-card').style.display = 'block';
  document.getElementById('btn-speak').style.display   = 'block';
  document.getElementById('btn-speak').textContent     =
    lang === 'fil' ? '🔊 Basahin nang Malakas' : '🔊 Read Aloud';

  // I-set ang last result para sa voice
  STATE.detection.lastResult = '__not_a_leaf__';

  // I-scroll para makita ang warning
  setTimeout(() => {
    document.getElementById('result-card').scrollIntoView({
      behavior: 'smooth', block: 'start'
    });
  }, CONFIG.delays.scrollResult);

  setStatus(lang === 'fil'
    ? 'Hindi nakilala ang larawan — subukan muli ng malinaw na dahon.'
    : 'Image not recognized — try again with a clear leaf photo.');
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
