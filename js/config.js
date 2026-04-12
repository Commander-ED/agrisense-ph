// ============================================================
// config.js
// Lahat ng settings at constants ng AgriSense PH app.
// Dito mo babaguhin ang mga values kung gusto mong i-customize
// ang app — hal. magdagdag ng bagong crop, baguhin ang threshold.
// ============================================================

const CONFIG = {

  // ----------------------------------------------------------
  // APP INFO
  // Pangalan at version ng app
  // ----------------------------------------------------------
  appName:    'AgriSense PH',
  appVersion: '2.0.0',
  appRegion:  'Central Luzon, Philippines',

  // ----------------------------------------------------------
  // AI MODEL PATHS
  // Kung saan nakalagay ang model files sa server.
  // Palitan ito kung iba ang folder ng iyong models.
  // ----------------------------------------------------------
  modelPaths: {
    rice:   './models/rice/',
    tomato: './models/tomato/'
  },

  // ----------------------------------------------------------
  // CONFIDENCE THRESHOLD
  // Minimum na confidence ng AI para ipakita ang resulta.
  // Kung mababa dito — ipapakita ang "Hindi Malinaw" warning.
  // Halaga: 0 hanggang 100 (percent)
  // Irerekomenda: 70 — hindi masyadong strict, hindi masyadong loose
  // ----------------------------------------------------------
  confidenceThreshold: 70,

  // ----------------------------------------------------------
  // SUPPORTED CROPS
  // Listahan ng mga pananim na kaya ng app suriin.
  // Puwedeng dagdagan ng bagong crop sa hinaharap.
  // ----------------------------------------------------------
  supportedCrops: ['rice', 'tomato'],

  // ----------------------------------------------------------
  // DEFAULT LANGUAGE
  // 'fil' = Filipino, 'eng' = English
  // ----------------------------------------------------------
  defaultLang: 'fil',

  // ----------------------------------------------------------
  // WEATHER API
  // Gumagamit ng Open-Meteo — libre, walang API key.
  // Timezone ay nakatakda sa Manila para tamang oras.
  // ----------------------------------------------------------
  weatherApi: {
    baseUrl:  'https://api.open-meteo.com/v1/forecast',
    timezone: 'Asia/Manila',
    // Mga datos na hihilingin mula sa API
    params:   'temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,weather_code'
  },

  // ----------------------------------------------------------
  // GEOLOCATION OPTIONS
  // Settings para sa GPS ng phone.
  // timeout      = max na oras ng paghihintay (milliseconds)
  // maximumAge   = gamitin ang cached location kung ilang oras pa lang
  // ----------------------------------------------------------
  geoOptions: {
    timeout:    10000,   // 10 segundo
    maximumAge: 300000   // 5 minuto
  },

  // ----------------------------------------------------------
  // HISTORY SETTINGS
  // Gaano karaming detection records ang itatago.
  // ----------------------------------------------------------
  maxHistoryRecords: 100,

  // ----------------------------------------------------------
  // VOICE SETTINGS
  // Settings para sa Text-to-Speech.
  // rate  = bilis ng pagsasalita (0.1 = mabagal, 2.0 = mabilis)
  // pitch = taas ng boses (0.0 = mababa, 2.0 = mataas)
  // ----------------------------------------------------------
  voice: {
    rate:  0.9,
    pitch: 1.0,
    // Lang codes para sa Web Speech API
    langCodes: {
      fil: 'fil-PH',
      eng: 'en-US'
    }
  },

  // ----------------------------------------------------------
  // ANIMATION DELAYS (milliseconds)
  // Timing ng mga animation at auto-actions sa app.
  // ----------------------------------------------------------
  delays: {
    autoSpeak:   600,   // Ilang ms bago auto-speak ang resulta
    scrollResult: 300,  // Ilang ms bago mag-scroll sa resulta
    tabRedirect: 1500   // Ilang ms bago mag-redirect ng tab
  }
};

// I-freeze ang config para hindi ma-modify ng ibang code
// Object.freeze() = read-only ang object
Object.freeze(CONFIG);
