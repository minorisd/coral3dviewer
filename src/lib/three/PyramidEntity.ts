import * as THREE from 'three';
import Entity from './Entity';

export default class PyramidEntity extends Entity {
    constructor() {
        super();

        const geometry = new THREE.ConeGeometry(1, 1.8, 4);
        const material = new THREE.MeshStandardMaterial();

        this.mesh = new THREE.Mesh(geometry, material);
    }
}