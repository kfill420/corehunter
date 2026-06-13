const WEAPON_CONFIG = {
    '': {
        type: 'melee', 
        range: 6,
        radius: 5,
        offsetY: 0,
        damage: 1,
    },
    'baseball': {
        type: 'melee', 
        range: 10,
        radius: 9,
        offsetY: 0,
        damage: 2,
        attackAnim: 'attack',
        attackSound: 'punch'
    },
    'knife': {
        range: 12,
        radius: 6,
        offsetY: 0,
        damage: 5,
    },
    'bow': {
        damage: 1,
        type: 'ranged', 
        projectileSpeed: 8,
        projectileRange: 500,
        projectileRadius: 1,
        attackAnim: 'shoot',
        attackSound: 'bow_shot',
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