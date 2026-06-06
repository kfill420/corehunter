export const setupWorld = (scene, map) => {
    const sortingGroup = scene.add.group();
    const layer = map.getObjectLayer('Bushes');
    if (!layer) return sortingGroup;

    const bushesData = scene.cache.json.get("bushes_data");

    layer.objects.forEach(obj => {
        if (!obj.gid) return;

        const tileset = map.tilesets.find(ts => obj.gid >= ts.firstgid && obj.gid < ts.firstgid + ts.total);
        if (!tileset) return;

        const textureKey = tileset.name.replace(/^.*[\\/]/, '').replace('.png', '').toLowerCase().split('_')[0];
        const sprite = scene.add.sprite(obj.x, obj.y, textureKey).setOrigin(0, 1);
        sortingGroup.add(sprite);

        const tileJson = bushesData?.tiles?.find(t => {
            const fileName = t.image.split('/').pop().toLowerCase();
            return fileName.includes(textureKey);
        });

        if (tileJson && tileJson.objectgroup && tileJson.objectgroup.objects) {
            tileJson.objectgroup.objects.forEach(collisionShape => {
                const opts = { isStatic: true, label: 'bushCollider' };
                
                const startX = obj.x;
                const startY = obj.y - obj.height;

                const centerX = startX + collisionShape.x + (collisionShape.width / 2);
                const centerY = startY + collisionShape.y + (collisionShape.height / 2);

                if (collisionShape.ellipse) {
                    const radius = collisionShape.width / 2;
                    scene.matter.add.circle(centerX, centerY, radius, opts);
                } else {
                    scene.matter.add.rectangle(centerX, centerY, collisionShape.width, collisionShape.height, opts);
                }
            });
        }
    });

    return sortingGroup;
};


export const applyYSorting = (group, heroSprite) => {
    if (!group) return;
    group.getChildren().forEach(child => {
        if (!child || !child.active || !child.visible || !child.texture) return;
        const isEntity = (child === heroSprite) 
            || (child.body && !child.body.isStatic) 
            || child.playerId;

        const feetY = child.originY !== undefined 
            ? child.y + (1 - child.originY) * child.displayHeight
            : child.y;

        const depthOffset = isEntity ? 8 : 0;
        child.setDepth(feetY + depthOffset);
    });
};