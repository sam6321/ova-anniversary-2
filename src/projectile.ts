import * as THREE from 'three';
import {defaultValue, Range} from "./utils";
import {Update, UpdateList} from "./update";
import {GridObject} from "./collision";
import {Enemy} from "./enemy";
import {Player} from "./player";
import {ParticlesEnemyHit, ParticlesEnemyHitOptions} from "./particles_enemy_hit";

export interface ProjectileOptions {
    minSpeed?: number;
    maxSpeed?: number;
    acceleration?: number;
    radius?: number;
    destroyDistance?: number;
    spread?: number;
    destroyable?: boolean;
    canDestroyProjectile?: boolean;
    canDamagePlayer?: boolean;
    canDamageNPC?: boolean;
    damage?: number;
}

const tempVec1 = new THREE.Vector3();
const tempVec2 = new THREE.Vector3();
const up = new THREE.Vector3(0, 1, 0);
const tempQuaternion1 = new THREE.Quaternion();

export class Projectile extends Update {

    public readonly object: THREE.Object3D;
    public readonly collider: GridObject<Projectile>;

    public readonly destroyable: boolean = false;
    public readonly canDestroyProjectile: boolean = false;
    public readonly canDamagePlayer: boolean = false;
    public readonly canDamageNPC: boolean = false;

    public minSpeed = 80.0;
    public maxSpeed = 120.0;
    public acceleration = 1.0;
    public destroyDistance = 100;
    public damage = 10;

    private velocity = new THREE.Vector3();

    constructor(list: UpdateList, object: THREE.Object3D, position: THREE.Vector3, direction: THREE.Vector3, options?: ProjectileOptions) {
        super(list);

        let spread = Math.PI / 32;
        let radius = 1;
        if(options) {
            radius = defaultValue(options.radius, radius);
            this.minSpeed = defaultValue(options.minSpeed, this.minSpeed);
            this.maxSpeed = defaultValue(options.maxSpeed, this.maxSpeed);
            this.acceleration = defaultValue(options.acceleration, this.acceleration);
            this.destroyDistance = defaultValue(options.destroyDistance, this.destroyDistance);
            this.destroyable = defaultValue(options.destroyable, this.destroyable);
            this.canDestroyProjectile = defaultValue(options.canDestroyProjectile, this.canDestroyProjectile);
            this.canDamagePlayer = defaultValue(options.canDamagePlayer, this.canDamagePlayer);
            this.canDamageNPC = defaultValue(options.canDamageNPC, this.canDamageNPC);
            this.damage = defaultValue(options.damage, this.damage);
            spread = defaultValue(options.spread, spread);
        }

        this.collider = list.grid.create(this, position, radius);

        object.position.copy(position);
        tempVec1
            .copy(direction)
            .applyQuaternion(tempQuaternion1.setFromAxisAngle(up, THREE.Math.randFloat(-spread / 2, spread / 2)));
        tempVec2
            .copy(tempVec1)
            .add(position);

        object.lookAt(tempVec2);
        list.root.add(object);

        this.object = object;

        this.velocity
            .copy(tempVec1)
            .normalize()
            .multiplyScalar(this.minSpeed);

        // Look in the direction that it's moving. This should only need to be set on spawn.
        tempVec1
            .copy(this.velocity)
            .add(this.object.position);
        this.object.lookAt(tempVec1);
    }

    dispose() {
        this.list.root.remove(this.object);
        this.list.grid.destroy(this.collider);
    }

    private shouldDestroy(): boolean {
        tempVec1
            .copy(this.object.position)
            .project(this.list.camera);

        return tempVec1.x < -1.1 || tempVec1.x > 1.1 || tempVec1.y < -1.1 || tempVec1.y > 1.1;
    }

    spawnParticles(hit: THREE.Vector3, projectile: boolean) {
        tempVec1
            .copy(this.velocity)
            .negate()
            //.subVectors(this.object.position, hit)
            .normalize();
        const params: ParticlesEnemyHitOptions = projectile ?
            {
                spread: 360,
                speed: new Range(80, 120),
                lifetime: new Range(0.1, 0.3),
                colour: "red"
            }:
            {};
        this.list.create(ParticlesEnemyHit, this.object.position, tempVec1, params);
    }

    update(time: number, dt: number) {
        tempVec1
            .copy(this.velocity)
            .normalize();
        this.velocity
            .addScaledVector(tempVec1, this.acceleration * dt)
            .clampLength(this.minSpeed, this.maxSpeed);
        this.object.position.addScaledVector(this.velocity, dt);

        this.collider.position.copy(this.object.position);
        this.collider.update();

        if(this.shouldDestroy()) {
            this.list.remove(this);
        }
        else if(!this.list.globals.pause) {
            const objects = this.list.grid.search(this.collider.position, this.collider.radius);
            for(const object of objects) {
                let destroy = false;
                if(this.canDestroyProjectile &&
                    object.object instanceof Projectile &&
                    object.object.destroyable) {
                    this.spawnParticles(object.object.object.position, true);
                    this.list.remove(object.object);
                    destroy = true;
                }
                else if(this.canDamageNPC &&
                    object.object instanceof Enemy) {
                    this.spawnParticles(object.object.mesh.position, false);
                    object.object.damage(this.damage);
                    destroy = true;
                }
                else if(this.canDamagePlayer &&
                    object.object instanceof Player) {
                    // TODO: DESTROY THE PLAYER
                    object.object.damage(this.damage);
                    destroy = true;
                }
                if(destroy) {
                    this.list.remove(this);
                    break;
                }
            }
        }
    }
}