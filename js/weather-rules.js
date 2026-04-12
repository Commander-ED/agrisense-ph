// ============================================================
// weather-rules.js
// Mga rules para sa weather-based disease risk prediction.
// Batay sa IRRI at PhilRice disease forecasting guidelines.
//
// Paano gumagana:
// 1. Kinukuha ang kasalukuyang weather (temp, humidity, rain, wind)
// 2. Sinusuri laban sa bawat rule sa listahan
// 3. Kapag nag-match ang kondisyon — idinagdag sa risk list
// 4. Sorted ang results: high risk muna, medium pagkatapos
//
// Para magdagdag ng bagong rule:
// 1. Idagdag sa tamang crop array
// 2. Sundan ang format: { disease, check, risk, fil, eng }
// ============================================================

const WEATHER_RULES = {

  // ============================================================
  // RICE WEATHER RULES
  // ============================================================
  rice: [

    // ----------------------------------------------------------
    // Rice Blast — HIGH RISK
    // Kondisyon: humidity 90%+ at temperatura 22–28°C
    // Ito ang "sweet spot" ng Rice Blast fungus — perpektong
    // environment para lumaki at kumakalat ang spores.
    // ----------------------------------------------------------
    {
      disease: 'Rice Blast',
      check: (w) => w.humidity >= 90 && w.temp >= 22 && w.temp <= 28,
      risk: 'high',
      fil: 'Napakataas ng panganib ng Rice Blast! Mahalumigmig at katamtamang init — perpektong kondisyon. Mag-spray ng fungicide NGAYON.',
      eng: 'Extreme Rice Blast risk! High humidity and mild temperature — perfect fungal conditions. Apply fungicide NOW.'
    },

    // ----------------------------------------------------------
    // Rice Blast — MEDIUM RISK
    // Kondisyon: humidity 80–89% at temperatura 20–30°C
    // Hindi pa ganoon ka-mapanganib pero kailangan ng pagbabantay.
    // ----------------------------------------------------------
    {
      disease: 'Rice Blast',
      check: (w) => w.humidity >= 80 && w.humidity < 90 && w.temp >= 20 && w.temp <= 30,
      risk: 'medium',
      fil: 'Katamtamang panganib ng Rice Blast. Bantayan ang palay at mag-spray kung lumala.',
      eng: 'Medium Rice Blast risk. Monitor your rice and spray if conditions worsen.'
    },

    // ----------------------------------------------------------
    // Bacterial Leaf Blight — HIGH RISK
    // Kondisyon: malakas na ulan (10mm+) at malakas na hangin (20km/h+)
    // Ang tubig at hangin ang nagpapakalat ng bacteria mula
    // sa isang halaman papunta sa iba.
    // ----------------------------------------------------------
    {
      disease: 'Bacterial Leaf Blight',
      check: (w) => w.rain >= 10 && w.wind >= 20,
      risk: 'high',
      fil: 'Mataas na panganib ng Bacterial Blight! Malakas na ulan at hangin — kumakalat ang bacteria. Alisan ng tubig ang bukid.',
      eng: 'High Bacterial Blight risk! Heavy rain and strong wind spread bacteria. Drain the field immediately.'
    },

    // ----------------------------------------------------------
    // Bacterial Leaf Blight — MEDIUM RISK
    // Kondisyon: may ulan (5mm+) at mahalumigmig (80%+)
    // ----------------------------------------------------------
    {
      disease: 'Bacterial Leaf Blight',
      check: (w) => w.rain >= 5 && w.humidity >= 80,
      risk: 'medium',
      fil: 'Katamtamang panganib ng Bacterial Blight. Mag-ingat sa pagdilig at bantayan ang mga dahon.',
      eng: 'Medium Bacterial Blight risk. Be careful with irrigation and monitor leaves.'
    },

    // ----------------------------------------------------------
    // Brown Spot — MEDIUM RISK
    // Kondisyon: mahalumigmig (85%+) at mainit (25°C+)
    // Brown Spot ay kadalasang sanhi ng poor soil nutrition —
    // ang humidity at init ay nagpapalala lang ng existing infection.
    // ----------------------------------------------------------
    {
      disease: 'Brown Spot',
      check: (w) => w.humidity >= 85 && w.temp >= 25,
      risk: 'medium',
      fil: 'Kondisyon pabor sa Brown Spot. Tiyakin ang sapat na zinc at potassium sa lupa.',
      eng: 'Conditions favor Brown Spot. Ensure adequate zinc and potassium in the soil.'
    }
  ],

  // ============================================================
  // TOMATO WEATHER RULES
  // ============================================================
  tomato: [

    // ----------------------------------------------------------
    // Late Blight — EXTREME HIGH RISK
    // Kondisyon: humidity 90%+ at malamig na temperatura (10–20°C)
    // Ito ang pinaka-mapanganib na kondisyon —
    // ang Late Blight fungus ay pinaka-active sa malamig at basa.
    // ----------------------------------------------------------
    {
      disease: 'Late Blight',
      check: (w) => w.humidity >= 90 && w.temp >= 10 && w.temp <= 20,
      risk: 'high',
      fil: 'NAPAKATAAS ng panganib ng Late Blight! Malamig at mahalumigmig — pinaka-delikadong kondisyon. Mag-spray ng metalaxyl AGAD.',
      eng: 'EXTREME Late Blight risk! Cool and very humid — most dangerous conditions. Apply metalaxyl IMMEDIATELY.'
    },

    // ----------------------------------------------------------
    // Late Blight — HIGH RISK
    // Kondisyon: mahalumigmig (80%+), hindi masyadong mainit, may ulan
    // ----------------------------------------------------------
    {
      disease: 'Late Blight',
      check: (w) => w.humidity >= 80 && w.temp <= 24 && w.rain >= 5,
      risk: 'high',
      fil: 'Mataas na panganib ng Late Blight dahil sa ulan at hamog. Mag-spray ng copper fungicide ngayon.',
      eng: 'High Late Blight risk due to rain and moisture. Apply copper fungicide now.'
    },

    // ----------------------------------------------------------
    // Early Blight — MEDIUM RISK
    // Kondisyon: mahalumigmig (80%+) at katamtamang init (24–30°C)
    // ----------------------------------------------------------
    {
      disease: 'Early Blight',
      check: (w) => w.humidity >= 80 && w.temp >= 24 && w.temp <= 30,
      risk: 'medium',
      fil: 'Katamtamang panganib ng Early Blight. Alisin ang mga lumang dahon sa ibaba ng halaman.',
      eng: 'Medium Early Blight risk. Remove old lower leaves from the plant.'
    },

    // ----------------------------------------------------------
    // Leaf Mold — MEDIUM RISK
    // Kondisyon: kahit walang ulan, kapag mahalumigmig (85%+)
    // Ang Leaf Mold ay mas sensitive sa humidity kaysa sa ulan.
    // ----------------------------------------------------------
    {
      disease: 'Leaf Mold',
      check: (w) => w.humidity >= 85,
      risk: 'medium',
      fil: 'Mahalumigmig ang panahon — pabor ito sa Leaf Mold. Pagbutihin ang hangin sa paligid ng kamatis.',
      eng: 'High humidity favors Leaf Mold. Improve air circulation around tomato plants.'
    }
  ]
};

// ============================================================
// FUNCTION: evaluateWeatherRisk
// Sinusuri ang weather conditions laban sa lahat ng rules
// para sa napiling crop.
//
// Input:
//   crop    - 'rice' o 'tomato'
//   weather - object na may { temp, humidity, rain, wind }
//
// Output:
//   Array ng matched rules, sorted: high risk muna
//   Halimbawa: [
//     { disease: 'Rice Blast', risk: 'high', fil: '...', eng: '...' },
//     { disease: 'Brown Spot', risk: 'medium', fil: '...', eng: '...' }
//   ]
// ============================================================
function evaluateWeatherRisk(crop, weather) {
  const results = [];
  const seen = new Set(); // Para hindi mag-duplicate ng parehong disease

  // I-loop ang bawat rule para sa crop
  for (const rule of (WEATHER_RULES[crop] || [])) {
    // Kung hindi pa naka-add ang disease at nag-match ang kondisyon
    if (!seen.has(rule.disease) && rule.check(weather)) {
      results.push(rule);
      seen.add(rule.disease); // I-mark na naka-add na ang disease na ito
    }
  }

  // I-sort: high risk = 2 points, medium = 1 point
  // Mas mataas ang points = mas una sa listahan
  return results.sort((a, b) =>
    (b.risk === 'high' ? 2 : 1) - (a.risk === 'high' ? 2 : 1)
  );
}

// ============================================================
// FUNCTION: getOverallRiskLevel
// Kinukuha ang pinaka-mataas na risk level mula sa
// array ng risks.
//
// Input:  Array ng risks (mula sa evaluateWeatherRisk)
// Output: 'high' | 'medium' | 'low'
// ============================================================
function getOverallRiskLevel(risks) {
  if (risks.some(r => r.risk === 'high'))   return 'high';
  if (risks.some(r => r.risk === 'medium')) return 'medium';
  return 'low';
}

// ============================================================
// FUNCTION: getWeatherIcon
// Nagbibigay ng emoji icon batay sa WMO weather code.
// WMO = World Meteorological Organization standard codes.
//
// Input:  WMO weather code (integer)
// Output: Emoji string
// ============================================================
function getWeatherIcon(code) {
  if (code === 0)       return '☀️';   // Maliwanag
  if (code <= 3)        return '⛅';   // May ulap
  if (code <= 49)       return '🌫️';   // Hamog o ulanin
  if (code <= 69)       return '🌧️';   // Ulan
  if (code <= 79)       return '🌨️';   // Niyebe (hindi mangyayari sa PH)
  if (code <= 99)       return '⛈️';   // Bagyo o kidlat
  return '🌤️';                          // Default
}
