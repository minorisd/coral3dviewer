import * as THREE from 'three';
import Entity from './Entity';

export default class SphereEntity extends Entity {
    constructor() {
        super();

        const geometry = new THREE.SphereGeometry(1, 32, 32);
        const material = new THREE.MeshStandardMaterial();

        this.mesh = new THREE.Mesh(geometry, material);
    }
}