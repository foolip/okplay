import Color from "./color.js";

// Finding the nearest point on the surface will give unstable results when
// the surface is convex.

function toRGB(color) {
    let rgb = color.to('srgb');
    if (rgb.inGamut()) {
        return rgb;
    }

    function clamp(x) {
        if (x < 0) {
            return 0;
        }
        if (x > 1) {
            return 1;
        }
        return x;
    }

    // First just clamp
    const coords = rgb.coords;
    for (let i in coords) {
        coords[i] = clamp(coords[i]);
    }

    console.log('Clamped starting point:', coords)

    // Now try all possible directions
    let directions = [];
    for (let i in coords) {
        const coord = coords[i];
        if (coord - 0.01 >= 0) {
            const dir = coords.slice();
            dir[i] -= 0.01;
            directions.push(dir);
        }
        if (coord + 0.01 <= 1) {
            const dir = coords.slice();
            dir[i] += 0.01;
            directions.push(dir);
        }
    }
    console.log('Directions:', directions);

    if (!rgb.inGamut()) {
        throw new Error('we have failed')
    }

    return rgb;
}

export toRGB;