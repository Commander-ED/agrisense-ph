// ============================================================
// voice.js
// Lahat ng function para sa voice/text-to-speech feature.
// Gumagamit ng Web Speech API — built-in sa lahat ng
// modernong browser. Walang kailangan na library o API key.
//
// Sinusuportahan:
//   - Filipino (fil-PH) — kung available sa device
//   - English (en-US) — laging available
// ============================================================

// ============================================================
// FUNCTION: speakResult
// Nagpaparinig ng detection result nang malakas.
// Tinatawag awtomatiko pagkatapos ng detection,
// o kapag pinindot ang "Basahin nang Malakas" button.
// ============================================================
function speakResult() {
  // Wala pang resulta — huwag ituloy
  if (!STATE.detection.lastResult) return;

  const lang     = STATE.currentLang;
  const langCode = CONFIG.voice.langCodes[lang];

  // ── Special case: Not a Leaf ────────────────────────────────
  // Kapag hindi nakilala ang larawan — espesyal na mensahe
  if (STATE.detection.lastResult === '__not_a_leaf__') {
    const cropName = STATE.currentCrop === 'rice'
      ? (lang === 'fil' ? 'palay' : 'rice')
      : (lang === 'fil' ? 'kamatis' : 'tomato');
    const text = lang === 'fil'
      ? `Hindi nakilala ng AI ang larawan. Mukhang hindi ito dahon ng ${cropName}. Pakitutok ang camera ng direkta sa isang dahon ng ${cropName} at subukang muli.`
      : `The AI could not recognize the image. This does not appear to be a ${cropName} leaf. Please point the camera directly at a ${cropName} leaf and try again.`;
    speakText(text, langCode);
    return;
  }

  // ── Normal disease result ───────────────────────────────────
  const disease = (DISEASES[STATE.currentCrop] || {})[STATE.detection.lastResult];
  if (!disease?.voice) return;

  // Kunin ang tamang mensahe batay sa wika
  const text = disease.voice[lang];
  speakText(text, langCode);
}

// ============================================================
// FUNCTION: speakWeather
// Nagpaparinig ng weather forecast at disease risk warning.
// Tinatawag kapag pinindot ang "Pakinggan" button
// sa weather card.
// ============================================================
function speakWeather() {
  if (!STATE.weather) return;

  const w    = STATE.weather;
  const lang = STATE.currentLang;
  const risks = evaluateWeatherRisk(STATE.currentCrop, w);
  const overallRisk = getOverallRiskLevel(risks);

  let text = '';

  if (lang === 'fil') {
    // Filipino weather announcement
    text = `Panahon ngayon sa inyong lugar: ` +
           `${w.temp} degrees Celsius, ` +
           `${w.humidity} porsyento humidity, ` +
           `${w.rain} milimetro ng ulan. `;

    // Dagdag ang risk level announcement
    if (overallRisk === 'high') {
      text += 'MATAAS NA PANGANIB ng sakit ng pananim! ';
    } else if (overallRisk === 'medium') {
      text += 'Katamtamang panganib ng sakit. Mag-ingat. ';
    } else {
      text += 'Mababang panganib. Magandang panahon para sa pananim. ';
    }

    // Dagdag ang pinaka-urgent na warning
    if (risks[0]) text += risks[0].fil;

  } else {
    // English weather announcement
    text = `Current weather at your location: ` +
           `${w.temp} degrees Celsius, ` +
           `${w.humidity} percent humidity, ` +
           `${w.rain} millimeters of rain. `;

    if (overallRisk === 'high') {
      text += 'HIGH DISEASE RISK! ';
    } else if (overallRisk === 'medium') {
      text += 'Medium disease risk. Be cautious. ';
    } else {
      text += 'Low risk. Good weather conditions for your crops. ';
    }

    if (risks[0]) text += risks[0].eng;
  }

  speakText(text, CONFIG.voice.langCodes[lang]);
}

// ============================================================
// FUNCTION: speakText
// Base function para sa lahat ng voice output.
// Ginagamit ng speakResult() at speakWeather().
//
// Input:
//   text    - Tekstong maririnig
//   langCode - BCP 47 language code (hal. 'fil-PH', 'en-US')
// ============================================================
function speakText(text, langCode) {
  // Ihinto ang kahit anong nagsasalita pa
  window.speechSynthesis.cancel();

  // Gumawa ng bagong utterance (isang unit ng speech)
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang  = langCode;
  utterance.rate  = CONFIG.voice.rate;   // Bilis ng pagsasalita
  utterance.pitch = CONFIG.voice.pitch;  // Taas ng boses

  // Subukang hanapin ang pinaka-angkop na boses sa device
  // Mas maganda ang native voice kaysa default
  const selectedVoice = findBestVoice(langCode);
  if (selectedVoice) utterance.voice = selectedVoice;

  // Event handlers para sa debugging
  utterance.onerror = (e) => {
    console.warn('Speech synthesis error:', e.error);
  };

  // Simulan ang pagsasalita
  window.speechSynthesis.speak(utterance);
}

// ============================================================
// FUNCTION: findBestVoice
// Naghahanap ng pinaka-angkop na voice sa device para
// sa ibinigay na language code.
//
// Input:  langCode - BCP 47 language code
// Output: SpeechSynthesisVoice object o null
// ============================================================
function findBestVoice(langCode) {
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;

  // Kunin ang base language code (hal. 'fil' mula sa 'fil-PH')
  const baseLang = langCode.split('-')[0].toLowerCase();

  // Una: hanapin ang exact match (hal. 'fil-PH')
  const exactMatch = voices.find(v =>
    v.lang.toLowerCase() === langCode.toLowerCase()
  );
  if (exactMatch) return exactMatch;

  // Pangalawa: hanapin ang partial match (hal. nagsisimula sa 'fil')
  const partialMatch = voices.find(v =>
    v.lang.toLowerCase().startsWith(baseLang)
  );
  if (partialMatch) return partialMatch;

  // Walang match — gamitin ang default voice ng browser
  return null;
}

// ============================================================
// FUNCTION: stopSpeaking
// Isinasara ang kasalukuyang text-to-speech.
// Tinatawag kapag nagpalit ng tab o nag-detect ng bago.
// ============================================================
function stopSpeaking() {
  if (window.speechSynthesis.speaking) {
    window.speechSynthesis.cancel();
  }
}

// ============================================================
// INITIALIZATION
// Kailangan i-trigger ang getVoices() nang maaga para
// ma-load ang available voices bago kailangan nila.
// Ang onvoiceschanged event ay tinatawag kapag handa na
// ang listahan ng voices — lalo na sa Chrome.
// ============================================================
window.speechSynthesis.onvoiceschanged = () => {
  // Ang getVoices() ay naglo-load ng listahan ng available voices
  window.speechSynthesis.getVoices();
};
