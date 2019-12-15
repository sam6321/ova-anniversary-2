import * as THREE from "three";
import {Update, UpdateList} from "./update";

const tempVec1 = new THREE.Vector3();
const tempQuat = new THREE.Quaternion();
const tempVec2 = new THREE.Vector3();

export class Arrow extends Update {

    private readonly nodes: THREE.Object3D[];
    private readonly target: THREE.Object3D;
    private material: THREE.MeshBasicMaterial;
    private fadeIn = true;
    private fadeTime?: number;
    private targetPosition = new THREE.Vector3();
    private targetQuaternion = new THREE.Quaternion();
    public readonly model: THREE.Mesh;

    constructor(list: UpdateList, target: THREE.Object3D, model: THREE.Mesh, nodes: THREE.Object3D[]) {
        super(list);
        this.target = target;
        this.nodes = nodes;
        this.material = (model as THREE.Mesh).material as THREE.MeshBasicMaterial;
        this.material.transparent = true;
        this.model = model;
        this.model.scale.setScalar(0.5);

        list.root.add(this.model);
    }

    dispose(): void {
        this.list.root.remove(this.model);
        super.dispose();
    }

    update(time: number) {
        if(this.nodes.length === 0) {
            this.model.visible = false;
            return;
        }

        tempVec1.setScalar(0);
        let shortest = Infinity;
        for(const node of this.nodes) {
            const d = node.position.distanceToSquared(this.target.position);
            if(d < shortest) {
                shortest = d;
                tempVec1.copy(node.position);
            }
        }

        if(shortest !== Infinity) {
            tempQuat.copy(this.model.quaternion);
            this.model.lookAt(tempVec1);
            this.model.rotateY(THREE.Math.degToRad(-90));
            this.targetQuaternion.copy(this.model.quaternion);
            this.model.quaternion.copy(tempQuat);

            tempVec2.copy(tempVec1).add(this.target.position).divideScalar(2);
            tempVec2.subVectors(tempVec1, tempVec2).clampLength(5, 10);
            const length = tempVec2.length();
            this.targetPosition.copy(this.target.position).add(tempVec2);
            this.material.opacity = THREE.Math.mapLinear(
                THREE.Math.clamp(length, 5, 10),
                0.5, 1.0,
                0.0, 1.0
            );
        }

        if(this.fadeTime !== undefined) {
            let fadeOpacity = THREE.Math.mapLinear(
                THREE.Math.clamp(time, this.fadeTime, this.fadeTime + 1),
                this.fadeTime, this.fadeTime + 1,
                0.0, 1.0
            );

            if(!this.fadeIn) {
                fadeOpacity = 1.0 - fadeOpacity;
            }

            this.material.opacity = Math.min(this.material.opacity, fadeOpacity);
        }

        THREE.Quaternion.slerp(this.model.quaternion, this.targetQuaternion, this.model.quaternion, 10 * this.list.dt);
        this.model.position.lerp(this.targetPosition, 5 * this.list.dt);
        this.model.visible = this.material.opacity > 0;
    }

    fade(time: number, fadeIn: boolean) {
        this.fadeIn = fadeIn;
        this.fadeTime = time;
    }
}