import Color from "./color.js";

const canvas = document.querySelector('canvas');

// Cache of current state to know when the canvas needs to be recreated.
let current = {
    ctx: null,
    width: 0,
    height: 0,
    colorSpace: '',
};

function ensureContext(colorSpace) {
    if (colorSpace === "p3") {
        colorSpace = "display-p3";
    }

    const rect = canvas.getBoundingClientRect();
    const width = rect.width * devicePixelRatio;
    const height = rect.height * devicePixelRatio;

    if (!current.ctx ||
        current.width !== width ||
        current.height !== height ||
        current.colorSpace !== colorSpace) {
        canvas.width = width;
        canvas.height = height;
        Object.assign(current, {
            ctx: canvas.getContext("2d", { colorSpace }),
            width,
            height,
            colorSpace
        });
        console.log(`Created ${canvas.width}x${canvas.height} ${colorSpace} canvas`);
    }
    return current.ctx;
}

function drawLightness({ chroma, hue, lightnessSpace, rgbSpace, method }) {
    const ctx = ensureContext(rgbSpace);
    const { width, height } = canvas;
    ctx.reset();

    // Lightness 75% is used because the gamut is wide there, but
    // any number would work probably.
    const lxx = new Color('oklch', [0.75, chroma, hue]).to(lightnessSpace);
    console.assert(lxx.l > 0 && lxx.l < 1, 'color must have an l coordinate');

    // A single strip of pixels of the lightness gradient.
    const gradient = ctx.createImageData(width, 1);
    gradient.data.fill(255);

    // An array of boolean values (but 8 bits for each)
    const inGamut = new Array(width).fill(false);

    const lightness = new Float64Array(width);

    for (let x = 0; x < width; x++) {
        const progress = x / (width - 1);
        lxx.l = progress;

        // Convert to RGB color space, remember if it was out of gamut,
        // and then gamut map using Color.js.
        const rgb = lxx.to(rgbSpace);
        inGamut[x] = rgb.inGamut();
        rgb.toGamut({ method });
    
        gradient.data[4 * x + 0] = 255 * rgb.r + 0.5;
        gradient.data[4 * x + 1] = 255 * rgb.g + 0.5;
        gradient.data[4 * x + 2] = 255 * rgb.b + 0.5;

        // Perceptual lightness.
        lightness[x] = rgb.to('oklab').l;
    }

    // Draw gradient in top half.
    const halfHeight = height >> 1;
    for (let y = 0; y < halfHeight; y++) {
        ctx.putImageData(gradient, 0, y);
    }

    // Draw green/red backgrounds of in/out-of-gamut areas in bottom half.
    ctx.fillStyle = `hsl(0 90% 95%)`;
    ctx.fillRect(0, halfHeight, width, height - halfHeight);
    for (let x = 0; x < width; /* no increment */) {
        if (inGamut[x]) {
            // Find stretch of in-gamut pixels.
            let pixels = 1;
            while (inGamut[x + pixels]) {
                pixels++;
            }
            ctx.fillStyle = `hsl(120 90% 95%)`;
            ctx.fillRect(x, halfHeight, pixels, height - halfHeight);
            x += pixels;
        } else {
            x++;
        }
    }

    // And finally the lightness plot on top of the green/red.
    // Dotted line showing ideal (linear) lightness plot.
    ctx.beginPath();
    ctx.moveTo(0, height);
    ctx.lineTo(width, halfHeight);
    ctx.setLineDash([5, 5]);
    ctx.strokeStyle = 'gray';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Line showing the perceived lightness after gamut mapping.
    ctx.save();
    ctx.translate(0, height);
    ctx.scale(1, -(height - halfHeight));
    ctx.beginPath();
    for (let x = 0; x < width; x++) {
        ctx.lineTo(x, lightness[x]);
    }
    ctx.restore();
    ctx.setLineDash([]);
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 2;
    ctx.stroke();
}

const form = document.querySelector('form');
const outputs = form.querySelectorAll('output');

function update() {
    const params = {
        chroma: form.elements.chroma.value,
        hue: form.elements.hue.value,
        lightnessSpace: form.elements.lspace.value,
        rgbSpace: form.elements.rgbspace.value,
        method: form.elements.method.value,
    };
    drawLightness(params);
    outputs[0].textContent = Number(params.chroma).toFixed(3);
    outputs[1].textContent = Number(params.hue).toFixed(1);
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