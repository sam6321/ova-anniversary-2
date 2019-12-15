import * as THREE from 'three';

export function defaultValue<T>(x: T | undefined, defaultValue: T) {
    return typeof x === 'undefined' ? defaultValue : x;
}

export function removeArray<T>(array: T[], element: T): boolean {
    const index = array.indexOf(element);
    if(index >= 0) {
        array.splice(index, 1);
        return true;
    }
    return false;
}

export class Range {

    start = 0;
    end = 0;

    constructor(start: number, end: number) {
        this.set(start, end);
    }

    set(start: number, end: number) {
        this.start = start;
        this.end = end;
        return this;
    }

    copy(other: Range) {
        return this.set(other.start, other.end);
    }

    clone() {
        return new Range(this.start, this.end);
    }

    get size() {
        return this.end - this.start;
    }

    lerp(a: number) {
        return THREE.Math.lerp(this.start, this.end, a);
    }

    random() {
        return THREE.Math.randFloat(this.start, this.end);
    }

    randomInt() {
        return THREE.Math.randInt(this.start, this.end);
    }
}

export function randomElement<T>(array: readonly T[]) {
    return array[randomIndex(array)];
}

export function randomIndex(array: readonly any[]) {
    return THREE.Math.randInt(0, array.length - 1);
}