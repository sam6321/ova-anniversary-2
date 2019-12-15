import * as THREE from 'three';
import {Update, UpdateList} from "./update";
import {GridObject} from "./collision";

const box = new THREE.BoxBufferGeometry(1, 1, 1);
box.computeBoundingSphere();

const tempSphere1 = box.boundingSphere.clone();

export class Destroyable extends Update {
    private mesh = new THREE.Mesh(box, new THREE.MeshBasicMaterial({color: THREE.Math.randInt(0, 0xFFFFFF)}));
    private collider: GridObject<Destroyable>;

    constructor(list: UpdateList) {
        super(list);

        const rnd = THREE.Math.randFloat;
        this.mesh.scale.set(
            rnd(1, 3),
            rnd(1, 3),
            rnd(1, 3)
        );
        this.mesh.position.set(
            rnd(-200, 200),
            0,
            rnd(-200, 200)
        );
        this.mesh.quaternion.setFromAxisAngle(this.mesh.up, rnd(-2 * Math.PI, 2 * Math.PI));
        this.mesh.updateMatrix();
        this.mesh.updateMatrixWorld();
        tempSphere1
            .copy(box.boundingSphere)
            .applyMatrix4(this.mesh.matrix);

        this.collider = list.grid.create(this, tempSphere1.center, tempSphere1.radius);
        list.root.add(this.mesh);
    }

    dispose(): void {
        this.list.grid.destroy(this.collider);
        this.list.root.remove(this.mesh);
    }
}