GPUVision Lab

GPU-Accelerated Parallel Image Processing Using WebGPU

GPUVision Lab is a browser-based image processing application that demonstrates GPU-accelerated parallel computing using WebGPU and WGSL (WebGPU Shading Language).

The application implements image processing algorithms using fragment and compute shaders, enabling multiple image pixels to be processed concurrently on the GPU. It provides an interactive environment to explore GPU execution, shader-based computation, workgroups, and parallel processing.

Key Features

* GPU-accelerated image processing using WebGPU.
* Implementation of fragment and compute shader pipelines.
* Ten image processing operations.
* Interactive image upload and real-time output preview.
* GPU execution pipeline visualization.
* Processing time and workload statistics.
* Workgroup and work-item configuration details.
* Export processed images in PNG format.

Image Processing Operations

Operation	Shader Type
Original	Fragment
Grayscale	Fragment
Negative	Fragment
Sepia	Fragment
Brightness Adjustment	Fragment
Contrast Adjustment	Fragment
Gaussian Blur	Compute
Sobel Edge Detection	Compute
Cartoon Effect	Compute
Thermal Vision	Fragment

Technical Architecture

The application uses two GPU processing approaches:

1. Fragment Shader Pipeline

Fragment shaders process image data during the rendering pipeline. Each fragment is independently evaluated by the GPU, making this approach suitable for per-pixel visual transformations.

Implemented operations include grayscale conversion, negative transformation, sepia, brightness, contrast, and thermal effects.

2. Compute Shader Pipeline

Compute shaders perform general-purpose parallel computations outside the traditional graphics rendering pipeline.

They are used for computational image processing operations such as Gaussian blur, Sobel edge detection, and cartoon effects.

The compute shaders use a workgroup configuration of 8 × 8 (64 work items per workgroup).

Processing Workflow

Input Image
    |
    v
GPU Texture Upload
    |
    v
Vertex Shader
    |
    +----------------------+
    |                      |
    v                      v
Fragment Shader       Compute Shader
    |                      |
    |                      v
    |                 Fragment Pass
    |                      |
    +----------+-----------+
               |
               v
         Output Image

Technology Stack

Technology	Purpose
HTML5	Application structure
CSS3	Interface styling
JavaScript (ES Modules)	Application logic and GPU resource management
WebGPU	GPU programming interface
WGSL	Shader implementation
Compute Shaders	Parallel image processing
Fragment Shaders	Pixel-level image transformations

Project Structure

GPUVision-Lab/
│
├── index.html
├── style.css
│
├── js/
│   ├── app.js
│   ├── gpu.js
│   ├── ui.js
│   ├── filters.js
│   └── imageLoader.js
│
├── shaders/
│   ├── vertex.wgsl
│   ├── fragment.wgsl
│   └── compute.wgsl
│
└── README.md

Installation and Setup

Prerequisites

* A WebGPU-compatible browser (Google Chrome or Microsoft Edge).
* Python 3.
* A compatible GPU and operating system.

Run Locally

1. Clone the repository

git clone https://github.com/nithinkpbunny-del/GPUVision-Lab.git

2. Navigate to the project directory

cd GPUVision-Lab

3. Start a local HTTP server

python3 -m http.server 8000

4. Open the application

Navigate to:

http://localhost:8000

WebGPU requires a secure context. Access the application through localhost rather than opening the HTML file directly.

Hardware and Development Environment

The application was developed and tested in the following environment:

* Device: Apple MacBook Air (M4)
* GPU Backend: Metal 3
* Graphics API: WebGPU
* Shader Language: WGSL

Performance measurements may vary depending on hardware, browser implementation, image resolution, and processing workload.

Learning Outcomes

This project demonstrates practical concepts in:

* GPU-based parallel computing.
* SIMD execution principles.
* GPU compute and rendering pipelines.
* Fragment and compute shader programming.
* Workgroups and work items.
* Parallel image processing.
* WebGPU resource and texture management.

Future Scope

* CPU and GPU execution time comparison.
* Additional image processing algorithms.
* Adjustable filter parameters.
* Video processing using GPU compute shaders.
* Performance evaluation across different GPU architectures.

Academic Information

Developed as part of the Parallel Computing course to demonstrate practical applications of GPU-based parallel processing.

⸻

GPUVision Lab
An exploration of parallel computing through GPU-accelerated image processing.