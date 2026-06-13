export function playSound(scene, key, options = {}) {
    if (!scene?.sound || !key) return;
    
    const safeOptions = { ...options };
    
    // Volume minimum de 0.001 — jamais 0 (cause -Infinity en log scale)
    if (safeOptions.volume !== undefined) {
        safeOptions.volume = isFinite(safeOptions.volume) && safeOptions.volume > 0 
            ? safeOptions.volume 
            : 0.001;
    }
    if (safeOptions.detune !== undefined) {
        safeOptions.detune = isFinite(safeOptions.detune) ? safeOptions.detune : 0;
    }
    if (safeOptions.rate !== undefined) {
        safeOptions.rate = isFinite(safeOptions.rate) && safeOptions.rate > 0 
            ? safeOptions.rate 
            : 1;
    }
    if (safeOptions.pan !== undefined) {
        safeOptions.pan = isFinite(safeOptions.pan) 
            ? Math.max(-1, Math.min(1, safeOptions.pan)) 
            : 0;
    }

    scene.sound.play(key, safeOptions);
}