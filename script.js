// Synthesizer Sound Effects using Web Audio API
class SoundEffects {
    constructor() {
        this.ctx = null;
    }

    init() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        }
    }

    playTick() {
        this.init();
        if (!this.ctx) return;
        
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, this.ctx.currentTime);
        gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.15);
        
        osc.start();
        osc.stop(this.ctx.currentTime + 0.15);
    }

    playCorrect() {
        this.init();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const playTone = (freq, start, duration) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, now + start);
            gain.gain.setValueAtTime(0.12, now + start);
            gain.gain.exponentialRampToValueAtTime(0.001, now + start + duration);
            
            osc.start(now + start);
            osc.stop(now + start + duration);
        };

        // Rising arpeggio
        playTone(523.25, 0, 0.15); // C5
        playTone(659.25, 0.08, 0.15); // E5
        playTone(783.99, 0.16, 0.25); // G5
    }

    playIncorrect() {
        this.init();
        if (!this.ctx) return;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, this.ctx.currentTime); // A3
        osc.frequency.linearRampToValueAtTime(110, this.ctx.currentTime + 0.35); // A2
        
        gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.4);
        
        osc.start();
        osc.stop(this.ctx.currentTime + 0.4);
    }

    playGameOver() {
        this.init();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const playTone = (freq, start, duration) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + start);
            gain.gain.setValueAtTime(0.1, now + start);
            gain.gain.exponentialRampToValueAtTime(0.001, now + start + duration);
            
            osc.start(now + start);
            osc.stop(now + start + duration);
        };

        // Victory fanfare
        playTone(523.25, 0, 0.2); // C5
        playTone(659.25, 0.15, 0.2); // E5
        playTone(783.99, 0.3, 0.2); // G5
        playTone(1046.50, 0.45, 0.5); // C6
    }
}

class KuisSistem {
    constructor() {
        this.modelUrl = "https://teachablemachine.withgoogle.com/models/fFGH7lNgC6/";
        this.model = null;
        this.webcam = null;
        this.ctx = null; 
        this.maxPredictions = 0;
        
        this.skor = 0;
        this.waktu = 10;
        this.soalSekarang = 0;
        this.timerInterval = null;
        this.sedangMenjawab = false;
        this.gameBerjalan = false; 

        // 10 Educational Questions in Indonesian
        this.daftarSoal = [
            { teks: "Apakah HTML adalah bahasa pemrograman?", kunciJawaban: "SALAH" },
            { teks: "Apakah CPU adalah otak utama dari sebuah komputer?", kunciJawaban: "BENAR" },
            { teks: "Apakah 1 Byte sama dengan 8 Bit?", kunciJawaban: "BENAR" },
            { teks: "Apakah RAM berfungsi menyimpan data secara permanen saat komputer mati?", kunciJawaban: "SALAH" },
            { teks: "Apakah Python salah satu bahasa pemrograman populer untuk AI?", kunciJawaban: "BENAR" },
            { teks: "Apakah Keyboard merupakan contoh perangkat keluaran (output)?", kunciJawaban: "SALAH" },
            { teks: "Apakah URL singkatan dari Uniform Resource Locator?", kunciJawaban: "BENAR" },
            { teks: "Apakah AI singkatan dari Artificial Intelligence?", kunciJawaban: "BENAR" },
            { teks: "Apakah Harddisk (HDD) memiliki kecepatan baca-tulis lebih cepat dibanding SSD?", kunciJawaban: "SALAH" },
            { teks: "Apakah enkripsi bertujuan untuk melindungi kerahasiaan data?", kunciJawaban: "BENAR" }
        ];

        // UI elements
        this.webcamContainer = document.getElementById("webcam-container");
        this.labelContainer = document.getElementById("label-container");
        this.soalContainer = document.getElementById("soal");
        this.skorContainer = document.getElementById("skor-val");
        this.timerContainer = document.getElementById("timer-val");
        this.pesanFeedback = document.getElementById("pesan-feedback");
        this.loadingMsg = document.getElementById("loading-msg");
        this.btnStart = document.getElementById("btn-start");
        this.progressBar = document.getElementById("progress-bar");
        
        this.overlay = document.getElementById("overlay-transisi");
        this.angkaCountdown = document.getElementById("angka-countdown");

        // Sounds
        this.sounds = new SoundEffects();
    }

    async init() {
        this.btnStart.style.display = "none";
        this.loadingMsg.style.display = "flex";
        this.soalContainer.innerHTML = "Memuat Pose AI...";
        this.soalContainer.classList.remove("empty-state");

        // Request audio context activation
        this.sounds.init();

        try {
            await this.initModelAndCamera();
            this.tampilkanSoal();
        } catch (error) {
            console.error(error);
            this.soalContainer.innerHTML = "Gagal Memuat Kamera atau Model AI!";
            this.btnStart.style.display = "block";
            this.loadingMsg.style.display = "none";
        }
    }

    async initModelAndCamera() {
        const modelURL = this.modelUrl + "model.json";
        const metadataURL = this.modelUrl + "metadata.json";

        this.model = await tmPose.load(modelURL, metadataURL);
        this.maxPredictions = this.model.getTotalClasses();

        const size = 380; 
        const flip = true; 
        this.webcam = new tmPose.Webcam(size, size, flip); 
        await this.webcam.setup(); 
        await this.webcam.play();

        this.loadingMsg.style.display = "none";
        
        // Remove existing canvas if any
        const oldCanvas = this.webcamContainer.querySelector("canvas");
        if (oldCanvas) oldCanvas.remove();

        const canvas = document.createElement("canvas");
        canvas.width = size; 
        canvas.height = size;
        this.ctx = canvas.getContext("2d");
        this.webcamContainer.appendChild(canvas);

        this.gameBerjalan = true;
        window.requestAnimationFrame(() => this.loop());
    }

    async loop() {
        if (!this.gameBerjalan) return;

        this.webcam.update(); 
        await this.predictMengecek();
        window.requestAnimationFrame(() => this.loop());
    }

    async predictMengecek() {
        if (this.webcam.canvas) {
            // Draw webcam frame onto canvas
            this.ctx.drawImage(this.webcam.canvas, 0, 0);
        }

        if (this.sedangMenjawab) return;

        const { pose, posenetOutput } = await this.model.estimatePose(this.webcam.canvas);
        const prediction = await this.model.predict(posenetOutput);

        let labelHTML = "";
        let probTinggi = 0;
        let poseTebakan = "";

        for (let i = 0; i < this.maxPredictions; i++) {
            const prob = prediction[i].probability;
            const namaClass = prediction[i].className;
            const percent = (prob * 100).toFixed(0);
            
            const accentClass = namaClass.toUpperCase() === 'BENAR' ? 'var(--success)' : 
                                namaClass.toUpperCase() === 'SALAH' ? 'var(--danger)' : 'var(--primary)';

            labelHTML += `
                <div class="prediction-bar">
                    <span class="prediction-name">${namaClass}</span>
                    <div style="width: 80px; height: 8px; background: rgba(255, 255, 255, 0.1); border-radius: 4px; overflow: hidden; display: inline-block; margin: 0 8px; vertical-align: middle;">
                        <div style="width: ${percent}%; height: 100%; background: ${accentClass}; border-radius: 4px; transition: width 0.1s ease;"></div>
                    </div>
                    <span class="prediction-val">${percent}%</span>
                </div>
            `;

            if (prob > probTinggi) {
                probTinggi = prob;
                poseTebakan = namaClass;
            }
        }

        this.labelContainer.innerHTML = labelHTML;
        this.drawSkeleton(pose);

        let poseTebakanClean = poseTebakan.trim().toUpperCase();

        if (probTinggi > 0.85) {
            if (poseTebakanClean === "BENAR" || poseTebakanClean === "SALAH") {
                this.cekJawaban(poseTebakanClean);
            }
        }
    }

    drawSkeleton(pose) {
        if (pose) {
            const minPartConfidence = 0.5;
            tmPose.drawKeypoints(pose.keypoints, minPartConfidence, this.ctx);
            tmPose.drawSkeleton(pose.keypoints, minPartConfidence, this.ctx);
        }
    }

    async tampilkanSoal() {
        // Update progress bar
        const progressPercent = (this.soalSekarang / this.daftarSoal.length) * 100;
        this.progressBar.style.width = `${progressPercent}%`;

        if (this.soalSekarang >= this.daftarSoal.length) {
            this.gameSelesai();
            return;
        }

        this.sedangMenjawab = true; 
        this.overlay.style.display = "flex";
        this.pesanFeedback.innerHTML = "";
        this.pesanFeedback.className = "";
        this.soalContainer.innerHTML = "Siap-siap...";

        for (let i = 3; i > 0; i--) {
            this.angkaCountdown.innerHTML = i;
            this.sounds.playTick();
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        this.overlay.style.display = "none";
        this.sedangMenjawab = false;
        this.waktu = 10;
        this.timerContainer.innerHTML = this.waktu;
        this.soalContainer.innerHTML = `Soal ${this.soalSekarang + 1}: ${this.daftarSoal[this.soalSekarang].teks}`;

        clearInterval(this.timerInterval);
        this.timerInterval = setInterval(() => {
            this.waktu--;
            this.timerContainer.innerHTML = this.waktu;
            if (this.waktu <= 3 && this.waktu > 0) {
                this.sounds.playTick(); // Tick sound on warning
            }
            if (this.waktu <= 0) {
                clearInterval(this.timerInterval);
                this.waktuHabis();
            }
        }, 1000);
    }

    cekJawaban(posePemainClean) {
        this.sedangMenjawab = true; 
        clearInterval(this.timerInterval); 

        const kunciClean = this.daftarSoal[this.soalSekarang].kunciJawaban.trim().toUpperCase();

        if (posePemainClean === kunciClean) {
            this.skor += 10;
            this.skorContainer.innerHTML = this.skor;
            this.pesanFeedback.innerHTML = "🎯 JAWABAN TEPAT!";
            this.pesanFeedback.className = "benar";
            this.sounds.playCorrect();
        } else {
            this.pesanFeedback.innerHTML = "❌ UPS, SALAH POSISI!";
            this.pesanFeedback.className = "salah";
            this.sounds.playIncorrect();
        }

        setTimeout(() => {
            this.soalSekarang++;
            this.tampilkanSoal();
        }, 2000);
    }

    waktuHabis() {
        this.sedangMenjawab = true;
        this.pesanFeedback.innerHTML = "⏰ WAKTU HABIS!";
        this.pesanFeedback.className = "salah";
        this.sounds.playIncorrect();
        
        setTimeout(() => {
            this.soalSekarang++;
            this.tampilkanSoal();
        }, 2000);
    }

    gameSelesai() {
        this.gameBerjalan = false; 
        clearInterval(this.timerInterval);
        
        this.progressBar.style.width = "100%";
        this.soalContainer.innerHTML = "🎉 GAME SELESAI! 🎉";
        this.timerContainer.innerHTML = "-";
        this.labelContainer.innerHTML = "<div>Kamera dinonaktifkan secara otomatis.</div>";
        this.pesanFeedback.innerHTML = `Skor Akhir Anda: ${this.skor}`;
        this.pesanFeedback.className = "benar";
        this.sounds.playGameOver();

        // Release hardware camera resources
        if (this.webcam) {
            this.webcam.stop(); 
            if (this.webcam.webcam && this.webcam.webcam.srcObject) {
                const stream = this.webcam.webcam.srcObject;
                const tracks = stream.getTracks();
                tracks.forEach(track => track.stop());
            }
        }

        // Draw final black cover screen
        if (this.ctx) {
            this.ctx.fillStyle = "#090615";
            this.ctx.fillRect(0, 0, 380, 380);
            
            // Draw text over camera area
            this.ctx.fillStyle = "#a78bfa";
            this.ctx.font = "bold 20px Outfit";
            this.ctx.textAlign = "center";
            this.ctx.fillText("KAMERA OFF", 190, 190);
        }
    }
}

let appKuis;
function mulaiKuis() {
    if (!appKuis) {
        appKuis = new KuisSistem();
    }
    appKuis.init();
}
window.mulaiKuis = mulaiKuis; // Expose globally for HTML onclick
