import { ensureContext } from '../canvas.js';
import { oklab_to_linear_srgb } from '../oklab.js';

const canvas = document.querySelector('canvas');

function inGamut(rgb) {
    return rgb.every((v) => v >= 0 && v <= 1);
}

// Gamma encode from linear sRGB to sRGB. This is "simple sRGB" for simplicity:
// https://en.wikipedia.org/wiki/SRGB#Transfer_function_(%22gamma%22)
function encode(v) {
    if (v < 0) {
        return -encode(-v);
    }
    return v ** (1 / 2.2);
}

function drawSlice({ hue, method, highlight }) {
    const { ctx, width, height, textures } = ensureContext(canvas, {
        width: 500 * devicePixelRatio,
        height: 500 * devicePixelRatio,
        textureCount: 1,
    });

    const [slice] = textures;

    // We want a slice in Oklch, but can work in Oklab by scaling towards
    // the final a and b for the given hue angle.
    const maxChroma = 0.4;
    const hueRadians = hue * Math.PI / 180;
    const maxA = maxChroma * Math.cos(hueRadians);
    const maxB = maxChroma * Math.sin(hueRadians);

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            // Oklab coordinates
            const lab = [
                1 - (y / (height - 1)),
                maxA * (x / (width - 1)),
                maxB * (x / (width - 1)),
            ];

            // (x, y) offset into textures
            const offset = 4 * (x + width * y);

            // Convert to linear sRGB
            let rgb = oklab_to_linear_srgb(lab);
            const wasInGamut = inGamut(rgb);
            if (!wasInGamut) {
                if (method === 'chroma') {
                    // Bisect chroma (a and b) until for a constant number of iterations.
                    let [l, a, b] = lab;
                    let lower = 0;
                    let upper = 1;
                    let iterations = 10;
                    while (true) {
                        let scale = (lower + upper) / 2;
                        rgb = oklab_to_linear_srgb([l, scale * a, scale * b]);
                        iterations--;
                        if (iterations === 0) {
                            break;
                        }
                        if (inGamut(rgb)) {
                            lower = scale;
                        } else {
                            upper = scale;
                        }
                    }
                    // If it's still out of gamut clipping will do the rest.
                } else {
                    // Clipping doesn't need to be done explicitly, the ImageData
                    // Uint8ClampedArray will clamp to 0-255 when setting.
                }
            }

            if (highlight && !wasInGamut) {
                // Invert the colors for highlight
                rgb = rgb.map((v) => 1 - v);
            }

            // Convert to sRGB. Uint8ClampedArray does the rounding for us:
            // https://tc39.es/ecma262/multipage/abstract-operations.html#sec-touint8clamp
            slice.data[offset + 0] = 255 * encode(rgb[0]);
            slice.data[offset + 1] = 255 * encode(rgb[1]);
            slice.data[offset + 2] = 255 * encode(rgb[2]);
        }
    }

    ctx.putImageData(slice, 0, 0);
}

const form = document.querySelector('form');
const outputs = form.querySelectorAll('output');

function update() {
    const params = {
        hue: form.elements.hue.value,
        method: form.elements.method.value,
        highlight: form.elements.highlight.checked,
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
