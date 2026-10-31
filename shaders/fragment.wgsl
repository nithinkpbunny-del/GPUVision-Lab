struct FilterSettings {
    mode: u32,
    intensity: f32,
    width: u32,
    height: u32,
};

@group(0) @binding(0) var imageSampler: sampler;
@group(0) @binding(1) var imageTexture: texture_2d<f32>;
@group(0) @binding(2) var<uniform> settings: FilterSettings;

fn luminance(rgb: vec3<f32>) -> f32 {
    return dot(rgb, vec3<f32>(0.299, 0.587, 0.114));
}

fn thermal(value: f32) -> vec3<f32> {
    if (value < 0.25) {
        return mix(vec3<f32>(0.0, 0.0, 0.25), vec3<f32>(0.0, 0.0, 1.0), value * 4.0);
    }
    if (value < 0.5) {
        return mix(vec3<f32>(0.0, 0.0, 1.0), vec3<f32>(0.0, 1.0, 1.0), (value - 0.25) * 4.0);
    }
    if (value < 0.75) {
        return mix(vec3<f32>(0.0, 1.0, 1.0), vec3<f32>(1.0, 1.0, 0.0), (value - 0.5) * 4.0);
    }
    return mix(vec3<f32>(1.0, 1.0, 0.0), vec3<f32>(1.0, 0.0, 0.0), (value - 0.75) * 4.0);
}

@fragment
fn fragmentMain(@location(0) uv: vec2<f32>) -> @location(0) vec4<f32> {
    let color = textureSample(imageTexture, imageSampler, uv);
    var result = color.rgb;

    switch settings.mode {
        case 1u: {
            let gray = luminance(color.rgb);
            result = vec3<f32>(gray);
        }
        case 2u: { result = vec3<f32>(1.0) - color.rgb; }
        case 3u: {
            result = clamp(vec3<f32>(
                dot(color.rgb, vec3<f32>(0.393, 0.769, 0.189)),
                dot(color.rgb, vec3<f32>(0.349, 0.686, 0.168)),
                dot(color.rgb, vec3<f32>(0.272, 0.534, 0.131))
            ), vec3<f32>(0.0), vec3<f32>(1.0));
        }
        case 4u: { result = clamp(color.rgb + vec3<f32>(settings.intensity), vec3<f32>(0.0), vec3<f32>(1.0)); }
        case 5u: {
            result = clamp((color.rgb - vec3<f32>(0.5)) * (1.0 + settings.intensity) + vec3<f32>(0.5), vec3<f32>(0.0), vec3<f32>(1.0));
        }
        case 6u: { result = thermal(luminance(color.rgb)); }
        default: {}
    }
    return vec4<f32>(result, color.a);
}
