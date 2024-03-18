// Copyright (c) 2020 Björn Ottosson
// Permission is hereby granted, free of charge, to any person obtaining a copy of
// this software and associated documentation files (the "Software"), to deal in
// the Software without restriction, including without limitation the rights to
// use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies
// of the Software, and to permit persons to whom the Software is furnished to do
// so, subject to the following conditions:
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

// https://bottosson.github.io/posts/oklab/

function xyz_to_oklab(c) {
    const [X, Y, Z] = c;

    const l = +0.8189330101 * X + 0.3618667424 * Y - 0.1288597137 * Z;
    const m = +0.0329845436 * X + 0.9293118715 * Y + 0.0361456387 * Z;
    const s = +0.0482003018 * X + 0.2643662691 * Y + 0.6338517070 * Z;

    const l_ = Math.cbrt(l);
    const m_ = Math.cbrt(m);
    const s_ = Math.cbrt(s);

    return [
        +0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_,
        +1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_,
        +0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_,
    ];
}

function oklab_to_linear_srgb(c) {
    const [L, a, b] = c;

    const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
    const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
    const s_ = L - 0.0894841775 * a - 1.2914855480 * b;

    const l = l_*l_*l_;
    const m = m_*m_*m_;
    const s = s_*s_*s_;

    return [
        +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
        -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
        -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s,
    ];
}

export { xyz_to_oklab, oklab_to_linear_srgb };
