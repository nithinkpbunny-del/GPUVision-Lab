const FILTERS = Object.freeze({
    original: {
        mode: 0,
        pipeline: "fragment",
        name: "Original",
        intensity: 0.0,
        method: "Texture sampling and display",
        explanation: "Samples the uploaded texture and displays its original colour."
    },
    grayscale: {
        mode: 1,
        pipeline: "fragment",
        name: "Grayscale",
        intensity: 1.0,
        method: "Gray = 0.299R + 0.587G + 0.114B",
        explanation: "Combines red, green, and blue using luminance-weighted values."
    },
    negative: {
        mode: 2,
        pipeline: "fragment",
        name: "Negative",
        intensity: 1.0,
        method: "RGB = 1 - RGB",
        explanation: "Inverts each colour channel to create a photographic negative."
    },
    sepia: {
        mode: 3,
        pipeline: "fragment",
        name: "Sepia",
        intensity: 1.0,
        method: "Colour transformation matrix",
        explanation: "Mixes the RGB channels through a warm sepia colour matrix."
    },
    brightness: {
        mode: 4,
        pipeline: "fragment",
        name: "Brightness",
        intensity: 0.2,
        method: "Add intensity, then clamp",
        explanation: "Adds the intensity to RGB and clamps every value to the valid 0–1 range."
    },
    contrast: {
        mode: 5,
        pipeline: "fragment",
        name: "Contrast",
        intensity: 0.5,
        method: "Expand values around 0.5",
        explanation: "Moves colours away from the mid-point so darks deepen and highlights brighten."
    },
    thermal: {
        mode: 6,
        pipeline: "fragment",
        name: "Thermal Vision",
        intensity: 1.0,
        method: "Luminance-to-heat colour mapping",
        explanation: "Maps luminance to a false-colour heat scale from blue through cyan and yellow to red."
    },
    blur: {
        mode: 0,
        pipeline: "compute",
        name: "Gaussian Blur",
        intensity: 1.0,
        method: "3×3 weighted convolution kernel",
        explanation: "Blends each pixel with weighted neighbouring pixels to soften detail."
    },
    edge: {
        mode: 1,
        pipeline: "compute",
        name: "Sobel Edge Detection",
        intensity: 1.0,
        method: "Horizontal and vertical gradients",
        explanation: "Calculates Sobel X and Y gradients and combines them into an edge magnitude."
    },
    cartoon: {
        mode: 2,
        pipeline: "compute",
        name: "Cartoon Effect",
        intensity: 1.0,
        method: "Colour quantization + Sobel darkening",
        explanation: "Reduces the colour palette and darkens strong Sobel edges for an illustrated look."
    }
});

export function getFilter(id) {
    return FILTERS[id] || null;
}

export function isComputeFilter(id) {
    return getFilter(id)?.pipeline === "compute";
}

export function getAllFilterIds() {
    return Object.keys(FILTERS);
}
