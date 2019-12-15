import * as THREE from 'three';
import {removeArray} from "./utils";

function hash3(x: number, y: number, z: number) {
    return x * 73856093 ^ y * 19349663 ^ z * 83492791;
}

function hash2(x: number, y: number) {
    return x * 73856093 ^ y * 83492791;
}

function same<T>(set: ReadonlySet<T>, e: readonly T[]) {
    const length = e.length;
    if(set.size !== length) {
        return false;
    }
    for(let i = 0; i < length; i++) {
        if(!set.has(e[i])) {
            return false;
        }
    }
    return true;
}

function getGridKeys(position: THREE.Vector3, radius: number, size: number) {
    const lowX = Math.floor((position.x - radius) / size);
    const highX = Math.floor((position.x + radius) / size);
    const lowY = Math.floor((position.y - radius) / size);
    const highY = Math.floor((position.y + radius) / size);
    const lowZ = Math.floor((position.z - radius) / size);
    const highZ = Math.floor((position.z + radius) / size);
    const keys = [];
    for(let x = lowX; x <= highX; x++) {
        for(let y = lowY; y <= highY; y++) {
            for(let z = lowZ; z <= highZ; z++) {
                keys.push(hash3(x, y, z));
            }
        }
    }
    return keys;
}

export class GridObject<T = unknown> {
    public readonly grid: Grid;
    public readonly object: T;
    public readonly keys = new Set<number>();
    public readonly position = new THREE.Vector3();
    public radius = 1;

    private readonly _position = new THREE.Vector3();
    private _radius = 1;

    constructor(grid: Grid, object: T, position: THREE.Vector3, radius: number) {
        this.grid = grid;
        this.object = object;

        this._position.copy(position);
        this.position.copy(position);
        this._radius = radius;
        this.radius = radius;
    }

    update() {
        let changed = false;
        if(!this._position.equals(this.position)) {
            this._position.copy(this.position);
            changed = true;
        }

        if(this._radius !== this.radius) {
            this._radius = this.radius;
            changed = true;
        }

        if(changed) {
            this.grid.update(this);
        }
    }
}

export class Grid {
    public readonly cellSize: number;
    private readonly objects = new Set<GridObject>();
    private readonly objectsUpdated: GridObject[] = [];
    private readonly cellMap = new Map<number, GridObject[]>();

    constructor(cellSize: number) {
        this.cellSize = cellSize;
    }

    create<T>(object: T, position: THREE.Vector3, radius: number): GridObject<T> {
        const gridObject = new GridObject<T>(this, object, position, radius);
        this.objects.add(gridObject);
        this.link(gridObject, getGridKeys(position, radius, this.cellSize));
        return gridObject;
    }

    destroy(gridObject: GridObject) {
        if(this.objects.delete(gridObject)) {
            this.unlink(gridObject);
        }
    }

    update(gridObject: GridObject) {
        if(this.objects.has(gridObject)) {
            this.objectsUpdated.push(gridObject);
        }
    }

    search(position: THREE.Vector3, radius: number) {
        this.updateInternal();
        const hits = [];
        const keys = getGridKeys(position, radius, this.cellSize);
        const radiusSq = radius * radius;
        for(let i = 0, len = keys.length; i < len; i++) {
            const contents = this.cellMap.get(keys[i]);
            if(contents) {
                for(let c = 0, len2 = contents.length; c < len2; c++) {
                    const gridObject = contents[c];
                    const objectRadiusSq = gridObject.radius * gridObject.radius;
                    const dx = gridObject.position.x - position.x;
                    const dy = gridObject.position.y - position.y;
                    const dz = gridObject.position.z - position.z;
                    if(dx * dx + dy * dy + dz * dz <= radiusSq + objectRadiusSq) {
                        hits.push(gridObject);
                    }
                }
            }
        }
        return hits;
    }

    private updateInternal() {
        const updatedList = this.objectsUpdated;
        for(let i = 0, len = updatedList.length; i < len; i++) {
            const object = updatedList[i];
            if(!this.objects.has(object)) {
                continue;
            }
            const newKeys = getGridKeys(object.position, object.radius, this.cellSize);
            if(!same(object.keys, newKeys)){
                this.unlink(object);
                this.link(object, newKeys);
            }
        }
        updatedList.length = 0;
    }

    private link(gridObject: GridObject, keys: readonly number[]) {
        for(let i = 0, len = keys.length; i < len; i++) {
            const key = keys[i];
            gridObject.keys.add(key);
            const contents = this.cellMap.get(key);
            if(!contents) {
                this.cellMap.set(key, [gridObject]);
            }
            else {
                contents.push(gridObject);
            }
        }
    }

    private unlink(gridObject: GridObject) {
        for(const key of gridObject.keys) {
            const contents = this.cellMap.get(key);
            if(contents) {
                removeArray(contents, gridObject);
            }
        }
        gridObject.keys.clear();
    }
}