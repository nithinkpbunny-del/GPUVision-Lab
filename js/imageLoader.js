const ACCEPTED_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
const MAX_FILE_BYTES = 50 * 1024 * 1024;

export class ImageLoader {
    constructor(inputCanvas, maxDimension = 4096) {
        this.canvas = inputCanvas;
        this.context = inputCanvas.getContext("2d", { alpha: false });
        this.maxDimension = Math.max(1, maxDimension);
        this.bitmap = null;
        this.texture = null;
    }

    async loadFromFile(file) {
        if (!file) throw new Error("No image was selected.");
        if (!ACCEPTED_TYPES.has(file.type)) {
            throw new Error("Unsupported file. Select a PNG, JPEG, or WebP image.");
        }
        if (file.size > MAX_FILE_BYTES) {
            throw new Error("The selected image is larger than the 50 MB safety limit.");
        }

        let source;
        try {
            source = await createImageBitmap(file);
        } catch {
            throw new Error("The image could not be decoded. It may be damaged or use an unsupported encoding.");
        }

        const scale = Math.min(1, this.maxDimension / Math.max(source.width, source.height));
        const width = Math.max(1, Math.round(source.width * scale));
        const height = Math.max(1, Math.round(source.height * scale));
        let bitmap = source;

        if (scale < 1) {
            bitmap = await createImageBitmap(source, 0, 0, source.width, source.height, {
                resizeWidth: width,
                resizeHeight: height,
                resizeQuality: "high"
            });
            source.close();
        }

        this.bitmap?.close();
        this.bitmap = bitmap;
        this.canvas.width = width;
        this.canvas.height = height;
        this.context.clearRect(0, 0, width, height);
        this.context.drawImage(bitmap, 0, 0, width, height);

        return { width, height, pixels: width * height, wasScaled: scale < 1 };
    }

    createGPUTexture(device) {
        if (!this.bitmap) throw new Error("Load an image before creating its GPU texture.");
        this.texture?.destroy();
        this.texture = device.createTexture({
            label: "Uploaded image",
            size: [this.bitmap.width, this.bitmap.height, 1],
            format: "rgba8unorm",
            usage:
                GPUTextureUsage.TEXTURE_BINDING |
                GPUTextureUsage.COPY_DST |
                GPUTextureUsage.RENDER_ATTACHMENT
        });
        device.queue.copyExternalImageToTexture(
            { source: this.bitmap },
            { texture: this.texture },
            [this.bitmap.width, this.bitmap.height]
        );
        return this.texture;
    }

    destroy() {
        this.texture?.destroy();
        this.bitmap?.close();
        this.texture = null;
        this.bitmap = null;
    }
}
