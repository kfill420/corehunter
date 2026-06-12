const WEAPON_CONFIG = {
    '': {
        range: 6,
        radius: 5,
        offsetY: 0,
        damage: 3,
        animationKey: 'kick'
    },
    'baseball': {
        range: 10,
        radius: 9,
        offsetY: 0,
        damage: 10,
        animationKey: 'attacking',
        attackAnim: 'attack',
        attackSound: 'punch'
    },
    'knife': {
        range: 12,
        radius: 6,
        offsetY: 0,
        damage: 5,
        animationKey: 'stabbing'
    },
    'bow': {
        damage: 8,
        animationKey: 'attacking',
        type: 'ranged', 
        projectileSpeed: 8,
        projectileRange: 500,
        projectileRadius: 1,
        attackAnim: 'attack',
        attackSound: 'bow_fire',
        animeFrameCounts: {
            idle: 1,
            attack: 1,
            walk: 1,
            run: 1,
            kick: 1,
            slide: 1
        }
    }
};

export default WEAPON_CONFIG;