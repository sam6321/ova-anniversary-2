import * as THREE from "three";

export enum Action {
    up,
    left,
    right,
    down,
    fire,
    altfire
}

export type KeyMapping = {
    [key: string]: Action;
};

class KeyState {
    private press = 0;
    private release = 0;

    get down() {
        return this.press > this.release;
    }

    get up() {
        return !this.down;
    }

    pressed(frame: number) {
        return this.press === frame;
    }

    released(frame: number) {
        return this.release === frame;
    }

    update(state: boolean, frame: number) {
        if(state) {
            this.press = frame;
        }
        else {
            this.release = frame;
        }
    }
}

interface KeyEvent {
    key: string;
    state: boolean;
}

export class Input {

    public readonly domElement: HTMLElement;

    public readonly mouse = new THREE.Vector3();
    public readonly mouseNDC = new THREE.Vector3();

    private readonly size = new THREE.Vector2();

    private readonly mapping: KeyMapping;

    private frame = 0;
    private keys = new Map<Action, KeyState>();
    private readonly events: KeyEvent[] = [];

    constructor(domElement: HTMLElement, mapping: KeyMapping) {
        this.mapping = mapping;
        this.domElement = domElement;

        domElement.addEventListener("keydown", this.onKeyDown, true);
        domElement.addEventListener("keyup", this.onKeyUp, true);
        domElement.addEventListener("mousedown", this.onMouseButtonDown, true);
        domElement.addEventListener("mouseup", this.onMouseButtonUp, true);
        domElement.addEventListener("mousemove", this.onMouseMoved, true);
    }

    dispose() {
        this.domElement.removeEventListener("keydown", this.onKeyDown);
        this.domElement.removeEventListener("keyup", this.onKeyUp);
        this.domElement.removeEventListener("mousedown", this.onMouseButtonDown);
        this.domElement.removeEventListener("mouseup", this.onMouseButtonUp);
        this.domElement.removeEventListener("mousemove", this.onMouseMoved);
    }

    isDown(key: Action) {
        return this.get(key).down;
    }

    isUp(key: Action) {
        return this.get(key).up;
    }

    isPressed(key: Action) {
        return this.get(key).pressed(this.frame);
    }

    isReleased(key: Action) {
        return this.get(key).released(this.frame);
    }

    update() {
        this.frame++;
        for(const event of this.events) {
            const action = this.mapping[event.key];
            if(action !== undefined) {
                this.get(action).update(event.state, this.frame);
            }
        }
        this.events.length = 0;
    }

    setSize(width: number, height: number) {
        this.size.set(width, height);
        this.updateNDC();
    }

    private get(key: Action): KeyState {
        let state = this.keys.get(key);
        if(!state) {
            state = new KeyState();
            this.keys.set(key, state);
        }
        return state;
    }

    private updateNDC() {
        this.mouseNDC.set(
            THREE.Math.clamp((this.mouse.x / window.innerWidth) * 2 - 1, -1, 1),
            THREE.Math.clamp((this.mouse.y / window.innerHeight) * 2 + 1, -1, 1),
            0
        );
    }

    private readonly onKeyDown = (e: KeyboardEvent) => {
        this.events.push({key: e.key.toLowerCase(), state: true});
    };

    private readonly onKeyUp = (e: KeyboardEvent) => {
        this.events.push({key: e.key.toLowerCase(), state: false});
    };

    private readonly onMouseButtonDown = (e: MouseEvent) => {
        this.events.push({key: `mouse${e.button}`, state: true});
    };

    private readonly onMouseButtonUp = (e: MouseEvent) => {
        this.events.push({key: `mouse${e.button}`, state: false});
    };

    private readonly onMouseMoved = (e: MouseEvent) => {
        this.mouse.set(
            THREE.Math.clamp(e.clientX, -this.size.width, this.size.width),
            THREE.Math.clamp(-e.clientY, -this.size.height, this.size.height),
            0
        );
        this.updateNDC();
    };
}