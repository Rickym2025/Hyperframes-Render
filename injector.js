import fs from 'fs';

// 1. Lettura dei dati
let inputData = {};
try {
    inputData = JSON.parse(fs.readFileSync('public/input.json', 'utf-8'));
} catch (e) {
    console.log("Nessun input.json trovato. Uso fallback.");
}

const props = inputData.inputProps || {};
const scenes = props.scenes || [];
const voiceUrl = props.voice || '';
const musicUrl = props.music || '';
const logoUrl = props.logo_url || 'public/logo.png';

let htmlContent = '';
// Inizializza la Timeline di GSAP
let gsapScript = 'const tl = gsap.timeline({ paused: true });\n';

// 2. Inserimento Audio
if (voiceUrl) htmlContent += `<audio id="voice" src="${voiceUrl}" data-start="3" data-track-index="0"></audio>\n`;
if (musicUrl) htmlContent += `<audio id="music" src="${musicUrl}" data-start="0" data-volume="0.15" data-track-index="1"></audio>\n`;

// 3. REGIA INIZIALE: Logo Reveal Cinematico
// Da 0 a 3 secondi facciamo apparire il logo sfocato che si mette a fuoco
gsapScript += `
tl.to("#intro-logo", { scale: 1, opacity: 1, filter: "blur(0px)", duration: 2, ease: "expo.out" }, 0);
tl.to("#intro-text", { opacity: 1, y: -20, duration: 1.5, ease: "power2.out" }, 0.5);
// Chiude il sipario iniziale
tl.to("#intro-sequence", { opacity: 0, duration: 1, ease: "power2.inOut" }, 3);
// Entrano le bande nere stile film
tl.to("#bar-top", { y: 120, duration: 1.5, ease: "power3.out" }, 2.5);
tl.to("#bar-bottom", { y: -120, duration: 1.5, ease: "power3.out" }, 2.5);
`;

// 4. REGIA DELLE SCENE (Foto)
let currentTime = 3; // Le foto iniziano al secondo 3 (dopo il logo)
const DURATION = 5.5; // Durata di ogni slide

scenes.forEach((scene, i) => {
    htmlContent += `
    <div class="scene-container" id="container-${i}" data-start="${currentTime}" data-duration="${DURATION + 1.5}">
        <img class="scene-media" id="media-${i}" src="${scene.img}" />
        <div class="overlay-vignette"></div>
        <div class="overlay-bottom"></div>
        ${scene.badge ? `<div class="badge-wrap"><div class="badge" id="badge-${i}">${scene.badge}</div></div>` : ''}
    </div>\n`;

    // A. Transizione in ingresso della scena (WIPE / Dissolvenza incrociata)
    if (i === 0) {
        gsapScript += `tl.set("#container-${i}", { opacity: 1 });\n`;
    } else {
        // Effetto "Clip Path" Wipe (molto elegante)
        gsapScript += `tl.fromTo("#container-${i}", 
            { opacity: 1, clipPath: "polygon(0 100%, 100% 100%, 100% 100%, 0 100%)" }, 
            { clipPath: "polygon(0 0, 100% 0, 100% 100%, 0 100%)", duration: 1.5, ease: "power3.inOut" }, 
            ${currentTime});\n`;
    }

    // B. Ken Burns 3D Effect (Zoom + Leggera rotazione + Shift Origine)
    const panDirection = i % 2 === 0 ? "10%" : "-10%"; // Alterna movimento DX/SX
    gsapScript += `tl.fromTo("#media-${i}", 
        { scale: 1.25, rotation: 1, x: 0 }, 
        { scale: 1, rotation: 0, x: "${panDirection}", duration: ${DURATION + 1.5}, ease: "sine.inOut" }, 
        ${currentTime});\n`;

    // C. Animazione testo Badge (Scivola dal basso svelato da una maschera)
    if (scene.badge) {
        gsapScript += `tl.to("#badge-${i}", { y: "0%", duration: 1, ease: "expo.out" }, ${currentTime + 1});\n`;
        gsapScript += `tl.to("#badge-${i}", { y: "-100%", duration: 0.8, ease: "power2.in" }, ${currentTime + DURATION - 0.5});\n`;
    }

    // D. Fade out scena precedente (se non è l'ultima)
    if (i < scenes.length - 1) {
        gsapScript += `tl.to("#container-${i}", { opacity: 0, duration: 1.5 }, ${currentTime + DURATION});\n`;
    }

    currentTime += DURATION; 
});

// Registra la timeline per Hyperframes
gsapScript += `window.__hfGsap = tl;\n`;

// 5. Compilazione
let template = fs.readFileSync('template.html', 'utf-8');
template = template.replace('<!-- INJECT_HTML -->', htmlContent);
template = template.replace('/* INJECT_GSAP */', gsapScript);
template = template.replace('<!-- INJECT_LOGO -->', logoUrl);

fs.writeFileSync('index.html', template);
console.log("Regia GSAP Premium generata con successo!");