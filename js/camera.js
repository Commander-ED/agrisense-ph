// ============================================================
// camera.js
// Lahat ng function para sa camera at photo upload.
// Gumagamit ng:
//   - MediaDevices API para sa camera access
//   - FileReader API para sa photo upload
// ============================================================

// ============================================================
// FUNCTION: startCamera
// Nagbubukas ng camera ng device.
// Sa mobile phones, ginagamit ang rear camera (environment).
// Sa laptop/desktop, ginagamit ang built-in webcam.
//
// Kapag bukas na ang camera at tinatawag muli — isasara ito
// (toggle behavior).
// ============================================================
async function startCamera() {
  // Toggle: kapag bukas na ang camera, isara ito
  if (STATE.camera.cameraActive) {
    stopCamera();
    return;
  }

  try {
    // Hihingin ang camera permission sa browser.
    // facingMode: 'environment' = rear camera sa mobile
    // facingMode: 'user'        = front/selfie camera
    STATE.camera.stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: 'environment', // Rear camera
        width:  { ideal: 1280 },   // Preferred resolution
        height: { ideal: 720 }
      },
      audio: false // Hindi kailangan ng audio
    });

    // Ikonekta ang camera stream sa video element
    const video = document.getElementById('video');
    video.srcObject = STATE.camera.stream;
    video.style.display = 'block';

    // Itago ang iba pang elements sa preview area
    document.getElementById('uploaded-img').style.display = 'none';
    document.getElementById('placeholder').style.display  = 'none';

    // I-update ang camera button — "Stop" na ang text
    updateCameraButton(true);

    // I-update ang state
    STATE.camera.cameraActive = true;
    STATE.camera.imageReady   = true;
    updateDetectButton();

    // Itago ang nakaraang resulta
    document.getElementById('result-card').style.display = 'none';
    STATE.resetDetection();

    setStatus(STATE.currentLang === 'fil'
      ? 'Itutok ang camera sa dahon. Pindutin ang Suriin.'
      : 'Point camera at leaf. Press Detect.');

  } catch (error) {
    // Karaniwang dahilan ng error:
    // 1. Hindi binigyan ng permission (NotAllowedError)
    // 2. Walang camera ang device (NotFoundError)
    // 3. Ginagamit na ng ibang app ang camera (NotReadableError)
    if (error.name === 'NotAllowedError') {
      setStatus(STATE.currentLang === 'fil'
        ? 'Hindi pinayagan ang camera. I-allow sa browser settings.'
        : 'Camera permission denied. Enable in browser settings.');
    } else {
      setStatus(STATE.currentLang === 'fil'
        ? 'Hindi ma-access ang camera. Subukan ang Upload Photo.'
        : 'Cannot access camera. Try Upload Photo instead.');
    }
    console.error('Camera error:', error.name, error.message);
  }
}

// ============================================================
// FUNCTION: stopCamera
// Isinasara ang camera at inililinis ang resources.
// Mahalaga ito para hindi maubos ang baterya ng phone —
// ang camera ay nagkukunsumo ng maraming kuryente.
// ============================================================
function stopCamera() {
  // Ihinto ang lahat ng camera tracks (video stream)
  if (STATE.camera.stream) {
    STATE.camera.stream.getTracks().forEach(track => {
      track.stop(); // Itigil ang bawat track (video/audio)
    });
    STATE.camera.stream = null;
  }

  // I-hide ang video element at ipakita ang placeholder
  document.getElementById('video').style.display     = 'none';
  document.getElementById('placeholder').style.display = 'flex';

  // I-restore ang camera button
  updateCameraButton(false);

  // I-reset ang camera state
  STATE.camera.cameraActive = false;
  STATE.camera.imageReady   = false;
  updateDetectButton();

  setStatus(STATE.currentLang === 'fil'
    ? 'Handa na! Kumuha ng larawan.'
    : 'Ready! Take a photo.');
}

// ============================================================
// FUNCTION: handleUpload
// Tinatawag kapag pumili ang farmer ng larawan mula sa
// gallery ng phone o files ng computer.
//
// Gumagamit ng FileReader API para i-read ang file at
// i-convert sa base64 data URL na puwedeng ipakita sa <img>.
//
// Input: event - File input change event
// ============================================================
function handleUpload(event) {
  const file = event.target.files[0];

  // Walang napiling file — huwag ituloy
  if (!file) return;

  // Kung bukas ang camera, isara muna bago mag-upload
  if (STATE.camera.cameraActive) stopCamera();

  // FileReader = built-in browser tool para mag-read ng files
  const reader = new FileReader();

  // Tinatawag ito kapag tapos na ang pag-read ng file
  reader.onload = (e) => {
    const img = document.getElementById('uploaded-img');

    // e.target.result = base64 encoded image data
    // Format: "data:image/jpeg;base64,/9j/4AAQ..."
    img.src           = e.target.result;
    img.style.display = 'block';

    // Itago ang placeholder
    document.getElementById('placeholder').style.display = 'none';

    // I-update ang state
    STATE.camera.imageReady = true;
    updateDetectButton();

    // Itago ang nakaraang resulta
    document.getElementById('result-card').style.display = 'none';
    STATE.resetDetection();

    setStatus(STATE.currentLang === 'fil'
      ? 'Larawan na-upload. Pindutin ang Suriin.'
      : 'Photo uploaded. Press Detect.');
  };

  // Magsimulang mag-read ng file bilang Data URL (base64)
  reader.readAsDataURL(file);

  // I-clear ang file input para puwedeng pumili ulit ng parehong file
  event.target.value = '';
}

// ============================================================
// FUNCTION: updateCameraButton
// Ina-update ang camera button text at icon
// depende sa kung bukas o sarado ang camera.
//
// Input: isActive - true kung bukas ang camera
// ============================================================
function updateCameraButton(isActive) {
  const btn = document.getElementById('btn-camera');

  if (isActive) {
    // Camera bukas — "Stop" button
    btn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="3" y="3" width="18" height="18" rx="2"/>
      </svg>
      ${STATE.currentLang === 'fil' ? 'Ihinto' : 'Stop'}`;
    btn.style.background = '#8a1010';
  } else {
    // Camera sarado — "Camera" button
    btn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="2" y="7" width="20" height="15" rx="2"/>
        <path d="M16 7l-2-4H10L8 7"/>
        <circle cx="12" cy="14" r="3"/>
      </svg>
      Camera`;
    btn.style.background = '#1e5c1e';
  }
}

// ============================================================
// FUNCTION: resetPreview
// Ibinabalik ang preview area sa original na estado —
// walang camera feed, walang uploaded photo, placeholder lang.
// Tinatawag kapag nagpalit ng crop.
// ============================================================
function resetPreview() {
  stopCamera();
  document.getElementById('uploaded-img').src          = '';
  document.getElementById('uploaded-img').style.display = 'none';
  document.getElementById('placeholder').style.display  = 'flex';
  STATE.camera.imageReady = false;
  updateDetectButton();
}
