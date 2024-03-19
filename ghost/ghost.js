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
const redLimit = 380;
const violetLimit = 700;
const visibleXYZ = new Map(cie_xyz_1931_2deg
    .filter(([wavelength]) => {
        return wavelength >= redLimit && wavelength <= violetLimit;
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
function getGhostPath(options) {
    const assertClockwise = options?.assertClockwise;

    const path = new Path2D();

    const points = [];

    // Spectral colors converted from XYZ coordinates.
    for (const [wavelength, coords] of visibleXYZ.entries()) {
        let [L, a, b] = xyz_to_oklab(coords);
        a /= L;
        b /= L;
        path.lineTo(a, b);
        if (assertClockwise) {
            points.push([wavelength, a, b]);
        }
    }

    // The line of purples, which is not straight in Oklab.
    // https://en.wikipedia.org/wiki/Line_of_purples
    const segments = 100;
    const red = visibleXYZ.get(redLimit);
    const violet = visibleXYZ.get(violetLimit);
    for (let i = 0; i < segments; i++) {
        const ratio = (i + 1) / (segments + 1);
        const purple = mix(violet, red, ratio);
        const { a, b } = ab(...purple);
        path.lineTo(a, b);
        if (assertClockwise) {
            // points.push([undefined, a, b]);
        }
    }

    path.closePath();

    if (assertClockwise) {
        // Clockwise visually means hue angle must be decreasing.
        let prevAngle = Infinity;
        for (const [wavelength, a, b] of points) {
            const angle = hueAngle(a, b);
            if (angle >= prevAngle) {
                throw new Error(`Non-clockwise hue at (${a}, ${b}) (wavelength ${wavelength})`);
            }
            prevAngle = angle;
        }
    }

    return path;
}

// getGhostPath({ assertClockwise: true });

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

    // Origo is placed to roughly center the ghost.
    const origo = {
        x: width * 0.5,
        y: height * 0.3,
    };

    const ghost = getGhostPath();

    // Draw the ghost outline.
    ctx.save();
    ctx.translate(origo.x, origo.y);
    const scale = Math.min(width, height) / 2;
    ctx.scale(scale, -scale);
    ctx.lineWidth /= scale;
    ctx.stroke(ghost);
    ctx.restore();

    // Draw a cross at the origin
    const radius = 20;
    ctx.lineTo(origo.x - radius, origo.y);
    ctx.lineTo(origo.x + radius, origo.y);
    ctx.moveTo(origo.x, origo.y - radius);
    ctx.lineTo(origo.x, origo.y + radius);
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
