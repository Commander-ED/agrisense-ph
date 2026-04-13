// ============================================================
// weather.js
// Lahat ng function para sa weather feature ng AgriSense PH.
// Gumagamit ng:
//   - Geolocation API para sa GPS ng phone
//   - Open-Meteo API para sa weather data (libre, walang API key)
//   - OpenStreetMap Nominatim API para sa reverse geocoding
//     (coordinates → pangalan ng lugar)
//   - weather-rules.js para sa risk evaluation
// ============================================================

// ============================================================
// FUNCTION: getLocationName
// Kino-convert ang GPS coordinates sa readable na pangalan
// ng lugar gamit ang OpenStreetMap Nominatim API.
// Libre ito — walang API key kailangan.
//
// Input:  lat, lon — GPS coordinates
// Output: String na pangalan ng lugar
//         Halimbawa: "Angeles City, Pampanga"
//         O fallback: "15.14°N, 120.59°E" kung may error
// ============================================================
async function getLocationName(lat, lon) {
  try {
    // Nominatim reverse geocoding API ng OpenStreetMap
    // format=json    = JSON ang sagot
    // zoom=10        = antas ng detalye — 10 = city/municipality level
    //                  (hindi nagpapakita ng specific na street o barangay)
    // addressdetails=1 = kasama ang breakdown ng address (city, province, etc.)
    const url = `https://nominatim.openstreetmap.org/reverse?` +
      `lat=${lat.toFixed(6)}&lon=${lon.toFixed(6)}` +
      `&format=json&zoom=10&addressdetails=1`;

    // Kailangan ng User-Agent header — required ng Nominatim API
    // para malaman nila kung sino ang gumagamit ng kanilang serbisyo
    const response = await fetch(url, {
      headers: { 'User-Agent': 'AgriSensePH/2.0 (crop disease detection app)' }
    });

    if (!response.ok) throw new Error('Geocoding failed');

    const data = await response.json();
    const addr = data.address || {};

    // Buuin ang location name mula sa available na address components.
    // Sinusubukan ang iba't ibang fields dahil hindi consistent ang
    // Nominatim sa lahat ng lugar sa Pilipinas.
    const city     = addr.city || addr.town || addr.municipality || addr.village || '';
    const province = addr.province || addr.state || addr.county || '';
    const country  = addr.country_code?.toUpperCase() || '';

    // Format: "Angeles City, Pampanga" o "San Fernando, Pampanga"
    if (city && province) return `${city}, ${province}`;
    if (city)             return city;
    if (province)         return province;

    // Fallback kung hindi ma-parse ang address
    return `${lat.toFixed(2)}°N, ${lon.toFixed(2)}°E`;

  } catch (error) {
    // Hindi critical ang error na ito — coordinates pa rin ang ipapakita
    console.warn('Reverse geocoding failed:', error.message);
    return `${lat.toFixed(2)}°N, ${lon.toFixed(2)}°E`;
  }
}

// ============================================================
// FUNCTION: loadWeather
// Pangunahing function — kumukuha ng GPS location ng phone,
// iko-convert sa location name, at nagfe-fetch ng weather data.
//
// Flow:
// 1. Humingi ng GPS permission sa browser
// 2. Kunin ang latitude at longitude ng phone
// 3. Sabay na i-fetch ang weather AT ang location name
//    (Promise.all = paralelo para mas mabilis)
// 4. I-save sa STATE.weather kasama ang location name
// 5. I-render ang weather card sa UI
// ============================================================
async function loadWeather() {
  // Ipakita ang loading state sa weather card
  renderWeatherLoading();

  try {
    // ── STEP 1: Kunin ang GPS coordinates ──────────────────────
    // Ang geolocation.getCurrentPosition() ay asynchronous —
    // ginagawa nating Promise para mas madaling gamitin ng async/await.
    const position = await new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        resolve,  // Kapag nagtagumpay — papasa ang position object
        reject,   // Kapag may error — papasa ang error object
        CONFIG.geoOptions // timeout at maximumAge settings
      );
    });

    const { latitude: lat, longitude: lon } = position.coords;

    // ── STEP 2: I-fetch ang weather AT location name nang sabay ──
    // Gumagamit ng Promise.all para sabay na mag-fetch ng dalawang
    // API calls — mas mabilis kaysa isa-isa (sequential).
    // Kung mabigo ang geocoding, okay lang — may fallback.
    const weatherUrl = buildWeatherUrl(lat, lon);
    const [weatherResponse, locationName] = await Promise.all([
      fetch(weatherUrl),
      getLocationName(lat, lon)  // Reverse geocoding — coordinates → lugar
    ]);

    // Kung may HTTP error sa weather API (404, 500, etc.)
    if (!weatherResponse.ok) {
      throw new Error(`Weather API error: ${weatherResponse.status}`);
    }

    const json = await weatherResponse.json();

    // ── STEP 3: I-extract at i-save ang datos ──────────────────
    // Ang 'current' property ng response ay naglalaman ng
    // kasalukuyang weather values.
    const current = json.current;
    STATE.weather = {
      temp:     Math.round(current.temperature_2m),            // Celsius
      humidity: Math.round(current.relative_humidity_2m),      // Percent
      rain:     Math.round(current.precipitation * 10) / 10,   // mm (1 decimal)
      wind:     Math.round(current.wind_speed_10m),             // km/h
      code:     current.weather_code,                           // WMO code
      lat:      lat.toFixed(2),                                 // Latitude
      lon:          lon.toFixed(2),                                 // Longitude
      locationName: locationName  // Pangalan ng lugar (hal. 'Angeles City, Pampanga')
    };

    // ── STEP 4: I-render ang weather card ──────────────────────
    renderWeatherCard();

    // I-update ang risk dots sa crop selector buttons
    updateWeatherRiskDots();

  } catch (error) {
    // I-handle ang iba't ibang uri ng error
    renderWeatherError(error);
    console.error('Weather fetch error:', error);
  }
}

// ============================================================
// FUNCTION: buildWeatherUrl
// Gumagawa ng Open-Meteo API URL gamit ang coordinates.
//
// Input:  lat, lon - GPS coordinates
// Output: Complete URL string para sa API call
// ============================================================
function buildWeatherUrl(lat, lon) {
  const base   = CONFIG.weatherApi.baseUrl;
  const params = CONFIG.weatherApi.params;
  const tz     = encodeURIComponent(CONFIG.weatherApi.timezone);

  return `${base}?latitude=${lat.toFixed(4)}&longitude=${lon.toFixed(4)}&current=${params}&timezone=${tz}`;
}

// ============================================================
// FUNCTION: renderWeatherCard
// Nagre-render ng buong weather card sa UI
// gamit ang datos na nakalagay sa STATE.weather.
// ============================================================
function renderWeatherCard() {
  if (!STATE.weather) return;

  const w    = STATE.weather;
  const lang = STATE.currentLang;

  // Kuhanin ang risk evaluation para sa kasalukuyang crop
  const risks       = evaluateWeatherRisk(STATE.currentCrop, w);
  const overallRisk = getOverallRiskLevel(risks);
  const icon        = getWeatherIcon(w.code);

  // Texts para sa risk banner
  const riskTitles = {
    low:    { fil: 'Mababang Panganib',      eng: 'Low Risk — Good Conditions' },
    medium: { fil: 'Katamtamang Panganib',   eng: 'Medium Risk — Be Cautious' },
    high:   { fil: '⚠ MATAAS NA PANGANIB',  eng: '⚠ HIGH DISEASE RISK' }
  };

  const riskMessages = {
    low: {
      fil: 'Magandang panahon. Patuloy na bantayan ang inyong pananim.',
      eng: 'Good conditions. Continue monitoring your crops.'
    },
    medium: {
      fil: 'Ang panahon ay pabor sa ilang sakit. Bantayan nang mabuti.',
      eng: 'Weather favors some diseases. Monitor closely.'
    },
    high: {
      fil: 'Kailangan ng aksyon! Ang panahon ay lubhang pabor sa sakit.',
      eng: 'Action needed! Weather strongly favors disease outbreak.'
    }
  };

  // Gumawa ng disease risk pills
  const pillsHtml = risks.length > 0
    ? `<div class="risk-pills">
        ${risks.map(r => `<span class="risk-pill ${r.risk}">${r.disease}</span>`).join('')}
       </div>`
    : '';

  // Top risk message (pinaka-mapanganib)
  const topMsgHtml = risks[0]
    ? `<div class="risk-top-msg">${risks[0][lang]}</div>`
    : '';

  // I-inject ang HTML sa weather card body
  document.getElementById('weather-body').innerHTML = `
    <div class="weather-top">
      <div class="weather-left">
        <div class="weather-loc">
          📍 ${w.locationName || (lang === 'fil' ? 'Inyong Lokasyon' : 'Your Location')}
        </div>
        <div class="weather-temp">${w.temp}°</div>
        <div class="weather-desc">Celsius</div>
      </div>
      <div class="weather-right">
        <div class="weather-icon-big">${icon}</div>
        <button class="weather-refresh-btn" onclick="loadWeather()">
          ↻ ${lang === 'fil' ? 'I-refresh' : 'Refresh'}
        </button>
      </div>
    </div>

    <div class="weather-stats">
      <div class="w-stat">
        <span class="w-stat-icon">💧</span>
        <span class="w-stat-val">${w.humidity}%</span>
        <span class="w-stat-lbl">Humidity</span>
      </div>
      <div class="w-stat">
        <span class="w-stat-icon">🌧️</span>
        <span class="w-stat-val">${w.rain}mm</span>
        <span class="w-stat-lbl">${lang === 'fil' ? 'Ulan' : 'Rain'}</span>
      </div>
      <div class="w-stat">
        <span class="w-stat-icon">💨</span>
        <span class="w-stat-val">${w.wind}</span>
        <span class="w-stat-lbl">km/h</span>
      </div>
    </div>

    <div class="risk-banner ${overallRisk}">
      <div class="risk-dot ${overallRisk}"></div>
      <div class="risk-content">
        <div class="risk-title">${riskTitles[overallRisk][lang]}</div>
        <div class="risk-msg">${riskMessages[overallRisk][lang]}</div>
        ${pillsHtml}
        ${topMsgHtml}
        <button class="weather-listen-btn" onclick="speakWeather()">
          🔊 ${lang === 'fil' ? 'Pakinggan' : 'Listen'}
        </button>
      </div>
    </div>`;

  // Ipakita ang notification dot sa nav bar kapag high risk
  const navDot = document.getElementById('weather-nav-dot');
  if (navDot) navDot.style.display = overallRisk === 'high' ? 'block' : 'none';
}

// ============================================================
// FUNCTION: renderWeatherLoading
// Nagpapakita ng loading state sa weather card
// habang nife-fetch ang weather data.
// ============================================================
function renderWeatherLoading() {
  const msg = STATE.currentLang === 'fil'
    ? '📡 Kinukuha ang weather data...'
    : '📡 Fetching weather data...';
  document.getElementById('weather-body').innerHTML =
    `<div class="weather-loading">${msg}</div>`;
}

// ============================================================
// FUNCTION: renderWeatherError
// Nagpapakita ng error message kapag hindi nakuha ang weather.
// May "Try Again" button para puwedeng subukan muli.
//
// Input: error - Error object mula sa catch block
// ============================================================
function renderWeatherError(error) {
  const lang = STATE.currentLang;
  let msg = '';

  // Tukuyin ang uri ng error para mas malinaw na message
  if (error.code === 1) {
    // GeolocationPositionError.PERMISSION_DENIED
    msg = lang === 'fil'
      ? 'Hindi pinayagan ang location access. I-allow sa browser settings para makita ang weather.'
      : 'Location access denied. Enable in browser settings to see weather data.';
  } else if (error.code === 2) {
    // GeolocationPositionError.POSITION_UNAVAILABLE
    msg = lang === 'fil'
      ? 'Hindi makuha ang inyong lokasyon. Subukan muli.'
      : 'Cannot get your location. Please try again.';
  } else if (error.code === 3) {
    // GeolocationPositionError.TIMEOUT
    msg = lang === 'fil'
      ? 'Timeout — masyadong matagal ang GPS. Subukan muli.'
      : 'GPS timeout. Please try again.';
  } else {
    // Network error o iba pa
    msg = lang === 'fil'
      ? 'Hindi makuha ang weather. Tiyaking may internet connection.'
      : 'Cannot get weather. Check your internet connection.';
  }

  document.getElementById('weather-body').innerHTML = `
    <div class="weather-error">
      ${msg}
      <button class="weather-retry-btn" onclick="loadWeather()">
        ${lang === 'fil' ? '↻ Subukan Muli' : '↻ Try Again'}
      </button>
    </div>`;
}

// ============================================================
// FUNCTION: updateWeatherRiskDots
// Naglalagay ng kulay na dots sa crop selector buttons
// para ipakita ang weather risk level per crop.
// Pula = high risk, Dilaw = medium risk, Walang dot = low risk
// ============================================================
function updateWeatherRiskDots() {
  if (!STATE.weather) return;

  // I-evaluate ang risk para sa bawat supported crop
  CONFIG.supportedCrops.forEach(crop => {
    const risks = evaluateWeatherRisk(crop, STATE.weather);
    const level = getOverallRiskLevel(risks);
    const dot   = document.getElementById(`${crop}-risk-dot`);

    if (dot) {
      // Itakda ang kulay ng dot batay sa risk level
      dot.style.background = level === 'high'   ? '#e05020'
                           : level === 'medium' ? '#c08000'
                           : 'transparent';
      dot.style.display = level !== 'low' ? 'inline-block' : 'none';
    }
  });
}
