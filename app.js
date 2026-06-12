(() => {
    // ========== UTILITIES ==========
    function isTouch() {
        return window.innerWidth < 768 || (navigator.maxTouchPoints || 0) > 0;
    }

    function escapeHtml(str) {
        if (!str) return '';
        return String(str).replace(/[&<>]/g, (char) => {
            const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;' };
            return map[char] || char;
        });
    }

    function formatTime(seconds) {
        if (isNaN(seconds)) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60).toString().padStart(2, '0');
        return `${mins}:${secs}`;
    }

    // ========== 3D VISUALIZER (homepage only) ==========
    let visualizer = null;
    let analyser = null;
    let freqData = null;
    let audioCtx = null;
    let isAudioContextReady = false;
    let audioElement = null; // will be set later

    function initVisualizer() {
        const canvas = document.getElementById('hero-canvas');
        if (!canvas || typeof THREE === 'undefined') return;

        try {
            const scene = new THREE.Scene();
            const camera = new THREE.PerspectiveCamera(75, (canvas.clientWidth || 600) / (canvas.clientHeight || 400), 0.1, 1000);
            const renderer = new THREE.WebGLRenderer({ canvas, alpha: true });

            function resizeRendererToDisplaySize() {
                const w = canvas.clientWidth || canvas.offsetWidth || 600;
                const h = canvas.clientHeight || canvas.offsetHeight || 400;
                const ratio = Math.min(window.devicePixelRatio || 1, 2);
                renderer.setPixelRatio(ratio);
                renderer.setSize(w, h, false);
                camera.aspect = w / h;
                camera.updateProjectionMatrix();
            }
            resizeRendererToDisplaySize();

            const bars = [];
            const colors = [0xFF5C00, 0x7C3AED, 0x22D3EE];
            const count = window.innerWidth < 768 ? 12 : 20;
            const spacing = 1.2;
            const startX = -(count * spacing) / 2;
            for (let i = 0; i < count; i++) {
                const geo = new THREE.BoxGeometry(0.6, 2, 0.6);
                const mat = new THREE.MeshStandardMaterial({ color: colors[i % colors.length], emissive: colors[i % colors.length], emissiveIntensity: 0.3 });
                const bar = new THREE.Mesh(geo, mat);
                bar.position.x = startX + i * spacing;
                bar.userData = { speed: 0.5 + Math.random() * 2, offset: Math.random() * Math.PI * 2 };
                scene.add(bar);
                bars.push(bar);
            }

            const ambient = new THREE.AmbientLight(0x404060);
            scene.add(ambient);
            const light = new THREE.DirectionalLight(0xffffff, 1);
            light.position.set(5, 10, 7);
            scene.add(light);
            camera.position.z = 15;
            camera.position.y = 2;

            visualizer = {
                scene, camera, renderer, bars,
                time: 0,
                animationId: null
            };

            function animate() {
                visualizer.animationId = requestAnimationFrame(animate);
                visualizer.time += 0.02;

                const useAudio = analyser && audioElement && !audioElement.paused && freqData && freqData.length;
                if (useAudio) analyser.getByteFrequencyData(freqData);
                const step = useAudio ? Math.max(1, Math.floor(freqData.length / visualizer.bars.length)) : 1;

                visualizer.bars.forEach((bar, index) => {
                    let scaleY = 0.5 + Math.abs(Math.sin(visualizer.time * bar.userData.speed + bar.userData.offset)) * 2;
                    if (useAudio) {
                        const freqValue = freqData[index * step] / 255;
                        scaleY = 0.5 + freqValue * 4;
                    }
                    bar.scale.y = scaleY;
                    bar.position.y = scaleY;
                });

                visualizer.renderer.render(visualizer.scene, visualizer.camera);
            }
            animate();

            window.addEventListener('resize', resizeRendererToDisplaySize);
            window.addEventListener('beforeunload', () => {
                if (visualizer && visualizer.animationId) cancelAnimationFrame(visualizer.animationId);
                if (visualizer.renderer) visualizer.renderer.dispose && visualizer.renderer.dispose();
            });
        } catch (e) {
            console.warn('3D init error', e);
        }
    }

    function initAudioContext(audioElem) {
        if (audioCtx) return;
        try {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            const source = audioCtx.createMediaElementSource(audioElem);
            analyser = audioCtx.createAnalyser();
            analyser.fftSize = 256;
            source.connect(analyser);
            analyser.connect(audioCtx.destination);
            freqData = new Uint8Array(analyser.frequencyBinCount);
            isAudioContextReady = true;
        } catch (e) {
            console.warn('AudioCTX init error', e);
        }
    }

    // ========== AUDIO PLAYER ==========
    const audio = new Audio();
    audioElement = audio; // for visualizer

    let currentTrack = 0;
    let isPlaying = false;
    let isShuffle = false;
    let isRepeat = false;
    const STORAGE = { VOLUME: 'dj_volume', TRACK: 'dj_track', FAN_REQUESTS: 'fan_requests' };

    const tracks = [
        { name: "Let's Worship Vol. 1", src: "../audio/lets-worship-vol1.mp3.mpeg" },
        { name: "Lover's Rock", src: "../audio/lovers-rock.mp3.mpeg" },
        { name: "Birthday Mixtape 2024", src: "../audio/birthday-mixtape-2024.mp3.mpeg" },
        { name: "Mix Up Party Jam", src: "../audio/mix-up-party-jam.mp3.mpeg" }
    ];

    // DOM elements
    const playBtn = document.getElementById('playPauseBtn');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const seekSlider = document.getElementById('seekSlider');
    const volumeSlider = document.getElementById('volumeSlider');
    const currentTimeEl = document.getElementById('currentTime');
    const durationTimeEl = document.getElementById('durationTime');
    const trackTitle = document.getElementById('trackTitle');
    const shuffleBtn = document.getElementById('shuffleBtn');
    const repeatBtn = document.getElementById('repeatBtn');

    function updateSeekStyle(percent) {
        if (!seekSlider) return;
        seekSlider.style.background = `linear-gradient(90deg, #FF5C00 ${percent}%, rgba(255,255,255,0.15) ${percent}%)`;
    }

    function updateVolumeStyle(volume) {
        if (!volumeSlider) return;
        const percent = Math.round(Math.max(0, Math.min(1, volume)) * 100);
        volumeSlider.style.background = `linear-gradient(90deg, var(--primary) ${percent}%, rgba(255,255,255,0.15) ${percent}%)`;
    }

    function loadTrack(index) {
        if (index < 0) index = 0;
        if (index >= tracks.length) index = 0;
        currentTrack = index;
        localStorage.setItem(STORAGE.TRACK, String(currentTrack));
        const track = tracks[currentTrack];
        audio.src = track.src;
        if (trackTitle) trackTitle.innerText = track.name;
        audio.load();
        if (isPlaying) {
            audio.play().catch(e => console.log('Autoplay blocked, click play', e));
        }
        if (seekSlider) {
            seekSlider.value = 0;
            updateSeekStyle(0);
        }
        if (currentTimeEl) currentTimeEl.textContent = '0:00';
        if (durationTimeEl) durationTimeEl.textContent = '0:00';
    }

    function handleAudioEnded() {
        if (isRepeat) {
            audio.currentTime = 0;
            audio.play().catch(e => console.log('Repeat play failed', e));
            return;
        }
        if (isShuffle) {
            let newIndex;
            do {
                newIndex = Math.floor(Math.random() * tracks.length);
            } while (newIndex === currentTrack && tracks.length > 1);
            currentTrack = newIndex;
        } else {
            currentTrack = (currentTrack + 1) % tracks.length;
        }
        loadTrack(currentTrack);
        if (isPlaying) {
            audio.play().catch(e => console.log('Play after ended failed', e));
        }
    }

    function togglePlay() {
        if (audio.paused) {
            // Ensure audio context for visualizer on first play
            if (!isAudioContextReady && audioCtx === null) {
                initAudioContext(audio);
            }
            audio.play().catch(e => {
                console.log('Play error, retry', e);
                audio.load();
                setTimeout(() => audio.play().catch(e2 => console.log('Still cannot play', e2)), 100);
            });
        } else {
            audio.pause();
        }
    }

    function nextTrack() {
        if (isRepeat) {
            audio.currentTime = 0;
            if (isPlaying) audio.play();
            return;
        }
        if (isShuffle) {
            let newIndex;
            do {
                newIndex = Math.floor(Math.random() * tracks.length);
            } while (newIndex === currentTrack && tracks.length > 1);
            currentTrack = newIndex;
        } else {
            currentTrack = (currentTrack + 1) % tracks.length;
        }
        loadTrack(currentTrack);
        if (isPlaying) {
            audio.play().catch(e => console.log('Play after next failed', e));
        }
    }

    function prevTrack() {
        if (isShuffle) {
            let newIndex;
            do {
                newIndex = Math.floor(Math.random() * tracks.length);
            } while (newIndex === currentTrack && tracks.length > 1);
            currentTrack = newIndex;
        } else {
            currentTrack = (currentTrack - 1 + tracks.length) % tracks.length;
        }
        loadTrack(currentTrack);
        if (isPlaying) {
            audio.play().catch(e => console.log('Play after prev failed', e));
        }
    }

    // Progress update (throttled)
    let lastProgressUpdate = 0;
    let isUserSeeking = false;

    function updateProgressOnEvent() {
        if (isUserSeeking) return;
        const now = Date.now();
        if (now - lastProgressUpdate < 100) return;
        lastProgressUpdate = now;
        if (audio.duration && !isNaN(audio.duration)) {
            const percent = (audio.currentTime / audio.duration) * 100;
            if (seekSlider) {
                seekSlider.value = percent;
                updateSeekStyle(percent);
            }
            if (currentTimeEl) currentTimeEl.textContent = formatTime(audio.currentTime);
        }
    }

    audio.addEventListener('timeupdate', updateProgressOnEvent);
    audio.addEventListener('durationchange', () => {
        if (audio.duration && !isNaN(audio.duration) && durationTimeEl) {
            durationTimeEl.textContent = formatTime(audio.duration);
        }
    });
    audio.addEventListener('ended', handleAudioEnded);

    // Event listeners for UI
    if (playBtn) playBtn.addEventListener('click', togglePlay);
    if (nextBtn) nextBtn.addEventListener('click', nextTrack);
    if (prevBtn) prevBtn.addEventListener('click', prevTrack);
    if (shuffleBtn) {
        shuffleBtn.addEventListener('click', () => {
            isShuffle = !isShuffle;
            shuffleBtn.classList.toggle('active', isShuffle);
        });
    }
    if (repeatBtn) {
        repeatBtn.addEventListener('click', () => {
            isRepeat = !isRepeat;
            repeatBtn.classList.toggle('active', isRepeat);
        });
    }
    if (seekSlider) {
        seekSlider.addEventListener('mousedown', () => { isUserSeeking = true; });
        seekSlider.addEventListener('mouseup', () => { isUserSeeking = false; });
        seekSlider.addEventListener('input', (e) => {
            if (audio.duration && !isNaN(audio.duration)) {
                const percent = parseFloat(e.target.value);
                audio.currentTime = (percent / 100) * audio.duration;
                if (currentTimeEl) currentTimeEl.textContent = formatTime(audio.currentTime);
                updateSeekStyle(percent);
            }
        });
    }
    if (volumeSlider) {
        const savedVolume = parseFloat(localStorage.getItem(STORAGE.VOLUME));
        const initialVolume = Number.isFinite(savedVolume) ? Math.max(0, Math.min(1, savedVolume)) : 0.7;
        audio.volume = initialVolume;
        volumeSlider.value = String(initialVolume);
        updateVolumeStyle(initialVolume);
        volumeSlider.addEventListener('input', (e) => {
            const v = parseFloat(e.target.value);
            const volumeValue = Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : audio.volume;
            audio.volume = volumeValue;
            localStorage.setItem(STORAGE.VOLUME, String(volumeValue));
            updateVolumeStyle(volumeValue);
        });
    } else {
        const savedVolume = parseFloat(localStorage.getItem(STORAGE.VOLUME));
        audio.volume = Number.isFinite(savedVolume) ? Math.max(0, Math.min(1, savedVolume)) : 0.7;
    }

    // Restore saved track
    const savedTrack = parseInt(localStorage.getItem(STORAGE.TRACK), 10);
    if (!isNaN(savedTrack)) currentTrack = savedTrack;
    loadTrack(currentTrack);

    // Audio visualizer: resume AudioContext on first user interaction
    function resumeAudioContext() {
        if (audioCtx && audioCtx.state === 'suspended') {
            audioCtx.resume().catch(console.warn);
        }
    }
    document.body.addEventListener('click', resumeAudioContext, { once: true });

    // ========== COUNTDOWN TIMER ==========
    const countdownEl = document.getElementById('countdown');
    if (countdownEl) {
        function updateCountdown() {
            const targetDate = new Date('December 25, 2026 20:00:00').getTime();
            const diff = targetDate - Date.now();
            if (diff <= 0) {
                countdownEl.innerHTML = '<div>🎉 Event time has arrived!</div>';
                return;
            }
            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
            const minutes = Math.floor((diff / (1000 * 60)) % 60);
            const seconds = Math.floor((diff / 1000) % 60);
            const daysSpan = document.getElementById('days');
            const hoursSpan = document.getElementById('hours');
            const minutesSpan = document.getElementById('minutes');
            const secondsSpan = document.getElementById('seconds');
            if (daysSpan) daysSpan.textContent = days.toString().padStart(2, '0');
            if (hoursSpan) hoursSpan.textContent = hours.toString().padStart(2, '0');
            if (minutesSpan) minutesSpan.textContent = minutes.toString().padStart(2, '0');
            if (secondsSpan) secondsSpan.textContent = seconds.toString().padStart(2, '0');
        }
        updateCountdown();
        setInterval(updateCountdown, 1000);
    }

    // ========== THEME TOGGLE ==========
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'light') document.body.classList.add('light-mode');
        themeToggle.innerHTML = savedTheme === 'light' ? '☀️' : '🌙';
        themeToggle.addEventListener('click', () => {
            document.body.classList.toggle('light-mode');
            const isLight = document.body.classList.contains('light-mode');
            localStorage.setItem('theme', isLight ? 'light' : 'dark');
            themeToggle.innerHTML = isLight ? '☀️' : '🌙';
        });
    }

    // ========== FAN WALL (Song Requests) ==========
    const fanWallContainer = document.getElementById('fanWallContainer');
    const songForm = document.getElementById('songRequestForm');
    const requesterName = document.getElementById('requesterName');
    const songTitle = document.getElementById('songTitle');
    const messageText = document.getElementById('messageText');
    let fanRequests = [];

    function renderFanWall() {
        if (!fanWallContainer) return;
        fanWallContainer.innerHTML = '';
        if (!fanRequests.length) {
            fanWallContainer.innerHTML = '<div class="fan-card empty">No dedications yet. Be the first to shout out!</div>';
            return;
        }
        fanRequests.slice().reverse().forEach(req => {
            const card = document.createElement('div');
            card.className = 'fan-card';
            const when = new Date(req.date).toLocaleString();
            card.innerHTML = `
                <strong>${escapeHtml(req.name)}</strong>
                <p>🎵 ${escapeHtml(req.song)}</p>
                ${req.message ? `<blockquote>"${escapeHtml(req.message)}"</blockquote>` : ''}
                <small>${escapeHtml(when)}</small>
            `;
            fanWallContainer.appendChild(card);
        });
    }

    if (songForm && requesterName && songTitle) {
        try {
            const saved = JSON.parse(localStorage.getItem(STORAGE.FAN_REQUESTS) || '[]');
            fanRequests = Array.isArray(saved) ? saved : [];
        } catch (e) { fanRequests = []; }
        renderFanWall();

        songForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const name = requesterName.value.trim();
            const song = songTitle.value.trim();
            const message = messageText ? messageText.value.trim() : '';
            if (!name || !song) {
                alert('Please enter your name and song/dedication.');
                return;
            }
            fanRequests.push({ name, song, message, date: new Date().toISOString() });
            if (fanRequests.length > 20) fanRequests.shift();
            localStorage.setItem(STORAGE.FAN_REQUESTS, JSON.stringify(fanRequests));
            renderFanWall();
            songForm.reset();
            alert('Thank you! Your dedication will appear on the Fan Wall.');
        });
    }

    // ========== PAGE TRANSITIONS ==========
    if (!document.getElementById('page-transition')) {
        const transitionDiv = document.createElement('div');
        transitionDiv.id = 'page-transition';
        document.body.appendChild(transitionDiv);
    }
    const transitionOverlay = document.getElementById('page-transition');

    document.querySelectorAll('.nav-links a, .btn-book, .logo a, footer a[href^="."], a[href^="#"]').forEach(link => {
        const href = link.getAttribute('href');
        if (!href || href.startsWith('http') || href.startsWith('https')) return;
        if (href.startsWith('#')) return;
        link.addEventListener('click', (e) => {
            e.preventDefault();
            transitionOverlay.classList.add('active');
            document.body.classList.add('page-loading');
            setTimeout(() => {
                window.location.href = href;
            }, 400);
        });
    });

    window.addEventListener('load', () => {
        document.body.classList.add('loaded');
        transitionOverlay.classList.remove('active');
        document.body.classList.remove('page-loading');
        setTimeout(() => {
            transitionOverlay.style.visibility = 'hidden';
        }, 100);
    });
    window.addEventListener('pageshow', (event) => {
        if (event.persisted) {
            document.body.classList.add('loaded');
            transitionOverlay.classList.remove('active');
            document.body.classList.remove('page-loading');
        }
    });

    // ========== SCROLL HANDLER & BACK-TO-TOP ==========
    const navbar = document.getElementById('navbar');
    const backTop = document.getElementById('backToTop');

    function throttledScrollHandler() {
        if (navbar) navbar.classList.toggle('scrolled', window.scrollY > 50);
        if (backTop) backTop.classList.toggle('show', window.scrollY > 300);
        // Active nav for single-page anchors (if any)
        const sections = document.querySelectorAll('section[id]');
        if (sections.length) {
            let scrollPos = window.scrollY + 150;
            sections.forEach(section => {
                const top = section.offsetTop;
                const height = section.offsetHeight;
                const id = section.getAttribute('id');
                if (scrollPos >= top && scrollPos < top + height) {
                    document.querySelectorAll('.nav-links a[href^="#"]').forEach(link => link.classList.remove('active'));
                    const activeLink = document.querySelector(`.nav-links a[href="#${id}"]`);
                    if (activeLink) activeLink.classList.add('active');
                }
            });
        }
    }
    window.addEventListener('scroll', throttledScrollHandler);
    if (backTop) backTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

    // ========== MOBILE MENU ==========
    const menuBtn = document.getElementById('menuBtn');
    const navLinks = document.getElementById('navLinks');
    if (menuBtn && navLinks) {
        menuBtn.addEventListener('click', () => {
            const isOpen = navLinks.classList.toggle('open');
            menuBtn.setAttribute('aria-expanded', String(isOpen));
        });
        document.querySelectorAll('.nav-links a').forEach(link => link.addEventListener('click', () => {
            navLinks.classList.remove('open');
            menuBtn.setAttribute('aria-expanded', 'false');
        }));
    }

    // ========== FORM SUBMISSION (Bookings) ==========
    const bookingForm = document.getElementById('bookingForm');
    const formSuccess = document.getElementById('formSuccess');
    if (bookingForm && formSuccess) {
        bookingForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = bookingForm.querySelector('button');
            const originalText = btn.innerHTML;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
            btn.disabled = true;
            const formData = new FormData(bookingForm);
            try {
                const response = await fetch(bookingForm.action, { method: 'POST', body: formData, headers: { 'Accept': 'application/json' } });
                if (response.ok) {
                    formSuccess.style.display = 'block';
                    bookingForm.reset();
                    setTimeout(() => formSuccess.style.display = 'none', 5000);
                } else {
                    throw new Error('Server error');
                }
            } catch (err) {
                alert('Error sending. Please try again or contact directly.');
            } finally {
                btn.innerHTML = originalText;
                btn.disabled = false;
            }
        });
    }

    // ========== SWIPER TESTIMONIALS ==========
    if (typeof Swiper !== 'undefined') {
        new Swiper('.testimonial-slider', {
            loop: true,
            autoplay: { delay: 5000, disableOnInteraction: false },
            pagination: { el: '.swiper-pagination', clickable: true }
        });
    }

    // ========== MIX BUTTONS (external links) ==========
    document.querySelectorAll('.mix-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const url = btn.getAttribute('data-mix');
            if (url) window.open(url, '_blank', 'noopener,noreferrer');
        });
    });

    // ========== AUDIO PLAYER TOGGLE MINI MODE ==========
    const audioFloat = document.getElementById('audioFloat');
    if (audioFloat) {
        audioFloat.addEventListener('click', (e) => {
            if (e.target === audioFloat || e.target.classList.contains('track-icon') || e.target.parentElement === audioFloat) {
                audioFloat.classList.toggle('mini');
            }
        });
        audioFloat.addEventListener('keydown', (e) => {
            if (e.code === 'Space') {
                e.preventDefault();
                togglePlay();
            }
        });
    }

    // ========== CUSTOM CURSOR TRACKER (desktop only) ==========
    if (!isTouch()) {
        const cursorTracker = document.createElement('div');
        cursorTracker.className = 'cursor-tracker';
        document.body.appendChild(cursorTracker);
        let mouseX = 0, mouseY = 0;
        let trackerX = 0, trackerY = 0;
        let isTracking = false;
        window.addEventListener('mousemove', (e) => {
            mouseX = e.clientX;
            mouseY = e.clientY;
            if (!isTracking) {
                isTracking = true;
                animateTracker();
            }
        }, { passive: true });
        window.addEventListener('mouseleave', () => {
            cursorTracker.style.opacity = '0';
            isTracking = false;
        });
        window.addEventListener('mouseenter', () => {
            cursorTracker.style.opacity = '1';
        });
        function animateTracker() {
            const dx = mouseX - trackerX;
            const dy = mouseY - trackerY;
            if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) {
                isTracking = false;
                return;
            }
            trackerX += dx * 0.2;
            trackerY += dy * 0.2;
            cursorTracker.style.transform = `translate3d(${trackerX - 16}px, ${trackerY - 16}px, 0)`;
            requestAnimationFrame(animateTracker);
        }
    }

    // ========== INITIALISE 3D VISUALIZER ==========
    initVisualizer();

    // ========== ENSURE AUDIO CONTEXT IS READY ON FIRST PLAY ==========
    // Already handled in togglePlay and body click event.
})();