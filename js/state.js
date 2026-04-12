// ============================================================
// state.js
// Global state ng AgriSense PH app.
// Ito ang "memorya" ng app — lahat ng kasalukuyang datos
// ay nakalagay dito. Huwag mag-declare ng global variables
// sa ibang files — ilagay dito para maayos ang organization.
// ============================================================

const STATE = {

  // ----------------------------------------------------------
  // CROP STATE
  // Kasalukuyang napiling pananim ng farmer.
  // Possible values: 'rice' | 'tomato'
  // ----------------------------------------------------------
  currentCrop: 'rice',

  // ----------------------------------------------------------
  // LANGUAGE STATE
  // Kasalukuyang wika ng UI at voice output.
  // Possible values: 'fil' | 'eng'
  // ----------------------------------------------------------
  currentLang: CONFIG.defaultLang,

  // ----------------------------------------------------------
  // AI MODEL STATE
  // Nakalagay dito ang mga na-load na Teachable Machine models.
  // Key = crop name, Value = loaded model object o null
  // Halimbawa: { rice: <model>, tomato: null }
  // ----------------------------------------------------------
  models: {
    rice:   null,
    tomato: null
  },

  // ----------------------------------------------------------
  // CAMERA STATE
  // Impormasyon tungkol sa kasalukuyang camera session.
  // stream      = MediaStream object ng camera
  // cameraActive = bukas ba ang camera?
  // imageReady   = may larawan na ba para i-detect?
  // ----------------------------------------------------------
  camera: {
    stream:       null,
    cameraActive: false,
    imageReady:   false
  },

  // ----------------------------------------------------------
  // DETECTION STATE
  // Impormasyon tungkol sa huling detection result.
  // lastResult = className ng pinaka-probable na sakit
  // lastPct    = confidence percentage ng huling detection
  // ----------------------------------------------------------
  detection: {
    lastResult: null,
    lastPct:    0
  },

  // ----------------------------------------------------------
  // WEATHER STATE
  // Kasalukuyang weather data mula sa Open-Meteo API.
  // null = hindi pa nakuha ang weather
  // ----------------------------------------------------------
  weather: null,

  // ----------------------------------------------------------
  // UI STATE
  // Kasalukuyang estado ng UI components.
  // activeTab = kasalukuyang napiling tab sa bottom nav
  // ----------------------------------------------------------
  ui: {
    activeTab: 'detect'
  }
};

// ----------------------------------------------------------
// STATE HELPER FUNCTIONS
// Mga convenience functions para mag-update ng state.
// Gamit: STATE.set('currentCrop', 'tomato')
// ----------------------------------------------------------

/**
 * I-update ang isang property ng STATE.
 * Para sa nested properties, gumamit ng dot notation:
 * STATE.set('camera.cameraActive', true)
 *
 * @param {string} path  - Property path (hal. 'currentCrop' o 'camera.stream')
 * @param {any}    value - Bagong value
 */
STATE.set = function(path, value) {
  const keys = path.split('.');
  let obj = this;
  // I-traverse ang nested object hanggang sa huling key
  for (let i = 0; i < keys.length - 1; i++) {
    obj = obj[keys[i]];
  }
  obj[keys[keys.length - 1]] = value;
};

/**
 * Kumuha ng value mula sa STATE gamit ang dot notation.
 *
 * @param  {string} path - Property path
 * @returns {any}        - Value ng property
 */
STATE.get = function(path) {
  const keys = path.split('.');
  let obj = this;
  for (const key of keys) {
    if (obj == null) return undefined;
    obj = obj[key];
  }
  return obj;
};

/**
 * I-reset ang detection state.
 * Tinatawag kapag nagpalit ng crop o nag-clear ng larawan.
 */
STATE.resetDetection = function() {
  this.detection.lastResult = null;
  this.detection.lastPct    = 0;
};

/**
 * I-reset ang camera state.
 * Tinatawag kapag isinara ang camera.
 */
STATE.resetCamera = function() {
  this.camera.stream       = null;
  this.camera.cameraActive = false;
  this.camera.imageReady   = false;
};
