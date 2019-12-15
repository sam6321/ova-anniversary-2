import * as THREE from 'three';
import {Update, UpdateList} from "./update";
import {defaultValue, Range} from './utils';
import {Particle, ParticleGeometry, ParticleMesh, particleVertexShared} from "./particles";


const box = new THREE.BoxBufferGeometry(0.5, 0.5, 0.5);
class BoxParticleGeometry extends ParticleGeometry {
    constructor(count: number) {
        super(count);
        this.setAttribute("position", box.getAttribute("position"));
        this.setIndex(box.getIndex());
    }
}

class BoxParticleMaterial extends THREE.ShaderMaterial {
    static vertexShader = /*glsl*/`
${particleVertexShared}

varying vec3 vColour;

void main() {
    if(active == 0.0) {
        gl_Position = vec4(0.0);
        return;
    }
    
    vec3 p = applyTransforms(position, translation, -rotation, scale);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
    vColour = colour;
}
`;

    static fragmentShader = /*glsl*/`
varying vec3 vColour;

void main() {
    if(gl_FragCoord == vec4(0.0)) {
        discard;
    }

    gl_FragColor = vec4(vColour, 1.0);
}
`;

    constructor(params: THREE.ShaderMaterialParameters={}) {
        const p: THREE.ShaderMaterialParameters = {
            vertexShader: BoxParticleMaterial.vertexShader,
            fragmentShader: BoxParticleMaterial.fragmentShader,
        };
        super(Object.assign(p, params));
    }
}

export interface ParticlesEnemyHitOptions {
    count?: Range;
    spread?: number;
    speed?: Range;
    lifetime?: Range;
    spawnDelay?: Range;
    colour?: THREE.Color | number | string;
}

const defaultCount = new Range(7, 12);
const defaultSpeed = new Range(30, 50);
const defaultLifetime = new Range(1, 2);
const defaultSpawnDelay = new Range(0.01, 0.02);

interface EnemyHitParticle {
    velocity: THREE.Vector3;
    spawn: number;
    die: number;
}

const tempQuat = new THREE.Quaternion();
const up = new THREE.Vector3(0, 1, 0);

export class ParticlesEnemyHit extends Update {

    private readonly particleStates: EnemyHitParticle[] = [];
    private readonly particleMesh: ParticleMesh;

    constructor(list: UpdateList, position: THREE.Vector3, normal: THREE.Vector3, options?: ParticlesEnemyHitOptions) {
        super(list);

        let countRange = defaultCount;
        let speedRange = defaultSpeed;
        let lifetimeRange = defaultLifetime;
        let spawnDelayRange = defaultSpawnDelay;
        let spread = 65;
        let colour: THREE.Color | string | number = 0xFFFFFF;

        if(options) {
            countRange = defaultValue(options.count, countRange);
            speedRange = defaultValue(options.speed, speedRange);
            lifetimeRange = defaultValue(options.lifetime, lifetimeRange);
            spawnDelayRange = defaultValue(options.spawnDelay, spawnDelayRange);
            spread = defaultValue(options.spread, spread);
            colour = defaultValue(options.colour, colour);
        }

        const colourObject = new THREE.Color(colour);

        spread = THREE.Math.degToRad(spread) / 2.0;

        const count = countRange.randomInt();
        this.particleMesh = new ParticleMesh(
            new BoxParticleGeometry(count),
            new BoxParticleMaterial()
        );
        for(const particle of this.particleMesh.particles) {
            tempQuat.setFromAxisAngle(up, THREE.Math.randFloat(-spread, spread));
            const velocity = normal
                .clone()
                .multiplyScalar(speedRange.random())
                .applyQuaternion(tempQuat);
            const spawn = list.time + spawnDelayRange.random();
            const die = spawn + lifetimeRange.random();
            this.particleStates.push({velocity, spawn, die});
            particle.rotation = up.angleTo(velocity);
            particle.translation.copy(position);
            particle.active = false;
            particle.colour.copy(colourObject);
        }

        this.list.root.add(this.particleMesh);
    }

    dispose() {
        this.list.root.remove(this.particleMesh);
        this.particleMesh.geometry.dispose();
        (this.particleMesh.material as BoxParticleMaterial).dispose();
        console.log("Destroying particles");
    }

    private readonly simulate = (p: Particle, i: number, start: number) => {
        const state = this.particleStates[i];
        const active = p.active;
        p.active = this.list.time >= state.spawn && this.list.time <= state.die;
        if(p.active) {
            p.translation.addScaledVector(state.velocity, this.list.dt);
        }
        if(p.active || (active && !p.active)) {
            p.update();
        }

        return this.list.time <= state.die;
    };

    update(time: number, dt: number): void {
        if(!this.particleMesh.simulate(time, dt, this.simulate)) {
            this.list.remove(this);
        }
    }
}