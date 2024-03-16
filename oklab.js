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

function oklab_to_linear_srgb(c) {
    const l_ = c[0] + 0.3963377774 * c[1] + 0.2158037573 * c[2];
    const m_ = c[0] - 0.1055613458 * c[1] - 0.0638541728 * c[2];
    const s_ = c[0] - 0.0894841775 * c[1] - 1.2914855480 * c[2];

    const l = l_*l_*l_;
    const m = m_*m_*m_;
    const s = s_*s_*s_;

    return [
		+4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
		-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
		-0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s,
    ];
}

// Gamma encode from linear sRGB to sRGB. This is "simple sRGB" for simplicity:
// https://en.wikipedia.org/wiki/SRGB#Transfer_function_(%22gamma%22)
function encode(v) {
    if (v < 0) {
        return -encode(-v);
    }
    return v ** (1 / 2.2);
}

function oklab_to_srgb(c) {
    return oklab_to_linear_srgb(c).map(encode);
}

export { oklab_to_linear_srgb, oklab_to_srgb };
