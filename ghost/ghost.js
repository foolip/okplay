import cie_xyz_1931_2deg from './CIE_xyz_1931_2deg.js';
import { xyz_to_oklab } from '../oklab.js';

// Mix between a and b (number or arrays of numbers) by some ratio.
// Ratio 0 is 100% a, and 1 is 100% b.
function mix(a, b, ratio) {
    function mixNumber(a, b) {
        return (1 - ratio) * a + ratio * b;
    }
    if (Array.isArray(a)) {
        return a.map((aNumber, index) => mixNumber(aNumber, b[index]));
    }
    return mixNumber(a, b);
}

const canvas = document.querySelector('canvas');

// Cache of current state to know when the canvas needs to be recreated.
let current = {
    ctx: null,
    width: 0,
    height: 0,
    textures: [],
};

function ensureContext() {
    const rect = canvas.getBoundingClientRect();
    const width = rect.width * devicePixelRatio;
    const height = rect.height * devicePixelRatio;

    if (!current.ctx ||
        current.width !== width ||
        current.height !== height) {
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        Object.assign(current, {
            ctx,
            width,
            height,
        });
        console.log(`Created ${canvas.width}x${canvas.height} canvas`);
    }
    return current;
}

// Convert XYZ to xyY, discarding Y.
function xy(X, Y, Z) {
    return {
        x: X / (X + Y + Z),
        y: Y / (X + Y + Z),
    };
}

// Chromaticity diagram in xyY space with Y=1 looks like a horseshoe.
function drawHorseshoe(ctx, width, height) {
    ctx.save();
    ctx.translate(0, height);
    ctx.scale(width, -height);
    ctx.beginPath();
    for (const [wavelength, X, Y, Z] of cie_xyz_1931_2deg) {
        const { x, y } = xy(X, Y, Z);
        ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.restore();
    ctx.stroke();
}

// Get (a, b) coordinates in Oklab of XYZ color scaled to L=1 in Oklab.
function ab(X, Y, Z) {
    const [L, a, b] = xyz_to_oklab([X, Y, Z]);
    return {
        a: a / L,
        b: b / L,
    };
}

// Draw the outline of the spectral locus and the line of purples in Oklab.
// It looks a like a ghost.
function drawGhost(ctx, width, height) {
    // Origo is placed to roughly center the ghost.
    const origo = {
        x: width * 0.5,
        y: height * 0.3,
    };

    const radius = 20; // not a circle, but "radius"
    ctx.lineTo(origo.x - radius, origo.y);
    ctx.lineTo(origo.x + radius, origo.y);
    ctx.moveTo(origo.x, origo.y - radius);
    ctx.lineTo(origo.x, origo.y + radius);
    ctx.stroke();

    ctx.save();
    ctx.translate(origo.x, origo.y);
    ctx.scale(width / 2, -height / 2);
    ctx.beginPath();
    for (const [wavelength, ...coords] of cie_xyz_1931_2deg) {
        let [L, a, b] = xyz_to_oklab(coords);
        // Normalize to lightness 1
        a /= L;
        b /= L;
        ctx.lineTo(a, b);
    }
    // Draw the line of purples, which is not straight in Oklab.
    // https://en.wikipedia.org/wiki/Line_of_purples
    const segments = 100;
    const red = cie_xyz_1931_2deg.at(0).slice(1);
    const violet = cie_xyz_1931_2deg.at(-1).slice(1);
    for (let i = 0; i < segments; i++) {
        const ratio = (i + 1) / (segments + 1);
        // Use the cube to roughly compensate cube root in xyz_to_oklab.
        const purple = mix(violet, red, ratio ** 3);
        const { a, b } = ab(...purple);
        ctx.lineTo(a, b);
    }
    ctx.closePath();
    ctx.restore();
    ctx.stroke();
}

function update() {
    const { ctx, width, height } = ensureContext();

    ctx.reset();
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 2 * devicePixelRatio;
    ctx.lineJoin = 'round';

    drawGhost(ctx, width, height);
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

window.addEventListener('resize', updateNextFrame);

updateNextFrame();
