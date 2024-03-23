import { ensureContext } from '../canvas.js';
import { xyz_to_oklab } from '../oklab.js';
import cie_xyz_1931_2deg from './CIE_xyz_1931_2deg.js';

// The visible spectrum is reported as 380-700 or 380-720 nm in different
// sources:
// https://science.nasa.gov/ems/09_visiblelight/
// https://en.wikipedia.org/wiki/Visible_spectrum
//
// Use 380-700 as that's the range in many Wikipedia illustrations, and
// very little changes beyond that point.
// TODO: Also drop 700? That point alone fails the assertClockwise check.
const redLimit = 700;
const violetLimit = 380;
const visibleXYZ = new Map(cie_xyz_1931_2deg
    .filter(([wavelength]) => {
        return wavelength >= violetLimit && wavelength <= redLimit;
    })
    .map(([wavelength, ...XYZ]) => [wavelength, XYZ])
);

// Convert XYZ to xyY, discarding Y.
function xy(X, Y, Z) {
    return {
        x: X / (X + Y + Z),
        y: Y / (X + Y + Z),
    };
}

// Chromaticity diagram in xyY space with Y=1 looks like a horseshoe.
function getHorseshoePath() {
    const path = new Path2D();

    for (const XYZ of visibleXYZ.values()) {
        const { x, y } = xy(...XYZ);
        path.lineTo(x, y);
    }

    return path;
}

// Get (a, b) coordinates in Oklab of XYZ color scaled to L=1 in Oklab.
function ab(X, Y, Z) {
    const [L, a, b] = xyz_to_oklab([X, Y, Z]);
    return {
        a: a / L,
        b: b / L,
    };
}

// Get 0-360 hue from (a, b) coordinates
function hueAngle(a, b) {
    const angle = Math.atan2(b, a) * 180 / Math.PI;
    return ((angle % 360) + 360) % 360;
}

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

// Chromaticity diagram in Oklab (a, b) coordinates with L=1 looks like a ghost.
// Generate the points that form the ghost outline as a spline.
function* getGhostPoints() {
    // Spectral colors converted from XYZ coordinates.
    for (const coords of visibleXYZ.values()) {
        let [L, a, b] = xyz_to_oklab(coords);
        yield [a / L, b / L];
    }

    // The line of purples, which is not straight in Oklab.
    // https://en.wikipedia.org/wiki/Line_of_purples
    const segments = 100;
    const red = visibleXYZ.get(redLimit);
    const violet = visibleXYZ.get(violetLimit);
    for (let i = 0; i < segments; i++) {
        const ratio = (i + 1) / (segments + 1);
        const purple = mix(red, violet, ratio);
        const { a, b } = ab(...purple);
        yield [a, b];
    }
}

function testClockwise() {
    // Clockwise visually means hue angle must be decreasing.
    let prevAngle = Infinity;
    for (const [a, b] of getGhostPoints()) {
        const angle = hueAngle(a, b);
        if (angle >= prevAngle) {
            // TODO: Allow for one crossing from 0 to 360.
            throw new Error(`Non-clockwise hue move from ${prevAngle} to ${angle}`);
        }
        prevAngle = angle;
    }
}

// testClockwise();

const canvas = document.querySelector('canvas');

// Draw the outline of the spectral locus and the line of purples in Oklab.
// It looks a like a ghost.
function drawGhost() {
    const rect = canvas.getBoundingClientRect();
    const options = {
        width: rect.width * devicePixelRatio,
        height: rect.height * devicePixelRatio,
    };
    const { ctx, width, height } = ensureContext(canvas, options);

    ctx.reset();
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 2 * devicePixelRatio;
    ctx.lineJoin = 'round';

    // Move (0, 0) to roughly center the ghost, and flip the y axis.
    ctx.translate(Math.round(width * 0.5), Math.round(height * 0.3));
    ctx.scale(1, -1);

    // Scale to fit [-1, 1] in both dimensions.
    const scale = Math.min(width, height) / 2;

    // Draw the ghost outline.
    ctx.save();
    ctx.scale(scale, scale);
    ctx.beginPath();
    for (const [a, b] of getGhostPoints()) {
        ctx.lineTo(a, b);
    }
    ctx.closePath();
    ctx.restore();
    ctx.stroke();

    // Draw a cross at the origin
    const radius = 20;
    ctx.beginPath();
    ctx.lineTo(-radius, 0);
    ctx.lineTo(radius, 0);
    ctx.moveTo(0, -radius);
    ctx.lineTo(0, radius);
    ctx.stroke();
}

function update() {
    drawGhost();
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
