import * as THREE from 'three';
import {Update, UpdateList} from "./update";
import {GridObject} from "./collision";
import {defaultValue, randomElement, randomIndex, Range, removeArray} from "./utils";
import {Player} from "./player";
import {Projectile, ProjectileOptions} from "./projectile";
import {ParticlesEnemyHit} from "./particles_enemy_hit";

interface OffsetInfo {
    offset: THREE.Vector3;
    used: boolean;
}

class LabelPositioner {

    public readonly div: HTMLDivElement;
    private readonly position = new THREE.Vector3();
    private readonly lastPosition = new THREE.Vector3();
    private rect: DOMRect | ClientRect;
    private readonly labelChangeTime: Range;
    private readonly quotes: readonly string[];
    private readonly offsets: readonly OffsetInfo[];

    private _text = "";
    private start = 0;
    private end = 0;
    private lastOffsetInfo?: OffsetInfo;

    private finishTime = 0;

    constructor(div: HTMLDivElement, labelChangeTime: Range, quotes: readonly string[], offsets: readonly OffsetInfo[]) {
        this.div = div;
        this.labelChangeTime = labelChangeTime;
        this.quotes = quotes;
        this.offsets = offsets;
        div.style.position = "absolute";
        div.style.color = "white";
        div.style.userSelect = "none";
        this.rect = div.getBoundingClientRect();
    }

    getScrollText(time: number) {
        const pos = Math.floor(THREE.Math.mapLinear(time, this.start, this.end, 0, this._text.length + 1));
        return this._text.substring(0, pos);
    }

    isComplete(time: number) {
        return time >= this.end;
    }

    get text() {
        return this._text;
    }

    setText(text: string, now: number, period: number) {
        this._text = text;
        this.start = now;
        this.end = now + period;
        this.div.innerText = "";
    }

    updatePosition(position: THREE.Vector3, camera: THREE.Camera) {
        this.position.copy(position);
        if(this.lastOffsetInfo) {
            this.position.add(this.lastOffsetInfo.offset);
        }
        this.position.project(camera);
        toScreenSpace(this.position);
        this.position.z = 0;
        this.updatePositionInternal(false);
    }

    update(time: number) {
        if(this.isComplete(time) && time >= this.finishTime) {
            const newFinishTime = this.labelChangeTime.random();

            if(this.lastOffsetInfo) {
                this.lastOffsetInfo.used = false;
            }

            let index = randomIndex(this.offsets);
            let count = 0;
            while(this.offsets[index].used) {
                index = (index + 1) % this.offsets.length;
                count++;
                if(count === this.offsets.length) {
                    index = 0;
                    break;
                }
            }

            this.lastOffsetInfo = this.offsets[index];
            this.lastOffsetInfo.used = true;

            this.setText(randomElement(this.quotes), time, 0.5);
            this.finishTime = time + newFinishTime;
        }

        const text = this.getScrollText(time);
        if(text !== this.div.innerText) {
            this.div.innerText = text;
            this.updateRect();
            this.updatePositionInternal(true);
        }
    }

    private updatePositionInternal(force: boolean) {
        if(!this.lastPosition.equals(this.position) || force) {
            this.lastPosition.copy(this.position);
            const halfWidth = this.rect.width / 2;
            const halfHeight = this.rect.height / 2;
            this.div.style.transform = `translate(${this.position.x - halfWidth}px, ${this.position.y - halfHeight}px)`;
        }
    }

    private updateRect() {
        this.rect = this.div.getBoundingClientRect();
    }
}

function toScreenSpace(vector: THREE.Vector3) {
    vector.x = (vector.x + 1) / 2 * window.innerWidth;
    vector.y = -(vector.y - 1) / 2 * window.innerHeight;
}

const box = new THREE.BoxBufferGeometry(10, 10, 10);
box.computeBoundingSphere();

const bigBox = new THREE.BoxBufferGeometry(15, 15, 15);
bigBox.computeBoundingSphere();

const projectileGeometry = new THREE.SphereBufferGeometry(2, 16, 16);
const projectileMaterial = new THREE.MeshBasicMaterial({color: "red"});

const fullHealthColour = new THREE.Color(0xFFFFFF);
const noHealthColour = new THREE.Color(0xFFFF00);
const flashColour = new THREE.Color(0xFF0000);

const up = new THREE.Vector3(0, 1, 0);
const tempQuat1 = new THREE.Quaternion();
const tempVec1 = new THREE.Vector3();
const tempVec2 = new THREE.Vector3();

const defaultLabelChangeTime = new Range(5, 10);
const defaultSwitchAttackTime = new Range(5, 10);

export enum AttackMode {
    Direct,
    Burst,
    Snipe,
    Clump,
    RandomLength,
    Round,
    Length
}

export class EnemyOptions {
    quotes?: string[];
    xRotateSpeed?: number;
    yRotateSpeed?: number;
    health?: number;
    projectile?: Update;
    shootDistance?: number;
    labelChangeTime?: Range;
    switchAttackTime?: Range;
    switchAttacks?: boolean;
    randomStartingAttack?: boolean;
    startingAttack?: AttackMode;
    boss?: boolean;
    onDie?(enemy: Enemy): void;
}

export class Enemy extends Update {

    public readonly texture: THREE.Texture | null;
    public readonly material: THREE.MeshBasicMaterial;
    public readonly mesh: THREE.Mesh;
    public readonly player: Player;

    public switchAttacks = false;

    private readonly collider: GridObject<Enemy>;
    private readonly startHealth: number;
    private _health = 100;
    private xRotateSpeed = 15;
    private yRotateSpeed = 15;
    private projectile?: Update;
    private lastFire = 0;

    private fireDelay = 0.5;

    private fireDelayRound = 0.2;
    private roundNumShots = 12;

    private fireDelayBurst = 1;
    private burstNumShots = 8;
    private burstDelayBetweenShots = 0.1;
    private burstLastShotFired = 0;
    private burstShotsFired = 0;

    private shootDistance = 100;

    private snipeShootDistance = 150;
    private fireDelaySnipe = 2;

    private clumpAmount = 8;
    private fireDelayClump = 2;

    private flashStart = 0;
    private flashEnd = 0;

    private boss = false;

    private onDie?(enemy: Enemy): void;

    private attackMode = AttackMode.Direct;
    private nextSwitchAttack = 0;
    private readonly switchAttackTime = defaultSwitchAttackTime;

    private readonly labelContainer: HTMLDivElement;
    private readonly labelLeft: LabelPositioner;
    private readonly labelRight: LabelPositioner;

    private nodes: THREE.Object3D[] = [];

    private soffset = THREE.Math.randFloat(-Math.PI, Math.PI);
    private coffset = THREE.Math.randFloat(-Math.PI, Math.PI);

    private readonly offsets: OffsetInfo[] = [
        {offset: new THREE.Vector3(-15, 0, 15), used: false},
        {offset: new THREE.Vector3(15, 0, -15), used: false},
        {offset: new THREE.Vector3(15, 0, 15), used: false},
        {offset: new THREE.Vector3(-15, 0, -15), used: false},
    ];

    constructor(list: UpdateList, position: THREE.Vector3, texture: THREE.Texture | null, player: Player, labelContainer: HTMLDivElement, nodes: THREE.Object3D[], options?: EnemyOptions) {
        super(list);

        let labelChangeTime = defaultLabelChangeTime;
        let quotes = [""];
        if(options) {
            this._health = defaultValue(options.health, this._health);
            this.xRotateSpeed = defaultValue(options.xRotateSpeed, this.xRotateSpeed);
            this.yRotateSpeed = defaultValue(options.yRotateSpeed, this.yRotateSpeed);
            this.projectile = defaultValue(options.projectile, this.projectile);
            this.shootDistance = defaultValue(options.shootDistance, this.shootDistance);
            labelChangeTime = defaultValue(options.labelChangeTime, labelChangeTime);
            this.switchAttackTime = defaultValue(options.switchAttackTime, this.switchAttackTime);
            this.attackMode = defaultValue(options.startingAttack, this.attackMode);
            this.switchAttacks = defaultValue(options.switchAttacks, this.switchAttacks);
            if(options.randomStartingAttack) {
                this.attackMode = THREE.Math.randInt(0, AttackMode.RandomLength - 1);
            }
            quotes = defaultValue(options.quotes, quotes);
            this.onDie = options.onDie;
            this.boss = defaultValue(options.boss, this.boss);
        }

        this.nodes = nodes;

        this.labelLeft = new LabelPositioner(document.createElement("div"), labelChangeTime, quotes, this.offsets);
        this.labelRight = new LabelPositioner(document.createElement("div"), labelChangeTime, quotes, this.offsets);

        this.startHealth = this._health;

        this.xRotateSpeed = THREE.Math.degToRad(this.xRotateSpeed);
        this.yRotateSpeed = THREE.Math.degToRad(this.yRotateSpeed);

        const geometry = this.boss || texture instanceof THREE.VideoTexture ? bigBox : box;

        this.player = player;
        this.texture = texture;
        this.material = new THREE.MeshBasicMaterial({map: texture});
        this.mesh = new THREE.Mesh(geometry, this.material);
        this.mesh.position.copy(position);

        this.nodes.push(this.mesh);

        this.list.root.add(this.mesh);
        this.collider = list.grid.create(this, this.mesh.position, geometry.boundingSphere.radius);

        this.labelContainer = labelContainer;
        labelContainer.append(this.labelLeft.div, this.labelRight.div);
    }

    dispose(): void {
        removeArray(this.nodes, this.mesh);
        this.list.root.remove(this.mesh);
        this.list.grid.destroy(this.collider);
        this.labelContainer.removeChild(this.labelLeft.div);
        this.labelContainer.removeChild(this.labelRight.div);
    }

    get health() {
        return this._health;
    }

    damage(damage: number) {
        this._health = Math.max(this._health - damage, 0);

        this.flashStart = this.list.time;
        this.flashEnd = this.list.time + 0.2;
        this.updateColour(this.list.time);

        if(this._health === 0) {
            this.die();
        }
    }

    die() {
        // TODO: Create some cool explosion
        if(this.onDie) {
            this.onDie(this);
        }
        this.player.onEnemyKill();
        this.list.create(ParticlesEnemyHit, this.mesh.position, tempVec1.set(0, 0, 1), {
            spread: 360,
            lifetime: new Range(0.2, 2.0),
            count: this.boss ? new Range(600, 600) : new Range(200, 200),
            spawnDelay: new Range(0.1, 0.5),
            colour: "yellow"
        });
        this.list.remove(this);
    }

    update(time: number, dt: number): void {
        const {mesh} = this;

        this.updateColour(time);

        mesh.rotateX(this.xRotateSpeed * dt);
        mesh.rotateY(this.yRotateSpeed * dt);

        if(!this.list.globals.pause) {
            this.updateAttack(time);
            if(this.boss) {
                this.mesh.position.add(
                    tempVec1
                        .subVectors(this.player.mesh.position, mesh.position)
                        .normalize()
                        .multiplyScalar(2 * this.list.dt)
                );
            }
            else {
                this.mesh.position.add(
                    tempVec1.set(
                        Math.cos(time + this.coffset),
                        0,
                        Math.sin(time + this.soffset),
                    )
                    .normalize()
                    .multiplyScalar(this.list.dt * 5)
                );
            }
        }

        this.labelLeft.updatePosition(this.mesh.position, this.list.camera);
        this.labelLeft.update(time);

        this.labelRight.updatePosition(this.mesh.position, this.list.camera);
        this.labelRight.update(time);

        this.collider.position.copy(this.mesh.position);
        this.collider.update();
    }

    private createProjectile(position: THREE.Vector3, direction: THREE.Vector3, options?: ProjectileOptions) {
        this.list.create(
            Projectile,
            new THREE.Mesh(projectileGeometry, projectileMaterial),
            position,
            direction,
            options
        );
    }

    private updateDirectAttack(time: number, ) {
        const {player, lastFire, fireDelay} = this;
        if(time > lastFire + fireDelay * (1 - player.killed / 20)) {
            tempVec1
                .subVectors(player.mesh.position, this.mesh.position)
                .normalize();
            this.createProjectile(this.mesh.position, tempVec1, {
                minSpeed: 40 * (1 + player.killed / 20) * (this.boss ? 1.25 : 1),
                maxSpeed: 60 * (1 + player.killed / 20) * (this.boss ? 1.25 : 1),
                destroyable: true,
                canDamagePlayer: true
            });
            this.lastFire = time;
        }
    }

    private updateRoundAttack(time: number) {
        const {mesh, lastFire, fireDelayRound, player} = this;
        if(time > lastFire + fireDelayRound) {
            const startAngle = THREE.Math.degToRad((time * 100) % 360);
            for(let i = 0; i < this.roundNumShots; i++) {
                tempQuat1.setFromAxisAngle(up, startAngle + THREE.Math.degToRad((i / this.roundNumShots) * 360));
                tempVec1
                    .set(0, 0, 1)
                    .applyQuaternion(tempQuat1)
                    .normalize();
                this.createProjectile(mesh.position, tempVec1, {
                    minSpeed: 40 * (1 + player.killed / 20) * (this.boss ? 1.25 : 1),
                    maxSpeed: 60 * (1 + player.killed / 20) * (this.boss ? 1.25 : 1),
                    destroyable: true,
                    canDamagePlayer: true
                });
            }
            this.lastFire = time;
        }
    }

    private updateBurstAttack(time: number) {
        const {mesh, lastFire, fireDelayBurst, player} = this;
        if(time >= lastFire + fireDelayBurst * (1 - player.killed / 20)) {
            if(time > this.burstLastShotFired + this.burstDelayBetweenShots) {
                tempVec1
                    .set(THREE.Math.randFloat(-1, 1), THREE.Math.randFloat(-1, 1), THREE.Math.randFloat(-1, 1))
                    .normalize()
                    .multiplyScalar(THREE.Math.randFloat(-4, 4))
                    .add(mesh.position);
                tempVec2
                    .subVectors(this.player.mesh.position, mesh.position)
                    .normalize();
                this.createProjectile(tempVec1, tempVec2,  {
                    minSpeed: 80 * (1 + player.killed / 30) * (this.boss ? 1.25 : 1),
                    maxSpeed: 100 * (1 + player.killed / 30) * (this.boss ? 1.25 : 1),
                    destroyable: true,
                    canDamagePlayer: true
                });
                this.burstShotsFired++;
                this.burstLastShotFired = time;
                if(this.burstShotsFired === this.burstNumShots) {
                    this.lastFire = time;
                    this.burstShotsFired = 0;
                }
            }
        }
    }

    private updateSnipeAttack(time: number) {
        const {player, lastFire, fireDelaySnipe} = this;
        if(time >= lastFire + fireDelaySnipe * (1 - player.killed / 30)) {
            // Fire ahead of the player
            const speed = 125;
            tempVec1
                .copy(this.player.relativeVelocity)
                .multiplyScalar(this.player.mesh.position.distanceTo(this.mesh.position) / speed)
                .add(this.player.mesh.position)
                .sub(this.mesh.position)
                .normalize();

            this.createProjectile(this.mesh.position, tempVec1, {
                minSpeed: speed,
                maxSpeed: speed,
                destroyable: true,
                canDamagePlayer: true
            });
            this.lastFire = time;
        }
    }

    private updateClumpAttack(time: number) {
        const {lastFire, fireDelayClump, player} = this;
        if(time >= lastFire + fireDelayClump * (1 - player.killed / 20)) {

            const circles: THREE.Sphere[] = [];
            for(let i = 0; i < this.clumpAmount; i++) {
                const circle = new THREE.Sphere();
                circle.center.set(
                    THREE.Math.randFloat(-5, 5),
                    0,
                    THREE.Math.randFloat(-5, 5),
                );
                circle.radius = 5;

                for(const other of circles) {
                    if(circle.intersectsSphere(other)) {
                        // Move the circle out of the way by the intersection amount
                        const amount = -(other.center.distanceTo(circle.center) - (other.radius + circle.radius));
                        tempVec1
                            .subVectors(circle.center, other.center)
                            .setLength(amount);
                        circle.center.add(tempVec1);
                    }
                }

                circles.push(circle);

                tempVec1
                    .subVectors(this.player.mesh.position, this.mesh.position)
                    .normalize();

                this.createProjectile(circle.center.add(this.mesh.position), tempVec1, {
                    minSpeed: 40 * (1 + player.killed / 20) * (this.boss ? 1.25 : 1),
                    maxSpeed: 60 * (1 + player.killed / 20) * (this.boss ? 1.25 : 1),
                    destroyable: true,
                    canDamagePlayer: true
                });
            }

            this.lastFire = time;
        }
    }

    private updateAttack(time: number) {
        const {player, mesh, shootDistance, snipeShootDistance} = this;

        if(this.switchAttacks && time > this.nextSwitchAttack) {
            this.attackMode = THREE.Math.randInt(0, AttackMode.Length - 1);
            if(this.attackMode === AttackMode.RandomLength) {
                this.attackMode = AttackMode.Round;
            }
            this.nextSwitchAttack = time + this.switchAttackTime.random() * (this.boss ? 1.25 - (this.health / this.startHealth) : 1);
        }

        const d = this.attackMode === AttackMode.Snipe || this.boss ? snipeShootDistance : shootDistance;
        const playerClose = player.mesh.position.distanceToSquared(mesh.position) <= d * d;
        if(playerClose) {
            switch (this.attackMode) {
                case AttackMode.Direct:
                    this.updateDirectAttack(time);
                    break;

                case AttackMode.Round:
                    this.updateRoundAttack(time);
                    break;

                case AttackMode.Burst:
                    this.updateBurstAttack(time);
                    break;

                case AttackMode.Snipe:
                    this.updateSnipeAttack(time);
                    break;

                case AttackMode.Clump:
                    this.updateClumpAttack(time);
                    break;
            }
        }
    }

    private updateColour(time: number) {
        // Set base colour from health
        this.material.color
            .copy(fullHealthColour)
            .lerpHSL(noHealthColour, THREE.Math.mapLinear(
                this._health,
                this.startHealth, 0,
                0, 1
            ));
        // Lerp from base colour to flash colour if flash happening
        if(time >= this.flashStart && time <= this.flashEnd) {
            const x = time * Math.PI * 20;
            const f = (Math.sin(x - this.flashStart - Math.PI / 2) + 1) / 2;
            this.material.color.lerp(flashColour, f);
        }
    }
}