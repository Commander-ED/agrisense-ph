// ============================================================
// results.js
// Lahat ng function para sa pagpapakita ng detection results.
// Kasama dito ang confidence threshold check at
// weather alert integration.
// ============================================================

// ============================================================
// FUNCTION: analyzeImageForLeaf
// Sinusuri ang larawan kung ito ay mukhang dahon gamit ang
// Canvas API — binibilang ang green pixels.
//
// Ang dahon ay dapat may sapat na berdeng kulay.
// Kung kakaunti ang green pixels = malaki ang posibilidad
// na hindi dahon ang ipinakita.
//
// Input:  source — HTML element (video o img)
// Output: object na may { greenRatio, isLikelyLeaf, reason }
//         greenRatio  = 0.0 hanggang 1.0 (porsyento ng green pixels)
//         isLikelyLeaf = true kung mukhang dahon
//         reason      = explanation kung bakit
// ============================================================
function analyzeImageForLeaf(source) {
  try {
    // Gumawa ng off-screen canvas para ma-analyze ang pixels
    // Hindi ito visible sa user — para lang sa pixel counting
    const canvas  = document.createElement('canvas');
    const ctx     = canvas.getContext('2d');

    // Gamitin ang mas maliit na size para mabilis ang analysis
    // 100x100 = 10,000 pixels — sapat para sa green ratio calculation
    canvas.width  = 100;
    canvas.height = 100;

    // I-draw ang source (video frame o uploaded image) sa canvas
    ctx.drawImage(source, 0, 0, 100, 100);

    // Kunin ang pixel data — bawat pixel ay may R, G, B, A values
    // getImageData() ay nagbabalik ng flat array:
    // [R0, G0, B0, A0, R1, G1, B1, A1, ...]
    const imageData = ctx.getImageData(0, 0, 100, 100);
    const pixels    = imageData.data;
    const total     = pixels.length / 4; // Total pixel count (100x100 = 10,000)

    let greenCount  = 0;  // Bilang ng green pixels
    let brownCount  = 0;  // Bilang ng brown/yellow pixels (may sakit na dahon)
    let darkCount   = 0;  // Bilang ng masyadong madilim na pixels

    // I-loop ang bawat pixel at suriin ang kulay
    for (let i = 0; i < pixels.length; i += 4) {
      const r = pixels[i];     // Red channel   (0-255)
      const g = pixels[i + 1]; // Green channel (0-255)
      const b = pixels[i + 2]; // Blue channel  (0-255)

      // ── GREEN PIXEL DETECTION ────────────────────────────────
      // Ang berdeng dahon ay may:
      //   - Mataas na G (green channel)
      //   - G > R at G > B (green ang dominant)
      //   - Hindi masyadong maitim (G > 40)
      const isGreen = g > r * 1.1 && g > b * 1.1 && g > 40;
      if (isGreen) greenCount++;

      // ── BROWN/YELLOW DETECTION ───────────────────────────────
      // Ang may sakit na dahon ay may brown/yellow color:
      //   - Mataas ang R at G, mababa ang B
      //   - Katulad ng Brown Spot o Blight colors
      const isBrownYellow = r > 120 && g > 80 && b < 80 && r > b * 1.5;
      if (isBrownYellow) brownCount++;

      // ── DARK PIXEL DETECTION ─────────────────────────────────
      // Kung masyadong madilim ang larawan — hindi mapag-aralan
      const isDark = r < 30 && g < 30 && b < 30;
      if (isDark) darkCount++;
    }

    // Kalkulahin ang ratios
    const greenRatio  = greenCount / total;   // 0.0 to 1.0
    const brownRatio  = brownCount / total;
    const darkRatio   = darkCount  / total;

    // ── DECISION LOGIC ───────────────────────────────────────
    // Ang dahon (healthy o may sakit) ay dapat may:
    //   - Green ratio > 15% (healthy leaf = mataas, diseased = puwedeng mababa)
    //   - O brown/yellow ratio > 20% (may sakit na dahon)
    //   - Hindi masyadong madilim (dark ratio < 60%)

    const leafColorRatio = greenRatio + (brownRatio * 0.7);
    // Ang brown/yellow ay binibigyan ng 70% weight —
    // posibleng may sakit na dahon ang kulay

    if (darkRatio > 0.60) {
      return {
        greenRatio, isLikelyLeaf: false,
        reason: 'too_dark'  // Masyadong madilim — hindi mapag-aralan
      };
    }

    if (leafColorRatio < 0.12) {
      return {
        greenRatio, isLikelyLeaf: false,
        reason: 'no_leaf_color'  // Kulang sa berde/brown — hindi dahon
      };
    }

    return {
      greenRatio, isLikelyLeaf: true,
      reason: 'ok'
    };

  } catch (e) {
    // Kung may error sa canvas analysis — ibigay ang benefit of the doubt
    console.warn('Image analysis error:', e);
    return { greenRatio: 0.5, isLikelyLeaf: true, reason: 'analysis_error' };
  }
}

// ============================================================
// FUNCTION: calculateEntropy
// Kinukuha ang "entropy" ng prediction distribution.
// Mataas ang entropy = naguguluhan ang AI (scores malapit sa isa't isa)
// Mababang entropy = sigurado ang AI (isang score ang nangunguna)
//
// Formula: entropy = -sum(p * log2(p)) para sa bawat probability p
// Max entropy (4 classes) = 2.0 bits
//
// Input:  predictions — Array ng { probability } values
// Output: entropy value (0.0 = sigurado, 2.0 = totally confused)
// ============================================================
function calculateEntropy(predictions) {
  let entropy = 0;
  predictions.forEach(p => {
    if (p.probability > 0) {
      // Shannon entropy formula
      entropy -= p.probability * Math.log2(p.probability);
    }
  });
  return entropy;
}

// ============================================================
// FUNCTION: showResults
// Pangunahing function para ipakita ang resulta ng AI detection.
// May tatlong validation layers bago ipakita ang resulta:
//   1. Green pixel analysis — mukhang dahon ba ang larawan?
//   2. Entropy check — naguguluhan ba ang AI?
//   3. Confidence threshold — sapat ba ang confidence?
//
// Input: predictions - Array ng { className, probability }
//                      mula sa model.predict()
// ============================================================
function showResults(predictions) {
  // I-sort ang predictions — pinakamataas na confidence muna
  const sorted = [...predictions].sort((a, b) => b.probability - a.probability);
  const top    = sorted[0]; // Pinaka-probable na klase
  const pct    = Math.round(top.probability * 100); // I-convert sa percent

  // ============================================================
  // MULTI-LAYER VALIDATION SYSTEM
  // Tatlong validation layers bago ipakita ang resulta.
  // Mas mahirap lumampas ng maling detection.
  // ============================================================

  // ── LAYER 1: GREEN PIXEL ANALYSIS ─────────────────────────
  // Sinusuri ang larawan kung ito ay mukhang dahon gamit ang
  // canvas pixel analysis. Ang dahon ay laging may berdeng kulay.
  // Ito ang pinaka-reliable na "Not a Leaf" indicator
  // na hindi kailangan ng training data.
  const source      = STATE.camera.cameraActive
    ? document.getElementById('video')
    : document.getElementById('uploaded-img');
  const leafCheck   = analyzeImageForLeaf(source);

  if (!leafCheck.isLikelyLeaf) {
    // Ang larawan ay hindi mukhang dahon batay sa pixel colors
    let notLeafReason = leafCheck.reason;
    showNotALeafWarning(pct, sorted, notLeafReason);
    return;
  }

  // ── LAYER 2: ENTROPY CHECK ─────────────────────────────────
  // Sinusuri kung gaano ka-"confused" ang AI.
  // Mataas ang entropy = lahat ng scores ay malapit sa isa't isa
  // = hindi kilala ng AI ang larawan.
  // Max entropy para sa 4 classes = 2.0 bits
  // Threshold: > 1.6 bits = naguguluhan ang AI
  const entropy     = calculateEntropy(sorted);
  const scoreGap    = sorted[0].probability - (sorted[1]?.probability || 0);

  if (entropy > 1.6 || (sorted[0].probability < 0.50 && scoreGap < 0.20)) {
    // Ang AI ay naguguluhan — hindi nito kilala ang larawan
    // kahit mukhang may dahon ang pixel analysis
    showNotALeafWarning(pct, sorted, 'confused');
    return;
  }

  // ── LAYER 3: CONFIDENCE THRESHOLD ─────────────────────────
  // Standard na confidence check — kung < 70%, hindi sapat.
  if (pct < CONFIG.confidenceThreshold) {
    showLowConfidenceWarning(pct, sorted);
    return;
  }

  // ── ALL LAYERS PASSED — ipakita ang normal na resulta ──────

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
// FUNCTION: getNotALeafMessage
// Nagbibigay ng specific na mensahe batay sa dahilan kung
// bakit hindi natukoy bilang dahon.
// Mas malinaw ang mensahe para sa farmer — alam niya
// kung ano ang dapat ayusin.
// ============================================================
function getNotALeafMessage(lang, cropName, reason) {
  const messages = {
    too_dark: {
      fil: `Masyadong madilim ang larawan — hindi makita ng AI ang dahon. Pumunta sa mas maliwanag na lugar o gumamit ng flashlight.`,
      eng: `Image is too dark — the AI cannot see the leaf. Move to a brighter area or use a flashlight.`
    },
    no_leaf_color: {
      fil: `Mukhang hindi dahon ng ${cropName} ang ipinakita — kulang sa berdeng kulay. Itutok ang camera ng DIREKTA sa isang dahon ng ${cropName} lamang.`,
      eng: `This does not look like a ${cropName} leaf — not enough green color detected. Point the camera DIRECTLY at a single ${cropName} leaf only.`
    },
    confused: {
      fil: `Ang AI ay hindi sigurado sa larawan — posibleng hindi ito dahon ng ${cropName}, o malabo ang kuha. Subukang muli ng mas malinaw.`,
      eng: `The AI is not sure about this image — it may not be a ${cropName} leaf, or the photo is unclear. Try again with a clearer shot.`
    },
    unknown: {
      fil: `Hindi nakilala ng AI ang larawan bilang dahon ng ${cropName}. Siguraduhing ang dahon ay puno ng frame at malinaw ang larawan.`,
      eng: `AI did not recognize this as a ${cropName} leaf. Make sure the leaf fills the frame and the image is clear.`
    }
  };
  const msg = messages[reason] || messages.unknown;
  return msg[lang] || msg.fil;
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
        ${getNotALeafMessage(lang, cropName, type)}
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
