import { networkManager } from "./NetworkManager.js";

export function handleMeleeAttack(player, config, pointer, angle) {
    if (player.scene.gameMode === 'multi') {
        networkManager.sendAction('playerAttack', {
            type: 'weapon',
            weapon: player.currentWeapon,
            angle: Phaser.Math.Angle.Between(player.sprite.x, player.sprite.y, pointer.worldX, pointer.worldY)
        });
    }

    let finalRange = config.range;
    if (angle > 0.5 && angle < 2.5) finalRange *= 0.2;
    const hitboxX = player.sprite.x + Math.cos(angle) * finalRange;
    const hitboxY = player.sprite.y + Math.sin(angle) * finalRange + config.offsetY;
    player.activeHitbox = player.scene.matter.add.circle(hitboxX, hitboxY, config.radius, { 
        isSensor: true, 
        label: 'heroHitbox' 
    });

    player.sprite.once(`animationcomplete-${config.attackAnim}`, () => {
        player.isAttacking = false;
        player.weaponSprite.setVisible(false);
        if (player.activeHitbox) {
            player.scene.matter.world.remove(player.activeHitbox);
            player.activeHitbox = null;
        }
        player.scene.remotePlayer?.otherPlayers.forEach(r => r._hitThisAttack = false);
        player.playDualAnim("idle");
    });
};

export function handleRangeAttack(player, config, pointer, angle) {
    // Tirer la flèche à la fin de l'animation (frame de lâcher)
    player.sprite.once(`animationcomplete-${config.attackAnim}`, () => {
        player.isAttacking = false;
        player.weaponSprite.setVisible(false);
        player.playDualAnim("idle");
    
        // Spawner la flèche
        player.scene.arrowManager.shoot(
            player.sprite.x,
            player.sprite.y,
            angle,
            config.damage,
            networkManager.socket?.id
        );
    
        if (player.scene.gameMode === 'multi') {
            networkManager.sendAction('playerShootArrow', {
                x: Math.round(player.sprite.x),
                y: Math.round(player.sprite.y),
                angle,
                damage: config.damage
            });
        }
    
        player.scene.remotePlayer?.otherPlayers.forEach(r => r._hitThisAttack = false);
    });
}