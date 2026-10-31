const PIPELINE_DELAY_MS = 150;

export class UI {
    constructor() {
        const ids = [
            "gpuStatus",
            "errorMessage",
            "inputCanvas",
            "outputCanvas",
            "inputPlaceholder",
            "outputPlaceholder",
            "vertexStatus",
            "fragmentStatus",
            "computeStatus",
            "gpuAdapter",
            "gpuBackend",
            "gpuApi",
            "executionModel",
            "currentPipeline",
            "activeShader",
            "resolution",
            "pixelCount",
            "threadCount",
            "processingTime",
            "pipelineInput",
            "pipelineUpload",
            "pipelineVertex",
            "pipelineCompute",
            "pipelineFragment",
            "pipelineOutput",
            "imageUpload",
            "resetButton",
            "downloadButton",
            "operationName",
            "shaderType",
            "processingMethod",
            "operationExplanation",
            "workgroupInfo",
            "workgroupInfoRow"
        ];

        for (const id of ids) {
            this[id] = document.getElementById(id);
        }

        this.filterButtons = [
            ...document.querySelectorAll("[data-filter]")
        ];

        this.pipelineElements = {
            input: this.pipelineInput,
            upload: this.pipelineUpload,
            vertex: this.pipelineVertex,
            compute: this.pipelineCompute,
            fragment: this.pipelineFragment,
            output: this.pipelineOutput
        };

        this.animationToken = 0;

        this.setControlsEnabled(false);
        this.setDownloadEnabled(false);
    }

    setGPUReady(adapterName) {
        this.gpuStatus.textContent = "GPU Ready";
        this.gpuStatus.className = "gpu-status ready";
        this.gpuAdapter.textContent = adapterName;
        this.gpuBackend.textContent = adapterName;
        this.clearError();
    }

    setGPUError(message) {
        this.gpuStatus.textContent = "GPU Unavailable";
        this.gpuStatus.className = "gpu-status unavailable";
        this.gpuAdapter.textContent = "Unavailable";
        this.gpuBackend.textContent = "Unavailable";
        this.showError(message);
    }

    showError(message) {
        this.errorMessage.textContent = message;
        this.errorMessage.hidden = false;
    }

    clearError() {
        this.errorMessage.hidden = true;
        this.errorMessage.textContent = "";
    }

    setControlsEnabled(enabled) {
        this.filterButtons.forEach((button) => {
            button.disabled = !enabled;
        });

        this.resetButton.disabled = !enabled;
    }

    setFiltersEnabled(enabled) {
        this.setControlsEnabled(enabled);
    }

    setDownloadEnabled(enabled) {
        this.downloadButton.disabled = !enabled;
    }

    showImage(width, height) {
        this.inputPlaceholder.hidden = true;
        this.outputPlaceholder.hidden = true;

        this.inputCanvas.hidden = false;
        this.outputCanvas.hidden = false;

        this.resolution.textContent =
            `${width.toLocaleString()} × ${height.toLocaleString()}`;

        const pixels = width * height;

        this.pixelCount.textContent =
            pixels.toLocaleString();

        this.threadCount.textContent =
            `${pixels.toLocaleString()} pixel invocations`;

        this.setControlsEnabled(true);
    }

    setShaderStatus(vertex, fragment, compute) {
        this.setStatus(this.vertexStatus, vertex);
        this.setStatus(this.fragmentStatus, fragment);
        this.setStatus(this.computeStatus, compute);
    }

    setStatus(element, state) {
        const cssState = state
            .toLowerCase()
            .replaceAll(" ", "-");

        element.textContent = state;
        element.className = `status ${cssState}`;
    }

    setActiveFilter(filter, isCompute) {
        this.activeShader.textContent = isCompute
            ? `${filter.name} — Compute + Fragment display`
            : `${filter.name} — Fragment Shader`;

        this.currentPipeline.textContent = isCompute
            ? "Compute + Render Pipeline"
            : "Render Pipeline";

        this.filterButtons.forEach((button) => {
            button.classList.toggle(
                "active",
                button.dataset.filter === filter.id
            );
        });

        this.operationName.textContent = filter.name;

        this.shaderType.textContent = isCompute
            ? "Compute Shader + Fragment display"
            : "Fragment Shader";

        this.processingMethod.textContent = filter.method;
        this.operationExplanation.textContent = filter.explanation;
        this.workgroupInfoRow.hidden = !isCompute;
    }

    setProcessingTime(milliseconds) {
        this.processingTime.textContent =
            `${milliseconds.toFixed(2)} ms approximate submission/completion`;
    }

    setPipeline(
        activeStages = [],
        completedStages = [],
        routeStages = []
    ) {
        for (const [name, element] of Object.entries(
            this.pipelineElements
        )) {
            const isActive = activeStages.includes(name);
            const isComplete = completedStages.includes(name);
            const isSkipped =
                routeStages.length > 0 &&
                !routeStages.includes(name);

            element.classList.toggle("active", isActive);
            element.classList.toggle("complete", isComplete);
            element.classList.toggle("skipped", isSkipped);
        }
    }

    async animatePipeline(
        route,
        delay = PIPELINE_DELAY_MS
    ) {
        const routes = {
            upload: [
                "input",
                "upload",
                "vertex",
                "fragment",
                "output"
            ],

            fragment: [
                "input",
                "upload",
                "vertex",
                "fragment",
                "output"
            ],

            compute: [
                "input",
                "upload",
                "vertex",
                "compute",
                "fragment",
                "output"
            ]
        };

        const stages = routes[route];

        if (!stages) {
            return;
        }

        const token = ++this.animationToken;
        const completed = [];

        this.setPipeline([], [], stages);

        for (const stage of stages) {
            if (token !== this.animationToken) {
                return;
            }

            this.setPipeline(
                [stage],
                completed,
                stages
            );

            await new Promise((resolve) => {
                window.setTimeout(resolve, delay);
            });

            completed.push(stage);
        }

        if (token === this.animationToken) {
            this.setPipeline(
                [],
                completed,
                stages
            );
        }
    }
}