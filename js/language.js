// ============================================================
// language.js
// Lahat ng function para sa bilingual na feature ng app —
// Filipino at English. Kasama dito ang:
//   - Language toggle function
//   - UI text translations
//   - Re-rendering ng lahat ng text kapag nagpalit ng wika
// ============================================================

// ============================================================
// UI_TEXT
// Lahat ng static text sa UI — mga labels, buttons, messages.
// Dito mo dina-dagdag ang bagong texts kung kailangan.
// ============================================================
const UI_TEXT = {
  fil: {
    // Header
    appTagline:      'Smart Disease Detector · Central Luzon',

    // Crop selector
    cropLabel:       'Piliin ang pananim',
    riceName:        'Palay',
    tomatoName:      'Kamatis',

    // Camera section
    photoLabel:      'Kumuha ng larawan ng dahon',
    placeholderRice: 'Itutok ang camera sa dahon ng palay',
    placeholderTomato: 'Itutok ang camera sa dahon ng kamatis',
    cameraBtn:       'Camera',
    uploadBtn:       'Upload',
    detectBtn:       'Suriin ang Dahon / Detect Disease',
    stopBtn:         'Ihinto',

    // Language toggle
    voiceLabel:      'Boses',

    // Results
    resultLabel:     'Resulta ng Pagsusuri',
    confLabel:       'Katumpakan',
    speakBtn:        '🔊 Basahin nang Malakas',
    allScoresTitle:  'Lahat ng Resulta',

    // Navigation
    navHome:     'Home',
    navDetect:   'Suriin',
    navAnalytics:'Analytics',
    navWeather:  'Panahon',

    // Status messages
    modelLoading: (crop) => `Nilo-load ang modelo ng ${crop}...`,
    modelReady:   (crop) => `Handa na! Kumuha ng larawan ng dahon ng ${crop}.`,
    modelError:   (crop) => `Hindi ma-load ang modelo ng ${crop}.`,
    cameraReady:  'Itutok ang camera sa dahon. Pindutin ang Suriin.',
    cameraStop:   'Handa na! Kumuha ng larawan.',
    uploaded:     'Larawan na-upload. Pindutin ang Suriin.',
    analyzing:    'Sinusuri ang dahon...',
    complete:     'Tapos na ang pagsusuri!',
    detectError:  'May error sa pagsusuri. Subukan muli.',
    langChanged:  'Nabago ang wika sa Filipino.'
  },

  eng: {
    // Header
    appTagline:      'Smart Disease Detector · Central Luzon',

    // Crop selector
    cropLabel:       'Select crop',
    riceName:        'Rice',
    tomatoName:      'Tomato',

    // Camera section
    photoLabel:      'Take a photo of the leaf',
    placeholderRice:   'Point camera at a rice leaf',
    placeholderTomato: 'Point camera at a tomato leaf',
    cameraBtn:       'Camera',
    uploadBtn:       'Upload',
    detectBtn:       'Detect Disease / Suriin',
    stopBtn:         'Stop',

    // Language toggle
    voiceLabel:      'Voice',

    // Results
    resultLabel:     'Detection Result',
    confLabel:       'Confidence',
    speakBtn:        '🔊 Read Aloud',
    allScoresTitle:  'All Scores',

    // Navigation
    navHome:     'Home',
    navDetect:   'Detect',
    navAnalytics:'Analytics',
    navWeather:  'Weather',

    // Status messages
    modelLoading: (crop) => `Loading ${crop} model...`,
    modelReady:   (crop) => `Ready! Take a photo of the ${crop} leaf.`,
    modelError:   (crop) => `Cannot load ${crop} model.`,
    cameraReady:  'Point camera at leaf. Press Detect.',
    cameraStop:   'Ready! Take a photo.',
    uploaded:     'Photo uploaded. Press Detect.',
    analyzing:    'Analyzing leaf...',
    complete:     'Detection complete!',
    detectError:  'Detection error. Please try again.',
    langChanged:  'Language changed to English.'
  }
};

// ============================================================
// FUNCTION: toggleLanguage
// Nagpapalit ng wika sa pagitan ng Filipino at English.
// Ini-update ang lahat ng visible na text sa UI.
// ============================================================
function toggleLanguage() {
  // I-toggle ang wika
  STATE.currentLang = STATE.currentLang === 'fil' ? 'eng' : 'fil';
  const lang = STATE.currentLang;

  // ── I-update ang header lang button ────────────────────────
  document.getElementById('lang-active').textContent   = lang === 'fil' ? 'FIL' : 'EN';
  document.getElementById('lang-inactive').textContent = lang === 'fil' ? 'EN'  : 'FIL';

  // ── I-update ang placeholder text sa preview area ──────────
  const cropKey = STATE.currentCrop === 'rice'
    ? 'placeholderRice' : 'placeholderTomato';
  const placeholder = document.getElementById('placeholder-text');
  if (placeholder) placeholder.textContent = UI_TEXT[lang][cropKey];

  // ── I-update ang detect button text ────────────────────────
  const detectText = document.getElementById('detect-text');
  if (detectText) detectText.textContent = UI_TEXT[lang].detectBtn;

  // ── I-update ang speak button ──────────────────────────────
  const speakBtn = document.getElementById('btn-speak');
  if (speakBtn) speakBtn.textContent = UI_TEXT[lang].speakBtn;

  // ── I-re-render ang weather card sa bagong wika ────────────
  if (STATE.weather) renderWeatherCard();

  // ── I-re-render ang results sa bagong wika ─────────────────
  // Kapag may resulta na — i-update ang treatment text
  if (STATE.detection.lastResult) {
    const disease  = (DISEASES[STATE.currentCrop] || {})[STATE.detection.lastResult];
    if (disease) {
      const langData  = disease[lang];
      const isHealthy = !disease.warning;
      renderTreatment(disease, langData, isHealthy);
      renderWeatherAlert(STATE.detection.lastResult, disease);
    }
    // I-update ang speak button text
    if (speakBtn) speakBtn.textContent = UI_TEXT[lang].speakBtn;
  }

  // Status message para malaman ng user na nagbago ang wika
  setStatus(UI_TEXT[lang].langChanged);
}

// ============================================================
// FUNCTION: t (translate)
// Shorthand helper function para makuha ang translation.
// Gumagamit ng current lang sa STATE.
//
// Input:  key - Key sa UI_TEXT object (hal. 'detectBtn')
// Output: Translated string
//
// Halimbawa paggamit:
//   setStatus(t('analyzing'))
//   document.getElementById('x').textContent = t('cropLabel')
// ============================================================
function t(key, param = null) {
  const lang  = STATE.currentLang;
  const value = UI_TEXT[lang][key];

  // Kung function ang value, tawagin ito kasama ang param
  if (typeof value === 'function') return value(param);

  return value || key; // Ibalik ang key kung walang translation
}
