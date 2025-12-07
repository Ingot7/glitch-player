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
                    try {
                        dropZone.classList.add('loaded');
                        dropZone.querySelector('p').textContent = "LOADED: " + file.name;
                        checkReady();
                    } catch (e) {
                        console.error("Metadata Load Error:", e);
                    }
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
                    try {
                        injectedImage = img;
                        dropZoneAssets.classList.add('has-image');
                        dropZoneAssets.querySelector('p').textContent = "READY: " + file.name;
                        dropZoneAssets.style.background = 'rgba(255, 0, 85, 0.2)';
                    } catch (e) {
                        console.error("Image Load Error:", e);
                    }
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
            try {
                let rawText = cipherText.value.toUpperCase();
                if (!rawText && isCipherActive) rawText = " ";

                const shift = parseInt(cipherShiftInput.value);
                const mode = cipherModeInput.value;

                if (mode === 'caesar') {
                    cipherMessage = caesarCipher(rawText, shift);
                } else {
                    cipherMessage = glitchCipher(rawText);
                }
            } catch (e) {
                console.error("Cipher Update Error:", e);
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
        // Render Loop
        function renderLoop() {
            if (!isPlaying) return;

            try {
                // Clear canvas
                ctx.fillStyle = '#000';
                ctx.fillRect(0, 0, canvas.width, canvas.height);

                // Draw Video A
                if (videoA.src && videoA.readyState >= 2) {
                    ctx.globalAlpha = 1;
                    ctx.drawImage(videoA, 0, 0, canvas.width, canvas.height);
                }

                // Draw Video B (blended)
                const mix = parseFloat(crossfader.value);
                if (videoB.src && videoB.readyState >= 2 && mix > 0) {
                    ctx.globalAlpha = mix;
                    ctx.drawImage(videoB, 0, 0, canvas.width, canvas.height);
                }

                ctx.globalAlpha = 1;

                // Get pixel data
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const data = imageData.data;
                const width = canvas.width;
                const height = canvas.height;

                // Effects Parameters
                const rgbShift = parseInt(rgbShiftInput.value);
                const noiseAmount = parseInt(noiseInput.value);
                const scanlineIntensity = parseInt(scanlineInput.value);
                const tintHex = tintInput.value;
                const pixelDrag = parseInt(pixelDragInput.value);

                const tr = parseInt(tintHex.slice(1, 3), 16);
                const tg = parseInt(tintHex.slice(3, 5), 16);
                const tb = parseInt(tintHex.slice(5, 7), 16);

                const newImageData = ctx.createImageData(width, height);
                const newData = newImageData.data;

                for (let y = 0; y < height; y++) {
                    for (let x = 0; x < width; x++) {
                        const index = (y * width + x) * 4;

                        // RGB Shift
                        let rIndex = index;
                        if (rgbShift > 0) {
                            const offset = Math.floor(Math.random() * rgbShift) - (rgbShift / 2);
                            let rX = x + offset;
                            if (rX >= 0 && rX < width) {
                                rIndex = (y * width + rX) * 4;
                            }
                        }

                        // Read source
                        let r = data[rIndex];
                        let g = data[rIndex + 1];
                        let b = data[rIndex + 2];

                        // Noise
                        if (noiseAmount > 0) {
                            const noise = (Math.random() - 0.5) * noiseAmount;
                            r += noise;
                            g += noise;
                            b += noise;
                        }

                        // Tint
                        r = r * (tr / 255);
                        g = g * (tg / 255);
                        b = b * (tb / 255);

                        // Scanlines
                        if (scanlineIntensity > 0 && y % 4 === 0) {
                            if (Math.random() * 20 < scanlineIntensity) {
                                r *= 0.5;
                                g *= 0.5;
                                b *= 0.5;
                            }
                        }

                        newData[index] = r;
                        newData[index + 1] = g;
                        newData[index + 2] = b;
                        newData[index + 3] = 255;
                    }
                }

                // Pixel Drag (Datamosh)
                if (pixelDrag > 0 && lastFrameData) {
                    for (let i = 0; i < newData.length; i += 4) {
                        const diff = Math.abs(newData[i] - lastFrameData[i]) +
                            Math.abs(newData[i + 1] - lastFrameData[i + 1]) +
                            Math.abs(newData[i + 2] - lastFrameData[i + 2]);

                        if (diff < pixelDrag) {
                            newData[i] = lastFrameData[i];
                            newData[i + 1] = lastFrameData[i + 1];
                            newData[i + 2] = lastFrameData[i + 2];
                        }
                    }
                }

                ctx.putImageData(newImageData, 0, 0);

                // Save frame for next loop
                lastFrameData = new Uint8ClampedArray(newData);

                // Image Injection
                if (isFlashing && injectedImage) {
                    const imgScale = parseFloat(imgScaleInput.value);
                    const imgOpacity = parseFloat(imgOpacityInput.value);

                    let dW = injectedImage.width * imgScale;
                    let dH = injectedImage.height * imgScale;

                    const x = Math.random() * (canvas.width - dW);
                    const y = Math.random() * (canvas.height - dH);

                    ctx.globalAlpha = imgOpacity;
                    ctx.drawImage(injectedImage, x, y, dW, dH);

                    flashCounter--;
                    if (flashCounter <= 0) isFlashing = false;
                }

                // Draw Cipher Overlay
                if (isCipherActive && cipherMessage) {
                    ctx.save();

                    // Force reset crucial context states
                    ctx.globalAlpha = 1.0;
                    ctx.globalCompositeOperation = 'source-over';

                    const fontSize = 30 * cipherScale;
                    ctx.font = `bold ${fontSize}px "Courier New", monospace`;
                    ctx.fillStyle = "#00ff41";
                    ctx.textAlign = "center";
                    ctx.textBaseline = "middle";
                    ctx.shadowColor = "rgba(0, 255, 65, 0.5)";
                    ctx.shadowBlur = 10;

                    const xOffset = (Math.random() - 0.5) * 4;
                    const yOffset = (Math.random() - 0.5) * 4;

                    const yPos = (canvas.height * (cipherY / 100));

                    if (Math.random() > 0.95) {
                        ctx.fillStyle = "#ff0055"; // Occasional red glitch
                        ctx.shadowColor = "#ff0055";
                        ctx.shadowBlur = 0;
                    }

                    ctx.fillText(cipherMessage, (canvas.width / 2) + xOffset, yPos + yOffset);
                    ctx.restore();
                }

                // Update Seek Bars (UI Feedback)
                if (!videoA.paused && videoA.duration) {
                    seekA.value = (videoA.currentTime / videoA.duration) * 100;
                }
                if (!videoB.paused && videoB.duration) {
                    seekB.value = (videoB.currentTime / videoB.duration) * 100;
                }

                requestAnimationFrame(renderLoop);

            } catch (err) {
                console.error("Render Loop Error:", err);
                const statusDiv = document.getElementById('js-status');
                if (statusDiv) {
                    statusDiv.style.background = 'darkred';
                    statusDiv.textContent = 'RENDER ERROR: ' + err.message;
                }
                isPlaying = false;
            }
        }

        // Audio Context & Mixing
        let audioCtx;
        let sourceA, sourceB;
        let gainA, gainB;
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
