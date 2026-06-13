// services/AnimConfig.js
// Source de vérité unique pour TOUTES les animations

export const HERO_ANIMS = [
    { key: 'idle',   length: 18, rate: 20,  repeat: -1 },
    { key: 'walk',   length: 24, rate: 44,  repeat: -1 },
    { key: 'run',    length: 12, rate: 24,  repeat: -1 },
    { key: 'kick',   length: 12, rate: 24,  repeat: 0  },
    { key: 'attack', length: 12, rate: 30,  repeat: 0  },
    { key: 'shoot',  length: 18, rate: 60,  repeat: 0  }, // ← rate élevé = rapide
    { key: 'slide',  length: 6,  rate: 20,  repeat: 0  },
];

// Mapping clé anim → suffixe de texture
export const TEXTURE_SUFFIX = {
    idle:   'idle',
    walk:   'walking',
    run:    'running',
    kick:   'kick',
    attack: 'attacking',
    shoot:  'shoot',
    slide:  'slide',
};

export const WEAPON_ANIMS = {
    baseball: [
        { key: 'attacking', folder: 'attacking', prefix: 'baseball_attacking', count: 11 },
        { key: 'idle',      folder: 'idle',      prefix: 'baseball_idle',      count: 17 },
    ],
    bow: [
        { key: 'shoot', folder: 'shoot', prefix: 'bow_shoot', count: 0 },
        { key: 'idle',  folder: 'idle',  prefix: 'bow_idle',  count: 0 },
    ],
};