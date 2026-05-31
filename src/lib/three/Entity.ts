import * as THREE from 'three';

export default abstract class Entity {
    protected mesh: THREE.Object3D;

    constructor() {
        this.mesh = new THREE.Object3D();
    }

    get object() {
        return this.mesh;
    }

    show() {
        this.mesh.visible = true;
    }

    hide() {
        this.mesh.visible = false;
    }

    update(delta: number) {
        this.mesh.rotation.y += 0.01;
    }
}