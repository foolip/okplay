import Color from "./color.js";

import { oklab_to_linear_srgb, oklab_to_srgb } from './oklab.js';

globalThis.Color = Color;

const canvas = document.querySelector('canvas');

// Cache of current state to know when the canvas needs to be recreated.
let current = {
    ctx: null,
    width: 0,
    height: 0,
    colorSpace: '',
    textures: [],
};

function ensureContext(colorSpace, textureCount = 0) {
    if (colorSpace === "p3") {
        colorSpace = "display-p3";
    }

    const width = 256 * devicePixelRatio;
    const height = 256 * devicePixelRatio;

    if (!current.ctx ||
        current.width !== width ||
        current.height !== height ||
        current.colorSpace !== colorSpace) {
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d", { colorSpace });
        const textures = new Array(textureCount);
        for (let i = 0; i < textureCount; i++) {
            textures[i] = ctx.createImageData(width, height);
            textures[i].data.fill(255);
        }
        Object.assign(current, {
            ctx,
            width,
            height,
            colorSpace,
            textures,
        });
        console.log(`Created ${canvas.width}x${canvas.height} ${colorSpace} canvas`);
    }
    return current;
}

// Gamma encode from linear sRGB to sRGB. This is "simple sRGB" for simplicity:
// https://en.wikipedia.org/wiki/SRGB#Transfer_function_(%22gamma%22)
function encode(v) {
    if (v < 0) {
        return -encode(-v);
    }
    return v ** (1 / 2.2);
}

function drawSlice({ hue, rgbSpace, method }) {
    if (rgbSpace !== 'srgb') {
        throw new Error('Only sRGB works');
    }

    const LinearRGB = Color.Space.get('srgb-linear');

    const { ctx, width, height, textures } = ensureContext(rgbSpace, 2);

    // slice: A slice of constant hue with lightness and chroma varying 0-100%.
    // gamut: A bitmap of what's in gamut in the RGB space in that slice.
    const [slice, gamut] = textures;
    gamut.data.fill(0);

    // We want a slice in Oklch, but can work in Oklab by scaling towards
    // the final a and b for the given hue angle.
    const maxChroma = 0.4;
    const hueRadians = hue * Math.PI / 180;
    const maxA = maxChroma * Math.cos(hueRadians);
    const maxB = maxChroma * Math.sin(hueRadians);

    for (let x = 0; x < width; x++) {
        for (let y = 0; y < height; y++) {
            // Oklab coordinates
            const lab = [
                1 - (y / (height - 1)), // lightness
                maxA * (x / (width - 1)),
                maxB * (x / (width - 1)),
            ];

            // (x, y) offset into textures
            const offset = 4 * (x + width * y);

            // Convert to linear sRGB
            let rgb = oklab_to_linear_srgb(lab);
            const inGamut = rgb.every((v) => v >= 0 && v <= 1);
            if (!inGamut) {
                if (method === 'css') {
                    // TODO: This is very quite slow. Avoid creating new objects somehow?
                    rgb = new Color(LinearRGB, rgb).toGamut().coords;
                } else {
                    // Clipping doesn't need to be done explicitly, the ImageData
                    // Uint8ClampedArray will clamp to 0-255 when setting.
                }
            }
            // Convert to sRGB. Uint8ClampedArray does the rounding for us:
            // https://tc39.es/ecma262/multipage/abstract-operations.html#sec-touint8clamp
            slice.data[offset + 0] = 255 * encode(rgb[0]);
            slice.data[offset + 1] = 255 * encode(rgb[1]);
            slice.data[offset + 2] = 255 * encode(rgb[2]);

            // Use the alpha channel of the gamut ImageBitmap
            gamut.data[offset + 3] = inGamut ? 255 : 0;
        }
    }

    ctx.putImageData(slice, 0, 0);
    //ctx.putImageData(gamut, 0, 0);
}

const form = document.querySelector('form');
const outputs = form.querySelectorAll('output');

function update() {
    const params = {
        hue: form.elements.hue.value,
        rgbSpace: form.elements.rgbspace.value,
        method: form.elements.method.value,
    };
    drawSlice(params);
    outputs[0].textContent = Number(params.hue).toFixed(1);
}

// Updates are debounced using rAF.
let rafHandle = 0;
function updateNextFrame() {
    if (rafHandle) {
        // rAF callback is pending.
        return;
    }
    rafHandle = requestAnimationFrame(() => {
        update();
        rafHandle = 0;
    });
}

form.addEventListener('input', updateNextFrame);
window.addEventListener('resize', updateNextFrame);

updateNextFrame();
