// Helper to create or recreate a 2D context as needed.

// Cache of current state, to avoid recreating.
const cache = new WeakMap();

function ensureContext(canvas, {
    width = canvas.width,
    height = canvas.height,
    colorSpace = "srgb",
    textureCount = 0,
}) {
    let state = cache.get(canvas);
    if (!state) {
        state = {};
        cache.set(canvas, state);
    }

    if (colorSpace === "p3") {
        colorSpace = "display-p3";
    }

    if (!state.ctx ||
        state.width !== width ||
        state.height !== height ||
        state.colorSpace !== colorSpace) {
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d", { colorSpace });
        const textures = new Array(textureCount);
        for (let i = 0; i < textureCount; i++) {
            textures[i] = ctx.createImageData(width, height);
            textures[i].data.fill(255);
        }
        Object.assign(state, {
            ctx,
            width,
            height,
            colorSpace,
            textures,
        });
        console.log(`Created ${canvas.width}x${canvas.height} ${colorSpace} canvas`);
    }
    return state;
}

export { ensureContext };
