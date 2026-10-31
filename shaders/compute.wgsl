struct ComputeSettings {
    mode: u32,
    intensity: f32,
    width: u32,
    height: u32,
};

@group(0) @binding(0) var inputTexture: texture_2d<f32>;
@group(0) @binding(1) var outputTexture: texture_storage_2d<rgba8unorm, write>;
@group(0) @binding(2) var<uniform> settings: ComputeSettings;

fn safeLoad(x: i32, y: i32) -> vec4<f32> {
    let maximum = vec2<i32>(i32(settings.width) - 1, i32(settings.height) - 1);
    return textureLoad(inputTexture, clamp(vec2<i32>(x, y), vec2<i32>(0), maximum), 0);
}

fn luminance(rgb: vec3<f32>) -> f32 {
    return dot(rgb, vec3<f32>(0.299, 0.587, 0.114));
}

fn sobel(x: i32, y: i32) -> f32 {
    let tl = luminance(safeLoad(x - 1, y - 1).rgb);
    let tc = luminance(safeLoad(x,     y - 1).rgb);
    let tr = luminance(safeLoad(x + 1, y - 1).rgb);
    let ml = luminance(safeLoad(x - 1, y).rgb);
    let mr = luminance(safeLoad(x + 1, y).rgb);
    let bl = luminance(safeLoad(x - 1, y + 1).rgb);
    let bc = luminance(safeLoad(x,     y + 1).rgb);
    let br = luminance(safeLoad(x + 1, y + 1).rgb);
    let gx = -tl + tr - 2.0 * ml + 2.0 * mr - bl + br;
    let gy = -tl - 2.0 * tc - tr + bl + 2.0 * bc + br;
    return clamp(length(vec2<f32>(gx, gy)), 0.0, 1.0);
}

fn gaussianBlur(x: i32, y: i32) -> vec4<f32> {
    var sum = safeLoad(x - 1, y - 1) + 2.0 * safeLoad(x, y - 1) + safeLoad(x + 1, y - 1);
    sum += 2.0 * safeLoad(x - 1, y) + 4.0 * safeLoad(x, y) + 2.0 * safeLoad(x + 1, y);
    sum += safeLoad(x - 1, y + 1) + 2.0 * safeLoad(x, y + 1) + safeLoad(x + 1, y + 1);
    return sum / 16.0;
}

@compute @workgroup_size(8, 8)
fn computeMain(@builtin(global_invocation_id) id: vec3<u32>) {
    if (id.x >= settings.width || id.y >= settings.height) { return; }
    let x = i32(id.x);
    let y = i32(id.y);
    var output = safeLoad(x, y);

    switch settings.mode {
        case 0u: { output = gaussianBlur(x, y); }
        case 1u: {
            let edge = sobel(x, y);
            output = vec4<f32>(vec3<f32>(edge), 1.0);
        }
        case 2u: {
            let source = safeLoad(x, y);
            let quantized = floor(source.rgb * 5.0 + vec3<f32>(0.5)) / 5.0;
            let ink = 1.0 - smoothstep(0.18, 0.42, sobel(x, y));
            output = vec4<f32>(quantized * ink, source.a);
        }
        default: {}
    }
    textureStore(outputTexture, vec2<i32>(x, y), output);
}
