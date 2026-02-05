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
        console.log(textureKey);
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
    group.getChildren().forEach(child => {
        const depthOffset = (child === heroSprite) ? 8 : 0;
        child.setDepth(child.y + depthOffset);
    });
};