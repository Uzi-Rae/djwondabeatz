(function() {
    // ========== 3D VISUALIZER (Optimized) ==========
    const canvas = document.getElementById('hero-canvas');
    if (canvas && typeof THREE !== 'undefined') {
        try {
            const scene = new THREE.Scene();
            const camera = new THREE.PerspectiveCamera(75, (canvas.clientWidth || 600) / (canvas.clientHeight || 400), 0.1, 1000);
            const renderer = new THREE.WebGLRenderer({ canvas, alpha: true });
            // Ensure canvas has correct size before rendering
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

            let time = 0;
            let animationId;
            function animate() {
                animationId = requestAnimationFrame(animate);
                time += 0.02;
                bars.forEach(bar => {
                    const scale = 0.5 + Math.abs(Math.sin(time * bar.userData.speed + bar.userData.offset)) * 2;
                    bar.scale.y = scale;
                    bar.position.y = scale;
                });
                renderer.render(scene, camera);
            }
            animate();

            window.addEventListener('resize', resizeRendererToDisplaySize);

            // Cleanup on page unload (optional)
            window.addEventListener('beforeunload', () => {
                if (animationId) cancelAnimationFrame(animationId);
                renderer.dispose && renderer.dispose();
            });
        } catch(e) { console.warn("3D init error", e); }
    }
})();

// ========== AUDIO PLAYER - FULLY ENHANCED ==========
const audio = new Audio();
let currentTrack = 0;
let isPlaying = false;
const STORAGE = { VOLUME: 'dj_volume', TRACK: 'dj_track', TIME_PREFIX: 'dj_time_' };

// Expanded playlist with working demo tracks (replace with your MP3s later)
const tracks = [
    { name: "Joey B - Suzzy Williams", src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3" },
    { name: "Joey B - A Million", src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3" },
    { name: "Joey B - Cold", src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3" },
    { name: "Kwesi Arthur - Real Thing", src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3" },
    { name: "Black Sherif - Soma Obi", src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3" },
    { name: "Stonebwoy - Apologize", src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3" },
    { name: "King Promise - Terminator", src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3" },
    { name: "Sarkodie ft. Oxlade - Over Me", src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3" }
];

// DOM elements
const playBtn = document.getElementById('playPauseBtn');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const seekSlider = document.getElementById('seekSlider');
const currentTimeEl = document.getElementById('currentTime');
const durationTimeEl = document.getElementById('durationTime');
const trackTitle = document.getElementById('trackTitle');
const volumeSlider = document.getElementById('volumeSlider');

function loadTrack(index) {
    if (index < 0) index = 0;
    if (index >= tracks.length) index = 0;
    currentTrack = index;
    const track = tracks[currentTrack];
    audio.src = track.src;
    trackTitle.innerText = track.name;
    audio.load();
    if (isPlaying) {
        audio.play().catch(e => console.log("Autoplay blocked, click play"));
    }
    if (seekSlider) {
        seekSlider.value = 0;
        updateSeekStyle(0);
    }
    if (currentTimeEl) currentTimeEl.textContent = '0:00';
    if (durationTimeEl) durationTimeEl.textContent = '0:00';
}

function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
}

function updateSeekStyle(percent) {
    if (!seekSlider) return;
    const fill = `linear-gradient(90deg, #FF5C00 ${percent}%, rgba(255,255,255,0.15) ${percent}%)`;
    seekSlider.style.background = fill;
}

function updateProgressOnEvent() {
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
audio.addEventListener('ended', () => {
    nextTrack();
});

function togglePlay() {
    if (audio.paused) {
        audio.play().catch(e => {
            console.log("Play error, retry");
            audio.load();
            setTimeout(() => audio.play().catch(e2 => console.log("Still can't play")), 100);
        });
    } else {
        audio.pause();
    }
}

function nextTrack() {
    currentTrack = (currentTrack + 1) % tracks.length;
    loadTrack(currentTrack);
    if (isPlaying) {
        audio.play().catch(e => console.log("Play after next failed"));
    }
}

function prevTrack() {
    currentTrack = (currentTrack - 1 + tracks.length) % tracks.length;
    loadTrack(currentTrack);
    if (isPlaying) {
        audio.play().catch(e => console.log("Play after prev failed"));
    }
}

// Seek on progress slider
if (seekSlider) {
    seekSlider.addEventListener('input', (e) => {
        if (audio.duration) {
            const percent = parseFloat(e.target.value);
            audio.currentTime = (percent / 100) * audio.duration;
            if (currentTimeEl) currentTimeEl.textContent = formatTime(audio.currentTime);
            updateSeekStyle(percent);
        }
    });
}

// Volume control
// Restore saved volume
if (volumeSlider) {
    const savedVolume = parseFloat(localStorage.getItem(STORAGE.VOLUME));
    const initialVolume = (!isNaN(savedVolume) ? savedVolume : 0.7);
    audio.volume = initialVolume;
    volumeSlider.value = initialVolume;
    volumeSlider.addEventListener('input', (e) => {
        const v = parseFloat(e.target.value);
        audio.volume = v;
        localStorage.setItem(STORAGE.VOLUME, String(v));
    });
} else {
    audio.volume = parseFloat(localStorage.getItem(STORAGE.VOLUME)) || 0.7;
}

// Persist current track index
const savedTrack = parseInt(localStorage.getItem(STORAGE.TRACK));
if (!isNaN(savedTrack)) currentTrack = savedTrack;

// Do NOT save playback time anymore
// let lastSavedTime = 0;
// audio.addEventListener('timeupdate', () => {
//     const now = Date.now();
//     if (now - lastSavedTime > 5000) {
//         localStorage.setItem(STORAGE.TIME_PREFIX + currentTrack, String(Math.floor(audio.currentTime)));
//         lastSavedTime = now;
//     }
// });

// Do NOT restore saved time – always start from 0:00
audio.addEventListener('loadedmetadata', () => {
    audio.currentTime = 0;
    if (seekSlider) {
        seekSlider.value = 0;
        updateSeekStyle(0);
    }
    if (currentTimeEl) currentTimeEl.textContent = '0:00';
});

// Event listeners
if (playBtn) playBtn.addEventListener('click', togglePlay);
if (nextBtn) nextBtn.addEventListener('click', nextTrack);
if (prevBtn) prevBtn.addEventListener('click', prevTrack);

// Load first track
loadTrack(currentTrack);

// ========== UI INTERACTIONS ==========
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
    if (navbar) navbar.classList.toggle('scrolled', window.scrollY > 50);
    const backBtn = document.getElementById('backToTop');
    if (backBtn) backBtn.classList.toggle('show', window.scrollY > 300);
});
const backTop = document.getElementById('backToTop');
if (backTop) backTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

const menuBtn = document.getElementById('menuBtn');
const navLinks = document.getElementById('navLinks');
if (menuBtn && navLinks) {
    menuBtn.addEventListener('click', () => navLinks.classList.toggle('open'));
    document.querySelectorAll('.nav-links a').forEach(link => link.addEventListener('click', () => navLinks.classList.remove('open')));
}

// Form submission with proper reset
const form = document.getElementById('bookingForm');
const successDiv = document.getElementById('formSuccess');
if (form && successDiv) {
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = form.querySelector('button');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
        btn.disabled = true;
        const formData = new FormData(form);
        try {
            const response = await fetch(form.action, { method: 'POST', body: formData, headers: { 'Accept': 'application/json' } });
            if (response.ok) {
                successDiv.style.display = 'block';
                form.reset();
                setTimeout(() => successDiv.style.display = 'none', 5000);
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

// Swiper testimonials (ensure it doesn't conflict)
if (typeof Swiper !== 'undefined') {
    new Swiper('.testimonial-slider', { 
        loop: true, 
        autoplay: { delay: 5000, disableOnInteraction: false }, 
        pagination: { el: '.swiper-pagination', clickable: true } 
    });
}

// Mix buttons (external links)
document.querySelectorAll('.mix-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const url = btn.getAttribute('data-mix');
        if (url) window.open(url, '_blank', 'noopener,noreferrer');
    });
});

// Toggle mini mode on audio player background click
const audioFloat = document.getElementById('audioFloat');
if (audioFloat) {
    audioFloat.addEventListener('click', (e) => {
        if (e.target === audioFloat || e.target.classList.contains('track-icon') || e.target.parentElement === audioFloat) {
            audioFloat.classList.toggle('mini');
        }
    });
    // Keyboard accessibility: Space to toggle play/pause when focused
    audioFloat.addEventListener('keydown', (e) => {
        if (e.code === 'Space') {
            e.preventDefault();
            togglePlay();
        }
    });
}

// Active nav highlight on scroll
const sections = document.querySelectorAll('section[id]');
const navItems = document.querySelectorAll('.nav-links a[href^="#"]');
function setActiveNav() {
    let scrollPos = window.scrollY + 150;
    sections.forEach(section => {
        const top = section.offsetTop;
        const height = section.offsetHeight;
        const id = section.getAttribute('id');
        if (scrollPos >= top && scrollPos < top + height) {
            navItems.forEach(link => {
                link.classList.remove('active');
                if (link.getAttribute('href') === `#${id}`) link.classList.add('active');
            });
        }
    });
}
window.addEventListener('scroll', setActiveNav);
setActiveNav();
// Update aria-pressed and track title on play state changes
audio.addEventListener('play', () => {
    if (playBtn) {
        playBtn.innerHTML = '<i class="fas fa-pause"></i>';
        playBtn.setAttribute('aria-pressed', 'true');
        playBtn.setAttribute('aria-label', 'Pause');
    }
    isPlaying = true;
});
audio.addEventListener('pause', () => {
    if (playBtn) {
        playBtn.innerHTML = '<i class="fas fa-play"></i>';
        playBtn.setAttribute('aria-pressed', 'false');
        playBtn.setAttribute('aria-label', 'Play');
    }
    isPlaying = false;
});

// Save current track index when changed
function saveCurrentTrackIndex() { localStorage.setItem(STORAGE.TRACK, String(currentTrack)); }
const originalLoadTrack = loadTrack;
loadTrack = function(index) {
    originalLoadTrack(index);
    saveCurrentTrackIndex();
};

// ========== CUSTOM CURSOR TRACKER ==========
const cursorTracker = document.createElement('div');
cursorTracker.className = 'cursor-tracker';
document.body.appendChild(cursorTracker);

let mouseX = 0, mouseY = 0;
let trackerX = 0, trackerY = 0;

window.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
});

function animateTracker() {
    const dx = mouseX - trackerX;
    const dy = mouseY - trackerY;
    trackerX += dx * 0.2;
    trackerY += dy * 0.2;
    cursorTracker.style.left = (trackerX - 16) + 'px';
    cursorTracker.style.top = (trackerY - 16) + 'px';
    requestAnimationFrame(animateTracker);
}
animateTracker();

console.log('🚀 DJ WONDABEATZ site is PEAK! Custom cursor & scrollbar glow ready.');
