export async function initializeGPU(canvas, onDeviceLost) {
    if (!navigator.gpu) {
        throw new Error(
            "WebGPU is unavailable. Use a recent Google Chrome or Microsoft Edge browser with hardware acceleration enabled."
        );
    }

    const adapter = await navigator.gpu.requestAdapter({ powerPreference: "high-performance" });
    if (!adapter) {
        throw new Error("No compatible WebGPU adapter was found.");
    }

    const device = await adapter.requestDevice();
    const context = canvas.getContext("webgpu");
    if (!context) {
        throw new Error("The output canvas could not create a WebGPU context.");
    }

    const format = navigator.gpu.getPreferredCanvasFormat();
    context.configure({
        device,
        format,
        alphaMode: "opaque",
        usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC
    });

    device.lost.then((info) => {
        onDeviceLost?.(`GPU device lost (${info.reason}): ${info.message || "No details supplied."}`);
    });

    return {
        adapter,
        device,
        context,
        format,
        canvas,
        adapterName: await getAdapterName(adapter)
    };
}

export async function loadShaderSource(relativeUrl) {
    const url = new URL(relativeUrl, import.meta.url);
    let response;
    try {
        response = await fetch(url);
    } catch (error) {
        throw new Error(`Could not fetch shader ${url.pathname}: ${error.message}`);
    }
    if (!response.ok) {
        throw new Error(`Could not load shader ${url.pathname} (HTTP ${response.status}).`);
    }
    return response.text();
}

async function getAdapterName(adapter) {
    let info = adapter.info;
    if (!info && typeof adapter.requestAdapterInfo === "function") {
        try {
            info = await adapter.requestAdapterInfo();
        } catch {
            // Adapter information is optional and may be hidden for privacy.
        }
    }
    if (!info) return "WebGPU adapter (details unavailable)";
    const description = info.description || info.device || info.architecture || "WebGPU adapter";
    return info.vendor && !description.toLowerCase().includes(info.vendor.toLowerCase())
        ? `${info.vendor} — ${description}`
        : description;
}
