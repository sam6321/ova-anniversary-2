import * as THREE from 'three';
import {Input} from "./input";
import {Grid} from "./collision";
import {removeArray} from "./utils";
import {Globals} from "./globals";

export class Update {

    public readonly list: UpdateList;
    public destroyed = false;

    constructor(list: UpdateList) {
        this.list = list;
    }

    /**
     * Called when removed from the update list
     * @param root The root object to remove any threejs objects from.
     */
    dispose(): void {}

    /**
     * @param time Time
     * @param dt Delta time
     * @returns True to destroy object, false to keep object alive.
     */
    update(time: number, dt: number): void {}
}

type UpdateConstructor = new (list: UpdateList, ...params: any[]) => Update;
type ConstructorParams<T> = T extends new(list: UpdateList, ...params: infer X) => any ? X : never;
type ConstructorResult<T> = T extends new (list: UpdateList, ...params: any[]) => infer X ? X : never;

export class UpdateList {
    public readonly root: THREE.Object3D;
    public readonly camera: THREE.Camera;
    public readonly input: Input;
    public readonly grid: Grid;
    public readonly globals = new Globals();
    public time = 0;
    public dt = 0;

    private readonly objects: Update[] = [];
    private readonly destroyList: Update[] = [];

    constructor(root: THREE.Object3D, camera: THREE.Camera, input: Input, grid: Grid) {
        this.root = root;
        this.camera = camera;
        this.input = input;
        this.grid = grid;
    }

    create<T extends UpdateConstructor>(constructor: T, ...params: ConstructorParams<T>): ConstructorResult<T> {
        const object = new constructor(this, ...params);
        this.objects.push(object);
        return object as ConstructorResult<T>;
    }

    remove(object: Update) {
        this.destroyList.push(object);
        object.destroyed = true;
        return this;
    }

    update(time: number, dt: number) {
        this.time = time;
        this.dt = dt;

        for(const update of this.objects) {
            if(!update.destroyed) {
                update.update(time, dt);
            }
        }

        for(const update of this.destroyList) {
            update.dispose();
            removeArray(this.objects, update);
        }
        this.destroyList.length = 0;
    }
}