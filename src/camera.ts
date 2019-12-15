import * as THREE from 'three';
import {defaultValue} from "./utils";
import {Update, UpdateList} from "./update";

export interface CameraMovementOptions {
    cameraLerpSpeed?: number;
    mouseLerpSpeed?: number;
}

export default class CameraMovement extends Update {

    private readonly cameraObjectInterpTarget = new THREE.Vector3();
    private readonly mouseInterpTarget = new THREE.Vector3();

    private readonly camera: THREE.Camera;
    private readonly target: THREE.Object3D;
    private readonly mouse: THREE.Vector3;

    public cameraLerpSpeed = 0.1;
    public mouseLerpSpeed = 0.1;

    constructor(list: UpdateList, camera: THREE.Camera, target: THREE.Object3D, mouse: THREE.Vector3, options?: CameraMovementOptions) {
        super(list);

        this.camera = camera;
        this.target = target;
        this.mouse = mouse;

        if(options) {
            this.cameraLerpSpeed = defaultValue(options.cameraLerpSpeed, this.cameraLerpSpeed);
            this.mouseLerpSpeed = defaultValue(options.mouseLerpSpeed, this.mouseLerpSpeed);
        }

        this.cameraObjectInterpTarget.copy(camera.position);
        this.mouseInterpTarget.copy(mouse);
    }

    update(time: number, dt: number) {
        const startY = this.camera.position.y;

        this.cameraObjectInterpTarget.lerp(this.target.position, this.cameraLerpSpeed * dt);
        this.mouseInterpTarget.lerp(this.mouse, this.mouseLerpSpeed * dt);

        this.camera.position
            .subVectors(this.mouseInterpTarget, this.cameraObjectInterpTarget)
            .divideScalar(4)
            .add(this.cameraObjectInterpTarget);

        this.camera.position.y = startY;
    }
}