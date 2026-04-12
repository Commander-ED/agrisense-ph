// ============================================================
// history.js
// Lahat ng function para sa detection history feature.
// Gumagamit ng localStorage para itago ang datos sa device
// ng farmer — nananatili kahit isara ang browser.
//
// Ang history ay ginagamit ng:
//   - analytics.html para ipakita ang charts at statistics
//   - Puwedeng i-export bilang CSV para sa Excel o JSON
// ============================================================

// ============================================================
// FUNCTION: saveToHistory
// Nagtatago ng detection result sa localStorage ng device.
// Tinatawag ng runDetection() sa model.js pagkatapos mag-detect.
//
// Input:
//   topPrediction - { className, probability } ng top result
//   crop          - 'rice' o 'tomato'
// ============================================================
function saveToHistory(topPrediction, crop) {
  try {
    // Gumawa ng bagong history record
    const record = {
      // ISO format para consistent ang date format
      date:       new Date().toISOString(),
      crop:       crop,
      disease:    topPrediction.className,
      confidence: Math.round(topPrediction.probability * 100),
      // I-copy ang weather data kung available
      // Spread operator (...) para gumawa ng bagong object
      weather:    STATE.weather ? { ...STATE.weather } : null
    };

    // Kunin ang existing history mula sa localStorage
    // JSON.parse() = kino-convert ang string pabalik sa array
    const history = loadHistory();

    // Ilagay ang bagong record sa simula ng array (pinakabago muna)
    history.unshift(record);

    // Limitahan ang bilang ng records para hindi maubusan ng storage
    if (history.length > CONFIG.maxHistoryRecords) {
      // Tanggalin ang mga lumang records sa dulo
      history.splice(CONFIG.maxHistoryRecords);
    }

    // I-save pabalik sa localStorage
    // JSON.stringify() = kino-convert ang array sa string
    localStorage.setItem('agrisense_history', JSON.stringify(history));

    console.log(`✓ History saved: ${crop} - ${topPrediction.className}`);

  } catch (error) {
    // Hindi serious ang error na ito — puwedeng mangyari kapag:
    // 1. Puno na ang localStorage (quota exceeded)
    // 2. Private/Incognito mode ng browser
    console.warn('History save skipped:', error.message);
  }
}

// ============================================================
// FUNCTION: loadHistory
// Kinukuha ang lahat ng detection history mula sa localStorage.
//
// Output: Array ng history records, pinakabago muna.
//         Empty array kapag wala pa o may error.
// ============================================================
function loadHistory() {
  try {
    const stored = localStorage.getItem('agrisense_history');
    // Kung walang stored data, ibalik ang empty array
    if (!stored) return [];
    return JSON.parse(stored);
  } catch (error) {
    console.error('History load error:', error);
    return []; // Ibalik ang empty array para hindi mag-crash ang app
  }
}

// ============================================================
// FUNCTION: clearHistory
// Binubura ang lahat ng detection history mula sa localStorage.
// May confirmation dialog bago mag-delete para hindi aksidente.
// ============================================================
function clearHistory() {
  const lang = STATE.currentLang;
  const confirmMsg = lang === 'fil'
    ? 'Sigurado ka bang gusto mong burahin ang lahat ng kasaysayan ng deteksyon?'
    : 'Are you sure you want to clear all detection history?';

  // Hintayin ang confirmation ng user
  if (confirm(confirmMsg)) {
    localStorage.removeItem('agrisense_history');
    console.log('✓ History cleared');
    return true;
  }
  return false;
}

// ============================================================
// FUNCTION: getHistoryStats
// Kinakalkula ang statistics mula sa history data.
// Ginagamit ng analytics.html para sa dashboard.
//
// Input:  history - Array ng history records
// Output: Object na may computed statistics, o null kung walang data
// ============================================================
function getHistoryStats(history) {
  if (!history || !history.length) return null;

  const stats = {
    total:         history.length,
    rice:          0,
    tomato:        0,
    avgConfidence: 0,
    diseaseCounts: {},   // { 'Rice Blast': 5, 'Brown Spot': 3 }
    healthyCount:  0,
    diseaseCount:  0,
    recentWeather: null
  };

  let totalConf = 0;

  // I-loop at i-tally ang bawat record
  history.forEach(record => {
    // Count per crop
    if (record.crop === 'rice') stats.rice++;
    else stats.tomato++;

    // Accumulate confidence para sa average calculation
    totalConf += (record.confidence || 0);

    // Count per disease
    const disease = record.disease || 'Unknown';
    stats.diseaseCounts[disease] = (stats.diseaseCounts[disease] || 0) + 1;

    // Healthy vs diseased count
    if (disease.toLowerCase().includes('healthy')) stats.healthyCount++;
    else stats.diseaseCount++;

    // Kunin ang pinakabagong weather data (ang una sa list = pinakabago)
    if (record.weather && !stats.recentWeather) {
      stats.recentWeather = record.weather;
    }
  });

  // Kalkulahin ang average confidence
  stats.avgConfidence = Math.round(totalConf / history.length);

  // I-sort ang disease counts at kunin ang top 6
  stats.topDiseases = Object.entries(stats.diseaseCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  return stats;
}

// ============================================================
// FUNCTION: exportHistoryCSV
// Kino-convert ang history data sa CSV format at dino-download.
// Ang CSV ay puwedeng buksan sa Excel o Google Sheets.
// ============================================================
function exportHistoryCSV() {
  const history = loadHistory();
  const lang    = STATE.currentLang;

  if (!history.length) {
    alert(lang === 'fil' ? 'Walang data para i-export.' : 'No data to export.');
    return;
  }

  // CSV headers — unang row ng file
  const headers = [
    'Date', 'Crop', 'Disease', 'Confidence (%)',
    'Temperature (°C)', 'Humidity (%)', 'Rain (mm)', 'Wind (km/h)',
    'Latitude', 'Longitude'
  ];

  // Gawing CSV rows ang bawat history record
  const rows = history.map(r => [
    r.date              || '',
    r.crop              || '',
    r.disease           || '',
    r.confidence        || '',
    r.weather?.temp     || '',
    r.weather?.humidity || '',
    r.weather?.rain     || '',
    r.weather?.wind     || '',
    r.weather?.lat      || '',
    r.weather?.lon      || ''
  ]);

  // Pagsamahin ang headers at rows sa isang CSV string
  // Bawat value ay nakabalot sa quotes para sa mga value na may comma
  const csvContent = [headers, ...rows]
    .map(row => row.map(cell => `"${cell}"`).join(','))
    .join('\n');

  downloadFile('agrisense_ph_history.csv', csvContent, 'text/csv');
}

// ============================================================
// FUNCTION: exportHistoryJSON
// Kino-convert ang history data sa JSON format at dino-download.
// Para sa mga developer na gusto ng raw data para sa analysis.
// ============================================================
function exportHistoryJSON() {
  const history = loadHistory();
  const lang    = STATE.currentLang;

  if (!history.length) {
    alert(lang === 'fil' ? 'Walang data para i-export.' : 'No data to export.');
    return;
  }

  // JSON.stringify() na may 2-space indentation = mas madaling basahin
  const jsonContent = JSON.stringify(history, null, 2);
  downloadFile('agrisense_ph_history.json', jsonContent, 'application/json');
}

// ============================================================
// FUNCTION: downloadFile
// Helper function — gumagawa ng temporary download link
// at awtomatikong kino-click para ma-download ang file.
//
// Input:
//   filename  - Pangalan ng file na ida-download
//   content   - Content ng file (string)
//   mimeType  - MIME type (hal. 'text/csv', 'application/json')
// ============================================================
function downloadFile(filename, content, mimeType) {
  // Gumawa ng Blob (Binary Large Object) mula sa text content
  const blob = new Blob([content], { type: mimeType });

  // Gumawa ng temporary URL para sa Blob
  const url = URL.createObjectURL(blob);

  // Gumawa ng invisible anchor element at i-click ito para mag-download
  const link       = document.createElement('a');
  link.href        = url;
  link.download    = filename;
  link.style.display = 'none';

  document.body.appendChild(link);
  link.click(); // Simulate click para simulan ang download

  // Linisin ang temporary resources pagkatapos ng download
  setTimeout(() => {
    document.body.removeChild(link);
    URL.revokeObjectURL(url); // I-release ang memory
  }, 100);
}
