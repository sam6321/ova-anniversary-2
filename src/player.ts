import * as THREE from 'three';
import {defaultValue, Range} from "./utils";
import {Action} from "./input";
import {Update, UpdateList} from "./update";
import {Projectile} from "./projectile";
import {ParticlesEnemyHit} from "./particles_enemy_hit";
import {GridObject} from "./collision";
interface PlayerMovementOptions {
    movementSpeed?: number;
    dragSpeed?: number;
}

const tempVec1 = new THREE.Vector3();
const tempVec2 = new THREE.Vector3();
const tempQuat1 = new THREE.Quaternion();

class PlayerMovement {
    public movementSpeed = 30;
    public dragSpeed = 10;

    private readonly object: THREE.Object3D;
    private readonly list: UpdateList;

    private velocity = new THREE.Vector3();

    constructor(list: UpdateList, object: THREE.Object3D, options?: PlayerMovementOptions) {
        this.object = object;
        this.list = list;

        if (options) {
            this.movementSpeed = defaultValue(options.movementSpeed, this.movementSpeed);
            this.dragSpeed = defaultValue(options.dragSpeed, this.dragSpeed);
        }
    }

    update(dt: number) {
        const {input} = this.list;
        const up = input.isDown(Action.up) ? -1 : 0;
        const left = input.isDown(Action.left) ? -1 : 0;
        const right = input.isDown(Action.right) ? 1 : 0;
        const down = input.isDown(Action.down) ? 1 : 0;

        this.object.position.addScaledVector(
            tempVec1.set(right + left, 0, up + down).normalize(),
            dt * this.movementSpeed
        );
        /*
        const acceleration = tempVec1.set(right + left, 0, up + down).normalize();

        this.velocity.addScaledVector(acceleration, dt * this.accelerationSpeed);
        tempVec1.copy(this.velocity)
            .negate()
            .normalize()
            .multiplyScalar(this.dragSpeed * dt)
            .clampLength(0, this.velocity.length());
        this.velocity.add(tempVec1);

        this.object.position.addScaledVector(this.velocity, dt);

        tempVec1.copy(this.velocity)
            .normalize()
            .add(this.object.position);
        this.object.lookAt(tempVec1);*/
    }
}

interface PlayerWeaponOptions {
    fireDelay?: number;
}

class PlayerWeapon {
    public fireDelay = 0.1;

    private readonly list: UpdateList;
    private readonly object: THREE.Object3D;
    private readonly mouseGround: THREE.Vector3;
    private readonly projectileGeometry = new THREE.BoxBufferGeometry(0.5, 0.5, 1);
    private readonly projectileMaterial = new THREE.MeshBasicMaterial({color: "red"});

    private lastFire = 0;
    public killed = 0;

    constructor(list: UpdateList, object: THREE.Object3D, mouseGround: THREE.Vector3, options?: PlayerWeaponOptions) {
        this.list = list;
        this.object = object;
        this.mouseGround = mouseGround;

        this.projectileGeometry.computeBoundingSphere();

        if (options) {
            this.fireDelay = defaultValue(options.fireDelay, this.fireDelay);
        }
    }

    onEnemyKill() {
        this.killed++;
    }

    createProjectile(direction: THREE.Vector3) {
        this.list.create(Projectile, new THREE.Mesh(this.projectileGeometry, this.projectileMaterial), this.object.position, direction, {
            radius: 2,
            canDestroyProjectile: true,
            canDamageNPC: true,
            damage: 10
        });
    }

    pointAtMouse() {
        return tempVec1
            .subVectors(this.mouseGround, this.object.position)
            .normalize();
    }

    update(time: number) {
        if(time > this.lastFire + this.fireDelay && this.list.input.isDown(Action.fire)) {

            if(this.killed < 4) {
                this.createProjectile(this.pointAtMouse());
            }
            else if(this.killed < 8) {
                this.createProjectile(
                    this.pointAtMouse()
                        .applyQuaternion(
                            tempQuat1.setFromAxisAngle(
                                tempVec2.set(0, 1, 0),
                                -THREE.Math.degToRad(5)
                            )
                        )
                );

                this.createProjectile(
                    this.pointAtMouse()
                        .applyQuaternion(
                            tempQuat1.setFromAxisAngle(
                                tempVec2.set(0, 1, 0),
                                THREE.Math.degToRad(5)
                            )
                        )
                );
            }
            else {
                this.createProjectile(this.pointAtMouse());

                this.createProjectile(
                    this.pointAtMouse()
                        .applyQuaternion(
                            tempQuat1.setFromAxisAngle(
                                tempVec2.set(0, 1, 0),
                                -THREE.Math.degToRad(10)
                            )
                        )
                );

                this.createProjectile(
                    this.pointAtMouse()
                        .applyQuaternion(
                            tempQuat1.setFromAxisAngle(
                                tempVec2.set(0, 1, 0),
                                THREE.Math.degToRad(10)
                            )
                        )
                );
            }

            this.lastFire = time;
        }
    }
}

const box = new THREE.BoxBufferGeometry(1, 1, 1);
box.computeBoundingSphere();

export class Player extends Update {

    public readonly mesh = new THREE.Mesh(
        box,
        new THREE.MeshBasicMaterial({color: "green"})
    );

    private readonly playerMovement: PlayerMovement;
    private readonly playerWeapon: PlayerWeapon;
    private readonly collider: GridObject<Player>;

    public readonly relativeVelocity = new THREE.Vector3();

    private _health = 10;

    constructor(list: UpdateList, mouseGround: THREE.Vector3, options?: PlayerMovementOptions & PlayerWeaponOptions) {
        super(list);
        this.playerMovement = new PlayerMovement(list, this.mesh, options);
        this.playerWeapon = new PlayerWeapon(list, this.mesh, mouseGround, options);
        this.list.root.add(this.mesh);

        this.mesh.geometry.computeBoundingSphere();

        this.collider = list.grid.create(this, this.mesh.position, box.boundingSphere.radius);
    }

    get health() {
        return this._health;
    }

    get killed() {
        return this.playerWeapon.killed;
    }

    onEnemyKill() {
        this.playerWeapon.onEnemyKill();
    }

    damage(damage: number) {
        this._health = Math.max(this._health - damage, 0);

        if(this._health === 0) {
            this.die();
        }
    }

    die() {
        // Teleport over to 0, 0, 0 after puffing out some particles
        this.list.create(ParticlesEnemyHit, this.mesh.position, tempVec1.set(0, 0, 1), {
            spread: 360,
            count: new Range(40, 50),
            speed: new Range(60, 80),
            lifetime: new Range(0.5, 1.0),
            spawnDelay: new Range(0.05, 0.1),
            colour: "green"
        });
        this.mesh.position.set(0, 0, 0);
        this._health = 10;
    }

    dispose() {
        this.list.root.remove(this.mesh);
        this.list.grid.destroy(this.collider);
    }

    update(time: number, dt: number) {
        if(!this.list.globals.pause) {
            this.playerMovement.update(dt);
            this.playerWeapon.update(time);
        }
        this.relativeVelocity
            .subVectors(this.mesh.position, this.collider.position)
            .divideScalar(dt);
        this.collider.position.copy(this.mesh.position);
        this.collider.update();
    }
}