// ============================================================
// app.js
// Pangunahing initialization file ng AgriSense PH.
// Ito ang HULING JS file na nilo-load —
// kaya dito na available ang lahat ng ibang modules.
//
// Responsibilidad ng file na ito:
//   1. App initialization kapag na-load ang page
//   2. Tab navigation ng bottom nav bar
//   3. Crop selection handler
//   4. Global helper functions (setStatus, etc.)
// ============================================================

// ============================================================
// FUNCTION: initApp
// Pangunahing initialization — tinatawag kapag na-load
// ang buong HTML page at lahat ng scripts.
// ============================================================
function initApp() {
  console.log(`🌿 ${CONFIG.appName} v${CONFIG.appVersion} starting...`);

  // ── I-load ang voice list bago kailangan ──────────────────
  // Kailangan ito sa Chrome para maayos ang voice selection.
  // Ang onvoiceschanged ay nasa voice.js.
  window.speechSynthesis.getVoices();

  // ── I-load ang default crop model (rice) ──────────────────
  // Ang rice ay default crop kapag bukas ang app.
  loadModel(CONFIG.supportedCrops[0]); // 'rice'

  // ── Simulan ang pag-kuha ng weather data ──────────────────
  // Hihilingin ng browser ang GPS permission sa user.
  loadWeather();

  // ── I-update ang detect button state ──────────────────────
  // Disabled muna — walang larawan pa
  updateDetectButton();

  // ── I-set ang placeholder text batay sa default crop ──────
  const placeholder = document.getElementById('placeholder-text');
  if (placeholder) {
    placeholder.textContent = UI_TEXT[STATE.currentLang].placeholderRice;
  }

  console.log('✓ AgriSense PH initialized');
}

// ============================================================
// FUNCTION: selectCrop
// Tinatawag kapag nag-tap ang farmer sa crop selector button.
// Nagpapalit ng aktibong crop at nag-lo-load ng tamang model.
//
// Input: crop - 'rice' o 'tomato'
// ============================================================
function selectCrop(crop) {
  // Kung parehong crop na — walang gagawin
  if (STATE.currentCrop === crop) return;

  STATE.currentCrop = crop;

  // ── I-update ang visual na estado ng crop buttons ──────────
  document.getElementById('crop-rice').classList.toggle('active',   crop === 'rice');
  document.getElementById('crop-tomato').classList.toggle('active', crop === 'tomato');

  // ── I-update ang placeholder text sa camera area ───────────
  const placeholder = document.getElementById('placeholder-text');
  if (placeholder) {
    const key = crop === 'rice' ? 'placeholderRice' : 'placeholderTomato';
    placeholder.textContent = UI_TEXT[STATE.currentLang][key];
  }

  // ── Itago ang nakaraang resulta ─────────────────────────────
  clearResults();

  // ── I-reset ang preview area ───────────────────────────────
  resetPreview();

  // ── I-update ang weather risk dots ────────────────────────
  if (STATE.weather) updateWeatherRiskDots();

  // ── I-load ang model para sa bagong crop ──────────────────
  // Kung hindi pa naka-load ang model para sa crop na ito
  if (!isModelReady(crop)) {
    loadModel(crop);
  } else {
    // Handa na ang model — ipakita ang ready message
    const cropName = crop === 'rice'
      ? (STATE.currentLang === 'fil' ? 'palay' : 'rice')
      : (STATE.currentLang === 'fil' ? 'kamatis' : 'tomato');
    setStatus(t('modelReady', cropName));
  }
}

// ============================================================
// FUNCTION: switchTab
// Tinatawag kapag nag-tap ang user sa bottom navigation bar.
// Nagpapalit ng aktibong tab at nag-i-scroll sa tamang section.
//
// Input: tab - 'home' | 'detect' | 'analytics' | 'weather'
// ============================================================
function switchTab(tab) {
  // I-update ang active state ng lahat ng tab buttons
  ['home', 'detect', 'analytics', 'weather'].forEach(t => {
    const tabEl = document.getElementById(`tab-${t}`);
    if (tabEl) tabEl.classList.toggle('active', t === tab);
  });

  STATE.ui.activeTab = tab;

  switch (tab) {
    case 'home':
      // Home tab — placeholder pa, redirect sa detect
      setStatus(STATE.currentLang === 'fil'
        ? 'Home — coming soon!'
        : 'Home — coming soon!');
      setTimeout(() => switchTab('detect'), CONFIG.delays.tabRedirect);
      break;

    case 'detect':
      // Detect tab — i-scroll sa camera section
      const cameraSection = document.querySelector('.preview-wrap');
      if (cameraSection) {
        cameraSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      break;

    case 'analytics':
      // Analytics tab — pumunta sa analytics.html page
      // Itigil muna ang camera at speech bago lumipat
      stopCamera();
      stopSpeaking();
      window.location.href = 'analytics.html';
      break;

    case 'weather':
      // Weather tab — i-scroll sa weather card
      const weatherCard = document.getElementById('weather-hero');
      if (weatherCard) {
        weatherCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      // Ibalik ang detect tab bilang active (weather ay section, hindi page)
      setTimeout(() => {
        const detectTab = document.getElementById('tab-detect');
        if (detectTab) detectTab.classList.add('active');
      }, 500);
      break;
  }
}

// ============================================================
// FUNCTION: setStatus
// Global helper function para i-update ang status message
// na nagpapakita sa ilalim ng detect button.
// Ginagamit ng lahat ng ibang modules.
//
// Input: message - Text na ipapakita sa status bar
// ============================================================
function setStatus(message) {
  const el = document.getElementById('status-msg');
  if (el) el.textContent = message;
}

// ============================================================
// EVENT LISTENER: DOMContentLoaded
// Tinatawag kapag tapos na ang pag-load ng HTML structure
// ngunit bago pa mag-load ang lahat ng resources (images, etc.).
// Dito sinesimulaan ang app.
// ============================================================
document.addEventListener('DOMContentLoaded', initApp);
