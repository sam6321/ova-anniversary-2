import * as THREE from 'three';

export const particleVertexShared = `
attribute vec3 translation;
attribute vec3 colour;
attribute float rotation;
attribute float scale;
attribute float time;
attribute float active;

/**
 * Rotate a 2d position by the given angle.
 */
vec2 rotate(vec2 p, float angle) {
    float sr = sin(angle);
    float cr = cos(angle);
    return vec2(p.x * cr - p.y * sr, p.x * sr + p.y * cr);
}

/**
 * Apply a translation, rotation, and scale to a point.
 */
vec3 applyTransforms(vec3 p, vec3 t, float r, float s) {
    // Rotate (only around z axis), then scale, then translate
    return vec3(rotate(p.xy, r), p.z) * s + t;
}
`;

export class Particle {
    readonly translation = new THREE.Vector3();
    readonly colour = new THREE.Color("white");
    rotation = 0;
    scale = 1;
    time = 0;
    active = false;
    readonly index: number;

    private readonly translationAttribute: THREE.BufferAttribute;
    private readonly colourAttribute: THREE.BufferAttribute;
    private readonly rotationAttribute: THREE.BufferAttribute;
    private readonly scaleAttribute: THREE.BufferAttribute;
    private readonly timeAttribute: THREE.BufferAttribute;
    private readonly activeAttribute: THREE.BufferAttribute;

    constructor(index: number, geometry: ParticleGeometry) {
        this.index = index;
        this.translationAttribute = geometry.getAttribute("translation") as THREE.BufferAttribute;
        this.colourAttribute = geometry.getAttribute("colour") as THREE.BufferAttribute;
        this.rotationAttribute = geometry.getAttribute("rotation") as THREE.BufferAttribute;
        this.scaleAttribute = geometry.getAttribute("scale") as THREE.BufferAttribute;
        this.timeAttribute = geometry.getAttribute("time") as THREE.BufferAttribute;
        this.activeAttribute = geometry.getAttribute("active") as THREE.BufferAttribute;
        this.update();
    }

    update() {
        const {translation, colour, rotation, scale, time, index, active,
            translationAttribute, colourAttribute, rotationAttribute, scaleAttribute, timeAttribute, activeAttribute} = this;

        translationAttribute.setXYZ(index, translation.x, translation.y, translation.z);
        translationAttribute.needsUpdate = true;

        colourAttribute.setXYZ(index, colour.r, colour.g, colour.b);
        colourAttribute.needsUpdate = true;

        rotationAttribute.setX(index, rotation);
        rotationAttribute.needsUpdate = true;

        scaleAttribute.setX(index, scale);
        scaleAttribute.needsUpdate = true;

        timeAttribute.setX(index, time);
        timeAttribute.needsUpdate = true;

        activeAttribute.setX(index, active ? 1 : 0);
        activeAttribute.needsUpdate = true;
    }
}

export class ParticleGeometry extends THREE.InstancedBufferGeometry {

    readonly particles: readonly Particle[];

    constructor(count: number) {
        super();

        this.maxInstancedCount = count;
        this.setAttribute("translation", new THREE.InstancedBufferAttribute(new Float32Array(count * 3), 3).setUsage(THREE.DynamicDrawUsage));
        this.setAttribute("colour", new THREE.InstancedBufferAttribute(new Float32Array(count * 3), 3).setUsage(THREE.DynamicDrawUsage));
        this.setAttribute("rotation", new THREE.InstancedBufferAttribute(new Float32Array(count * 4), 4).setUsage(THREE.DynamicDrawUsage));
        this.setAttribute("scale", new THREE.InstancedBufferAttribute(new Float32Array(count), 1).setUsage(THREE.DynamicDrawUsage));
        this.setAttribute("time", new THREE.InstancedBufferAttribute(new Float32Array(count), 1).setUsage(THREE.DynamicDrawUsage));
        this.setAttribute("active", new THREE.InstancedBufferAttribute(new Float32Array(count), 1).setUsage(THREE.DynamicDrawUsage));

        const particles = [];
        for(let i = 0; i < count; i++) {
            particles.push(new Particle(i, this));
        }
        this.particles = particles;
    }
}

export class ParticleMesh extends THREE.Mesh {

    private start = 0;

    constructor(particleGeometry: ParticleGeometry, particleMaterial: THREE.Material) {
        super(particleGeometry, particleMaterial);
        this.frustumCulled = false;
    }

    get particles() {
        return (this.geometry as ParticleGeometry).particles;
    }

    simulate(time: number, dt: number, simulate: (p: Particle, i: number, start: number) => boolean) {
        const {particles} = this;
        if(this.start === 0) {
            this.start = time;
        }
        let alive = false;
        for(let i = 0, len = particles.length; i < len; i++) {
            alive = simulate(particles[i], i, this.start) || alive;
        }
        return alive;
    }
}