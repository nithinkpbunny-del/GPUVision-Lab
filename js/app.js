import { initializeGPU, loadShaderSource } from "./gpu.js";
import { ImageLoader } from "./imageLoader.js";
import {
    getFilter,
    getAllFilterIds,
    isComputeFilter
} from "./filters.js";
import { UI } from "./ui.js";

const UNIFORM_SIZE = 16;

const ui = new UI();

let gpu;
let imageLoader;
let renderPipeline;
let computePipeline;
let sampler;
let renderUniformBuffer;
let computeUniformBuffer;
let computeTexture;
let outputReadbackBuffer;
let outputBytesPerRow = 0;
let currentOutputPixels = null;
let currentFilter = null;
let imageSize = null;
let processing = false;

async function startApplication() {
    try {
        gpu = await initializeGPU(
            ui.outputCanvas,
            handleDeviceLost
        );

        ui.setGPUReady(gpu.adapterName);

        const maxDimension = Math.min(
            4096,
            gpu.device.limits.maxTextureDimension2D
        );

        imageLoader = new ImageLoader(
            ui.inputCanvas,
            maxDimension
        );

        await createPipelines();
        registerEvents();
    } catch (error) {
        console.error(error);

        ui.setGPUError(
            error.message || "WebGPU initialization failed."
        );
    }
}

function handleDeviceLost(message) {
    ui.setGPUError(message);
    ui.setFiltersEnabled(false);
    ui.setDownloadEnabled(false);
}

async function createPipelines() {
    const [
        vertexSource,
        fragmentSource,
        computeSource
    ] = await Promise.all([
        loadShaderSource("../shaders/vertex.wgsl"),
        loadShaderSource("../shaders/fragment.wgsl"),
        loadShaderSource("../shaders/compute.wgsl")
    ]);

    const device = gpu.device;

    const vertexModule = device.createShaderModule({
        label: "Fullscreen vertex shader",
        code: vertexSource
    });

    const fragmentModule = device.createShaderModule({
        label: "Image fragment shader",
        code: fragmentSource
    });

    const computeModule = device.createShaderModule({
        label: "Image compute shader",
        code: computeSource
    });

    renderPipeline = device.createRenderPipeline({
        label: "Image render pipeline",
        layout: "auto",

        vertex: {
            module: vertexModule,
            entryPoint: "vertexMain"
        },

        fragment: {
            module: fragmentModule,
            entryPoint: "fragmentMain",
            targets: [
                {
                    format: gpu.format
                }
            ]
        },

        primitive: {
            topology: "triangle-list"
        }
    });

    computePipeline = device.createComputePipeline({
        label: "Image compute pipeline",
        layout: "auto",

        compute: {
            module: computeModule,
            entryPoint: "computeMain"
        }
    });

    sampler = device.createSampler({
        magFilter: "linear",
        minFilter: "linear"
    });

    renderUniformBuffer = device.createBuffer({
        label: "Render filter settings",
        size: UNIFORM_SIZE,

        usage:
            GPUBufferUsage.UNIFORM |
            GPUBufferUsage.COPY_DST
    });

    computeUniformBuffer = device.createBuffer({
        label: "Compute filter settings",
        size: UNIFORM_SIZE,

        usage:
            GPUBufferUsage.UNIFORM |
            GPUBufferUsage.COPY_DST
    });
}

function registerEvents() {
    ui.imageUpload.addEventListener(
        "change",
        handleImageUpload
    );

    ui.filterButtons.forEach((button) => {
        button.addEventListener("click", () => {
            processFilter(button.dataset.filter);
        });
    });

    ui.resetButton.addEventListener("click", () => {
        processFilter("original");
    });

    ui.downloadButton.addEventListener(
        "click",
        downloadCurrentOutput
    );
}

async function handleImageUpload(event) {
    const [file] = event.target.files;

    if (!file) {
        return;
    }

    ui.clearError();
    ui.setFiltersEnabled(false);
    ui.setDownloadEnabled(false);
    currentOutputPixels = null;

    try {
        const loaded = await imageLoader.loadFromFile(file);

        imageSize = {
            width: loaded.width,
            height: loaded.height
        };

        ui.outputCanvas.width = loaded.width;
        ui.outputCanvas.height = loaded.height;

        imageLoader.createGPUTexture(gpu.device);
        createComputeTexture();
        createOutputReadbackBuffer();

        ui.showImage(loaded.width, loaded.height);
        await processFilter("original", "upload");

        if (loaded.wasScaled) {
            ui.showError(
                `Image was safely resized to ` +
                `${loaded.width} × ${loaded.height} ` +
                `for GPU processing.`
            );
        }
    } catch (error) {
        console.error(error);

        ui.showError(
            error.message || "Unable to load the selected image."
        );

        ui.setFiltersEnabled(Boolean(imageSize));
    } finally {
        event.target.value = "";
    }
}

function createComputeTexture() {
    computeTexture?.destroy();

    computeTexture = gpu.device.createTexture({
        label: "Compute shader output",

        size: [
            imageSize.width,
            imageSize.height,
            1
        ],

        format: "rgba8unorm",

        usage:
            GPUTextureUsage.STORAGE_BINDING |
            GPUTextureUsage.TEXTURE_BINDING |
            GPUTextureUsage.COPY_SRC |
            GPUTextureUsage.COPY_DST
    });
}

function createOutputReadbackBuffer() {
    outputReadbackBuffer?.destroy();

    outputBytesPerRow = Math.ceil(
        (imageSize.width * 4) / 256
    ) * 256;

    outputReadbackBuffer = gpu.device.createBuffer({
        label: "Processed canvas PNG readback",
        size: outputBytesPerRow * imageSize.height,
        usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
    });
}

function writeUniforms(buffer, filter) {
    const data = new ArrayBuffer(UNIFORM_SIZE);
    const view = new DataView(data);

    view.setUint32(0, filter.mode, true);
    view.setFloat32(4, filter.intensity, true);
    view.setUint32(8, imageSize.width, true);
    view.setUint32(12, imageSize.height, true);

    gpu.device.queue.writeBuffer(
        buffer,
        0,
        data
    );
}

async function processFilter(filterId, animationRoute = null) {
    if (!imageSize || processing) {
        return;
    }

    const details = getFilter(filterId);

    if (
        !details ||
        !getAllFilterIds().includes(filterId)
    ) {
        ui.showError(`Unknown filter: ${filterId}`);
        return;
    }

    processing = true;
    ui.clearError();
    ui.setControlsEnabled(false);
    ui.setDownloadEnabled(false);

    const filter = {
        ...details,
        id: filterId
    };

    const useCompute = isComputeFilter(filterId);
    const route = animationRoute || (useCompute ? "compute" : "fragment");
    const animation = ui.animatePipeline(route);

    ui.setActiveFilter(filter, useCompute);

    ui.setShaderStatus(
        "Complete",
        useCompute ? "Used for final display" : "Active",
        useCompute ? "Active" : "Idle"
    );

    try {
        const start = performance.now();

        writeUniforms(
            useCompute
                ? computeUniformBuffer
                : renderUniformBuffer,
            filter
        );

        const encoder = gpu.device.createCommandEncoder({
            label: `${filter.name} commands`
        });

        let renderSource = imageLoader.texture;

        if (useCompute) {
            const computeBindGroup =
                gpu.device.createBindGroup({
                    layout:
                        computePipeline.getBindGroupLayout(0),

                    entries: [
                        {
                            binding: 0,
                            resource:
                                imageLoader.texture.createView()
                        },
                        {
                            binding: 1,
                            resource:
                                computeTexture.createView()
                        },
                        {
                            binding: 2,
                            resource: {
                                buffer: computeUniformBuffer
                            }
                        }
                    ]
                });

            const computePass =
                encoder.beginComputePass({
                    label: filter.name
                });

            computePass.setPipeline(computePipeline);
            computePass.setBindGroup(0, computeBindGroup);

            computePass.dispatchWorkgroups(
                Math.ceil(imageSize.width / 8),
                Math.ceil(imageSize.height / 8)
            );

            computePass.end();

            renderSource = computeTexture;

            // Display the processed compute texture without
            // applying another fragment colour effect.
            writeUniforms(renderUniformBuffer, {
                mode: 0,
                intensity: 0
            });
        }

        const renderBindGroup =
            gpu.device.createBindGroup({
                layout:
                    renderPipeline.getBindGroupLayout(0),

                entries: [
                    {
                        binding: 0,
                        resource: sampler
                    },
                    {
                        binding: 1,
                        resource: renderSource.createView()
                    },
                    {
                        binding: 2,
                        resource: {
                            buffer: renderUniformBuffer
                        }
                    }
                ]
            });

        const currentCanvasTexture =
            gpu.context.getCurrentTexture();

        const renderPass =
            encoder.beginRenderPass({
                label: "Final canvas display",

                colorAttachments: [
                    {
                        view: currentCanvasTexture.createView(),

                        clearValue: {
                            r: 0,
                            g: 0,
                            b: 0,
                            a: 1
                        },

                        loadOp: "clear",
                        storeOp: "store"
                    }
                ]
            });

        renderPass.setPipeline(renderPipeline);
        renderPass.setBindGroup(0, renderBindGroup);
        renderPass.draw(6);
        renderPass.end();

        encoder.copyTextureToBuffer(
            { texture: currentCanvasTexture },
            {
                buffer: outputReadbackBuffer,
                bytesPerRow: outputBytesPerRow,
                rowsPerImage: imageSize.height
            },
            [imageSize.width, imageSize.height, 1]
        );

        gpu.device.queue.submit([
            encoder.finish()
        ]);

        await gpu.device.queue.onSubmittedWorkDone();

        ui.setProcessingTime(
            performance.now() - start
        );

        await captureOutputPixels();
        await animation;

        currentFilter = filter;
        ui.setShaderStatus(
            "Complete",
            useCompute ? "Used for final display" : "Complete",
            useCompute ? "Complete" : "Idle"
        );
        ui.setDownloadEnabled(true);
    } catch (error) {
        console.error(error);

        ui.showError(
            `GPU processing failed: ${error.message}`
        );
    } finally {
        processing = false;
        ui.setControlsEnabled(Boolean(imageSize));
    }
}

async function captureOutputPixels() {
    await outputReadbackBuffer.mapAsync(GPUMapMode.READ);

    const mapped = new Uint8Array(
        outputReadbackBuffer.getMappedRange()
    );
    const pixels = new Uint8ClampedArray(
        imageSize.width * imageSize.height * 4
    );
    const isBGRA = gpu.format.startsWith("bgra");

    for (let y = 0; y < imageSize.height; y += 1) {
        const sourceRow = y * outputBytesPerRow;
        const targetRow = y * imageSize.width * 4;

        for (let x = 0; x < imageSize.width; x += 1) {
            const source = sourceRow + x * 4;
            const target = targetRow + x * 4;

            pixels[target] = mapped[source + (isBGRA ? 2 : 0)];
            pixels[target + 1] = mapped[source + 1];
            pixels[target + 2] = mapped[source + (isBGRA ? 0 : 2)];
            pixels[target + 3] = mapped[source + 3];
        }
    }

    outputReadbackBuffer.unmap();
    currentOutputPixels = pixels;
}

function downloadCurrentOutput() {
    if (!currentOutputPixels || !currentFilter || !imageSize) {
        ui.showError("Process an image before downloading the output.");
        return;
    }

    const exportCanvas = document.createElement("canvas");
    exportCanvas.width = imageSize.width;
    exportCanvas.height = imageSize.height;

    const context = exportCanvas.getContext("2d");
    context.putImageData(
        new ImageData(
            currentOutputPixels,
            imageSize.width,
            imageSize.height
        ),
        0,
        0
    );

    exportCanvas.toBlob((blob) => {
        if (!blob) {
            ui.showError("The browser could not create the output PNG.");
            return;
        }

        const filterName = currentFilter.name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, "");
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `gpuvision-${filterName}.png`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    }, "image/png");
}

window.addEventListener("beforeunload", () => {
    imageLoader?.destroy();
    computeTexture?.destroy();
    outputReadbackBuffer?.destroy();
    renderUniformBuffer?.destroy();
    computeUniformBuffer?.destroy();
});

startApplication();
