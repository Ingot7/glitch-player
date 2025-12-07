// Global Error Handler with On-Screen Display
window.onerror = function (msg, url, lineNo, columnNo, error) {
    const errorMsg = 'Error: ' + msg + '\nLine: ' + lineNo;
    console.error(errorMsg);

    const statusDiv = document.getElementById('js-status');
    if (statusDiv) {
        statusDiv.style.background = 'darkred';
        statusDiv.textContent = 'JS: ERROR';
    }

    let debugDiv = document.getElementById('debug-log');
    if (!debugDiv) {
        debugDiv = document.createElement('div');
        debugDiv.id = 'debug-log';
        debugDiv.style.position = 'fixed';
        debugDiv.style.top = '40px';
        debugDiv.style.left = '0';
        debugDiv.style.width = '100%';
        debugDiv.style.background = 'rgba(255, 0, 0, 0.8)';
        debugDiv.style.color = 'white';
        debugDiv.style.zIndex = '9999';
        debugDiv.style.padding = '10px';
        debugDiv.style.fontFamily = 'monospace';
        document.body.appendChild(debugDiv);
    }
    debugDiv.innerHTML += '<div>' + errorMsg + '</div>';
    return false;
};

document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM Loaded. Initializing Glitch Player...");

    const statusDiv = document.getElementById('js-status');
    if (statusDiv) {
        statusDiv.style.background = 'green';
        statusDiv.textContent = 'JS: RUNNING';
        setTimeout(() => { statusDiv.style.display = 'none'; }, 2000);
    }

    // Helper to safely get element
    function getEl(id) {
        const el = document.getElementById(id);
        if (!el) {
            console.error(`Element not found: ${id}`);
            throw new Error(`Critical: Element #${id} missing from HTML.`);
        }
        return el;
    }

    try {
        // Elements
        const dropZoneA = getEl('drop-zone-a');
        const dropZoneB = getEl('drop-zone-b');
        const fileInputA = getEl('file-input-a');
        const fileInputB = getEl('file-input-b');
        const setupScreen = getEl('setup-screen');
        const playerContainer = getEl('player-container');
        const videoA = getEl('video-a');
        const videoB = getEl('video-b');
        const canvas = getEl('glitch-canvas');
        const ctx = canvas.getContext('2d');

        // Controls
        const playPauseBtn = getEl('play-pause');
        const recordBtn = getEl('record-btn');
        const crossfader = getEl('crossfader');
        const volAInput = getEl('vol-a');
        const volBInput = getEl('vol-b');

        // Effects
        const rgbShiftInput = getEl('rgb-shift');
        const noiseInput = getEl('noise-amount');
        const scanlineInput = getEl('scanline-count');
        const tintInput = getEl('tint-color');

        // Datamosh & Asset Variables
        const pixelDragInput = getEl('pixel-drag');
        const freezeBtn = getEl('freeze-btn');
        const flashBtn = getEl('flash-btn');
        const dropZoneAssets = getEl('drop-zone-assets');
        const assetInput = getEl('asset-input');

        // New Controls
        const seekA = getEl('seek-a');
        const seekB = getEl('seek-b');

        const cipherText = getEl('cipher-text');
        const cipherShiftInput = getEl('cipher-shift');
        const cipherModeInput = getEl('cipher-mode');
        const cipherScaleInput = getEl('cipher-scale');
        const cipherYInput = getEl('cipher-y');
        const toggleCipherBtn = getEl('toggle-cipher-btn');

        // New Image Controls (Safe check)
        const imgScaleInput = document.getElementById('img-scale') || { value: 1.0 };
        const imgOpacityInput = document.getElementById('img-opacity') || { value: 0.8 };
        if (!document.getElementById('img-scale')) console.warn("Image Scale input missing, using default.");

        let isPlaying = false;
        let lastFrameData = null;
        let isFrozen = false;
        let injectedImage = null;
        let isFlashing = false;
        let flashCounter = 0;

        // Cipher Variables
        let isCipherActive = false;
        let cipherMessage = "";
        let cipherShift = 3;
        let cipherMode = "caesar";
        let cipherScale = 2.0;
        let cipherY = 50; // percentage

        // Initialize
        canvas.width = 1280;
        canvas.height = 720;

        // Drag and Drop Logic
        function setupDragDrop(dropZone, fileInput, videoElement) {
            dropZone.addEventListener('click', () => fileInput.click());
            dropZone.addEventListener('dragover', (e) => {
                e.preventDefault();
                dropZone.classList.add('dragover');
            });
            dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
            dropZone.addEventListener('drop', (e) => {
                e.preventDefault();
                dropZone.classList.remove('dragover');
                handleFile(e.dataTransfer.files[0], videoElement, dropZone);
            });
            fileInput.addEventListener('change', (e) => {
                handleFile(e.target.files[0], videoElement, dropZone);
            });
        }

        function handleFile(file, videoElement, dropZone) {
            if (file && file.type.startsWith('video/')) {
                const url = URL.createObjectURL(file);
                videoElement.src = url;
                videoElement.onloadedmetadata = () => {
                    dropZone.classList.add('loaded');
                    dropZone.querySelector('p').textContent = "LOADED: " + file.name;
                    checkReady();
                };
            }
        }

        setupDragDrop(dropZoneA, fileInputA, videoA);
        setupDragDrop(dropZoneB, fileInputB, videoB);

        // Asset Drop & Click
        dropZoneAssets.addEventListener('click', (e) => {
            if (e.target !== assetInput) {
                assetInput.click();
            }
        });

        dropZoneAssets.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZoneAssets.style.background = 'rgba(255, 0, 85, 0.4)';
        });

        dropZoneAssets.addEventListener('dragleave', () => {
            dropZoneAssets.style.background = '';
        });

        function handleAsset(file) {
            if (file && file.type.startsWith('image/')) {
                const img = new Image();
                img.onload = () => {
                    injectedImage = img;
                    dropZoneAssets.classList.add('has-image');
                    dropZoneAssets.querySelector('p').textContent = "READY: " + file.name;
                    dropZoneAssets.style.background = 'rgba(255, 0, 85, 0.2)';
                };
                img.src = URL.createObjectURL(file);
            }
        }

        dropZoneAssets.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZoneAssets.style.background = '';
            handleAsset(e.dataTransfer.files[0]);
        });

        assetInput.addEventListener('change', (e) => {
            handleAsset(e.target.files[0]);
        });

        function checkReady() {
            if (videoA.src && videoB.src) {
                startPlayer();
            } else if (videoA.src || videoB.src) {
                if (!document.getElementById('start-btn')) {
                    const btn = document.createElement('button');
                    btn.id = 'start-btn';
                    btn.textContent = "ENTER CONSOLE";
                    btn.style.fontSize = "2rem";
                    btn.style.marginTop = "20px";
                    btn.style.background = "var(--text-color)";
                    btn.style.color = "var(--bg-color)";
                    btn.style.border = "none";
                    btn.style.padding = "10px 20px";
                    btn.style.cursor = "pointer";
                    btn.onclick = startPlayer;
                    setupScreen.appendChild(btn);
                }
            }
        }

        function startPlayer() {
            setupScreen.style.display = 'none';
            playerContainer.style.display = 'flex';

            if (videoA.videoWidth) {
                canvas.width = videoA.videoWidth;
                canvas.height = videoA.videoHeight;
            } else if (videoB.videoWidth) {
                canvas.width = videoB.videoWidth;
                canvas.height = videoB.videoHeight;
            }

            // Manual Start: Do NOT play videos automatically
            isPlaying = true; // Start the render loop so we see the static frame
            renderLoop();
        }

        // Transport Controls
        playPauseBtn.addEventListener('click', async () => {
            try {
                if (videoA.paused) {
                    if (videoA.src) await videoA.play();
                    if (videoB.src) await videoB.play();
                    isPlaying = true;
                    renderLoop();
                } else {
                    videoA.pause();
                    if (videoB.src) videoB.pause();
                    isPlaying = true;
                }
            } catch (err) {
                console.error("Playback error:", err);
                alert("Playback Error: " + err.message);
            }
        });

        freezeBtn.addEventListener('click', () => {
            isFrozen = !isFrozen;
            freezeBtn.classList.toggle('active');
            if (isFrozen) {
                videoA.pause();
                if (videoB.src) videoB.pause();
            } else {
                if (!videoA.paused) {
                    // It was playing
                }
            }
        });

        flashBtn.addEventListener('click', () => {
            if (injectedImage) {
                isFlashing = true;
                flashCounter = 15;
            } else {
                alert("Please drop or select an image first!");
            }
        });

        // Cipher Controls
        toggleCipherBtn.addEventListener('click', () => {
            isCipherActive = !isCipherActive;

            if (isCipherActive) {
                toggleCipherBtn.classList.add('active');
                toggleCipherBtn.textContent = "REMOVE OVERLAY";
                cipherText.style.borderColor = "#00ff41";
                if (!cipherText.value.trim()) {
                    cipherText.value = "SYSTEM OVERRIDE";
                }
            } else {
                toggleCipherBtn.classList.remove('active');
                toggleCipherBtn.textContent = "APPLY OVERLAY";
                cipherText.style.borderColor = "";
            }
            updateCipherMessage();
        });

        function updateCipherMessage() {
            let rawText = cipherText.value.toUpperCase();
            if (!rawText && isCipherActive) rawText = " ";

            const shift = parseInt(cipherShiftInput.value);
            const mode = cipherModeInput.value;

            if (mode === 'caesar') {
                cipherMessage = caesarCipher(rawText, shift);
            } else {
                cipherMessage = glitchCipher(rawText);
            }
        }

        [cipherText, cipherShiftInput, cipherModeInput].forEach(el => {
            el.addEventListener('input', updateCipherMessage);
        });

        cipherScaleInput.addEventListener('input', (e) => cipherScale = parseFloat(e.target.value));
        cipherYInput.addEventListener('input', (e) => cipherY = parseInt(e.target.value));

        function caesarCipher(str, shift) {
            return str.replace(/[A-Z]/g, char => {
                return String.fromCharCode(((char.charCodeAt(0) - 65 + shift + 26) % 26) + 65);
            });
        }

        function glitchCipher(str) {
            const glitchChars = "¡¢£¤¥¦§¨©ª«¬®¯°±²³´µ¶·¸¹º»¼½¾¿ÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖ×ØÙÚÛÜÝÞßàáâãäåæçèéêëìíîïðñòóôõö÷øùúûüýþÿ";
            return str.split('').map(char => {
                if (char === ' ') return ' ';
                if (Math.random() > 0.7) return glitchChars[Math.floor(Math.random() * glitchChars.length)];
                return char;
            }).join('');
        }

        // Seek Logic
        seekA.addEventListener('input', (e) => {
            if (videoA.duration) {
                const time = (e.target.value / 100) * videoA.duration;
                videoA.currentTime = time;
            }
        });

        seekB.addEventListener('input', (e) => {
            if (videoB.duration) {
                const time = (e.target.value / 100) * videoB.duration;
                videoB.currentTime = time;
            }
        });
        let dest;

        function initAudio() {
            if (audioCtx) return;

            const AudioContext = window.AudioContext || window.webkitAudioContext;
            audioCtx = new AudioContext();
            dest = audioCtx.createMediaStreamDestination();

            sourceA = audioCtx.createMediaElementSource(videoA);
            sourceB = audioCtx.createMediaElementSource(videoB);

            gainA = audioCtx.createGain();
            gainB = audioCtx.createGain();

            sourceA.connect(gainA);
            gainA.connect(audioCtx.destination);
            gainA.connect(dest);

            sourceB.connect(gainB);
            gainB.connect(audioCtx.destination);
            gainB.connect(dest);

            gainA.gain.value = volAInput.value;
            gainB.gain.value = volBInput.value;
        }

        volAInput.addEventListener('input', (e) => {
            if (gainA) gainA.gain.value = e.target.value;
        });
        volBInput.addEventListener('input', (e) => {
            if (gainB) gainB.gain.value = e.target.value;
        });

        // Recording Logic
        let mediaRecorder;
        let recordedChunks = [];

        function getSupportedMimeType() {
            const types = [
                'video/mp4',
                'video/webm;codecs=h264,opus',
                'video/webm;codecs=vp8,opus',
                'video/webm;codecs=vp9,opus',
                'video/webm'
            ];
            for (const type of types) {
                if (MediaRecorder.isTypeSupported(type)) {
                    console.log('Using mimeType:', type);
                    return type;
                }
            }
            return '';
        }

        recordBtn.addEventListener('click', () => {
            if (recordBtn.classList.contains('record-active')) {
                stopRecording();
            } else {
                startRecording();
            }
        });

        function startRecording() {
            if (!audioCtx) initAudio();
            if (audioCtx.state === 'suspended') audioCtx.resume();

            const canvasStream = canvas.captureStream(30);
            const audioStream = dest.stream;

            const combinedStream = new MediaStream([
                ...canvasStream.getVideoTracks(),
                ...audioStream.getAudioTracks()
            ]);

            const mimeType = getSupportedMimeType();
            const options = { mimeType: mimeType };

            try {
                mediaRecorder = new MediaRecorder(combinedStream, options);
            } catch (e) {
                console.error('MediaRecorder error:', e);
                alert('Recording failed to start. Check console for details.');
                return;
            }

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    recordedChunks.push(e.data);
                }
            };

            mediaRecorder.onstop = () => {
                const type = mediaRecorder.mimeType;
                const blob = new Blob(recordedChunks, { type: type });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;

                // Determine extension
                let ext = 'webm';
                if (type.includes('mp4')) {
                    ext = 'mp4';
                }

                a.download = 'glitch_recording_' + Date.now() + '.' + ext;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                recordedChunks = [];
            };

            mediaRecorder.start();
            recordBtn.textContent = 'Stop';
            recordBtn.classList.add('record-active');
            recordBtn.classList.remove('record-inactive');
        }

        function stopRecording() {
            mediaRecorder.stop();
            recordBtn.textContent = 'Record';
            recordBtn.classList.remove('record-active');
            recordBtn.classList.add('record-inactive');
        }

        document.addEventListener('click', () => {
            if (!audioCtx) initAudio();
        }, { once: true });

    } catch (err) {
        console.error("Initialization Error:", err);
        // Display error on screen
        const errDiv = document.createElement('div');
        errDiv.style.position = 'fixed';
        errDiv.style.top = '50%';
        errDiv.style.left = '50%';
        errDiv.style.transform = 'translate(-50%, -50%)';
        errDiv.style.background = 'red';
        errDiv.style.color = 'white';
        errDiv.style.padding = '20px';
        errDiv.style.zIndex = '10000';
        errDiv.textContent = 'CRITICAL ERROR: ' + err.message;
        document.body.appendChild(errDiv);
    }
});
