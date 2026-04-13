// ============================================================
// model.js
// Lahat ng function para sa AI model — pag-load at detection.
// Gumagamit ng Google Teachable Machine library (tmImage)
// na naka-load mula sa libs/ folder.
// ============================================================

// ============================================================
// FUNCTION: loadModel
// Naglo-load ng AI model mula sa model files sa server.
// Tinatawag kapag:
//   1. Una na bukas ang app (rice model)
//   2. Nagpalit ng crop (rice → tomato o vice versa)
//
// Input:  crop - 'rice' o 'tomato'
// Output: Wala (ina-update ang STATE.models[crop] directly)
// ============================================================
async function loadModel(crop) {
  const cropName = crop === 'rice'
    ? (STATE.currentLang === 'fil' ? 'palay' : 'rice')
    : (STATE.currentLang === 'fil' ? 'kamatis' : 'tomato');

  // Ipakita ang loading status sa UI
  setStatus(STATE.currentLang === 'fil'
    ? `Nilo-load ang modelo ng ${cropName}...`
    : `Loading ${crop} model...`);

  try {
    // tmImage.load() = ang Teachable Machine library function
    // Kailangan ng dalawang files: model.json at metadata.json
    // Ang weights.bin ay awtomatikong nilo-load kasama ang model.json
    STATE.models[crop] = await tmImage.load(
      CONFIG.modelPaths[crop] + 'model.json',
      CONFIG.modelPaths[crop] + 'metadata.json'
    );

    // Kung kasalukuyang crop ang na-load, i-update ang status
    if (STATE.currentCrop === crop) {
      setStatus(STATE.currentLang === 'fil'
        ? `Handa na! Kumuha ng larawan ng dahon ng ${cropName}.`
        : `Ready! Take a photo of the ${crop} leaf.`);
    }

    console.log(`✓ Model loaded: ${crop}`);

  } catch (error) {
    // Karaniwang dahilan ng error:
    // 1. Wala ang model files sa models/ folder
    // 2. Mali ang path sa CONFIG.modelPaths
    // 3. Walang internet (kung online model ang ginagamit)
    if (STATE.currentCrop === crop) {
      setStatus(STATE.currentLang === 'fil'
        ? `Hindi ma-load ang modelo ng ${cropName}. Suriin ang models/${crop}/ folder.`
        : `Cannot load ${crop} model. Check the models/${crop}/ folder.`);
    }
    console.error(`✗ Model load failed for ${crop}:`, error);
  }
}

// ============================================================
// FUNCTION: runDetection
// Pangunahing detection function — pinapatakbo ang AI model
// sa larawan at nagbabalik ng predictions.
//
// Hindi direktang tinatawag ito ng UI — tinatawag ng
// btn-detect onclick handler.
//
// Flow:
// 1. Kuhanin ang model para sa kasalukuyang crop
// 2. Kunin ang image source (camera o uploaded photo)
// 3. Ipasa sa model.predict()
// 4. I-pass ang results sa showResults()
// ============================================================
async function runDetection() {
  const model = STATE.models[STATE.currentCrop];

  // Kung hindi pa loaded ang model — huwag ituloy
  if (!model) {
    setStatus(STATE.currentLang === 'fil'
      ? 'Hindi pa handa ang modelo. Sandali lang.'
      : 'Model not ready yet. Please wait.');
    return;
  }

  // Kunin ang image source depende sa kung camera o upload
  const source = STATE.camera.cameraActive
    ? document.getElementById('video')
    : document.getElementById('uploaded-img');

  // I-clear ang dati na toast bago magsimula ng bagong detection
  const prevToast = document.getElementById('not-a-leaf-toast');
  if (prevToast) prevToast.innerHTML = '';

  // Ipakita ang loading state sa button
  setDetectButtonLoading(true);
  setStatus(STATE.currentLang === 'fil'
    ? 'Sinusuri ang dahon...'
    : 'Analyzing leaf...');

  try {
    // model.predict() = pangunahing AI function
    // Input:  HTML element (video o img)
    // Output: Array ng { className: string, probability: number }
    // Halimbawa: [
    //   { className: 'Rice Blast', probability: 0.89 },
    //   { className: 'Healthy Rice', probability: 0.07 },
    //   { className: 'Brown Spot', probability: 0.03 },
    //   { className: 'Bacterial Leaf Blight', probability: 0.01 }
    // ]
    const predictions = await model.predict(source);

    // Ipasa ang results sa results.js para ipakita sa UI
    showResults(predictions);

    // I-save sa history (history.js)
    const sorted = [...predictions].sort((a, b) => b.probability - a.probability);
    saveToHistory(sorted[0], STATE.currentCrop);

  } catch (error) {
    setStatus(STATE.currentLang === 'fil'
      ? 'May error sa pagsusuri. Subukan muli.'
      : 'Detection error. Please try again.');
    console.error('Detection error:', error);
  } finally {
    // I-restore ang button state kahit may error o success
    setDetectButtonLoading(false);
    updateDetectButton();
  }
}

// ============================================================
// FUNCTION: setDetectButtonLoading
// Nagpapalit ng detect button sa loading state —
// nagpapakita ng spinner at nagdi-disable ng button.
//
// Input: isLoading - true = loading state, false = normal state
// ============================================================
function setDetectButtonLoading(isLoading) {
  const btn        = document.getElementById('btn-detect');
  const detectText = document.getElementById('detect-text');
  const spinner    = document.getElementById('spinner');

  btn.disabled          = isLoading;
  detectText.style.display = isLoading ? 'none'          : 'inline';
  spinner.style.display    = isLoading ? 'inline-block'  : 'none';
}

// ============================================================
// FUNCTION: updateDetectButton
// Ina-update ang enabled/disabled state ng detect button.
// Disabled kapag walang larawan pa — enabled kapag may larawan.
// Tinatawag kapag nagbago ang imageReady state.
// ============================================================
function updateDetectButton() {
  const btn = document.getElementById('btn-detect');
  btn.disabled      = !STATE.camera.imageReady;
  btn.style.opacity = STATE.camera.imageReady ? '1' : '0.45';
}

// ============================================================
// FUNCTION: isModelReady
// Helper function para malaman kung loaded na ang model
// para sa kasalukuyang crop.
//
// Output: true kung loaded, false kung hindi pa
// ============================================================
function isModelReady(crop) {
  return STATE.models[crop] !== null;
}
