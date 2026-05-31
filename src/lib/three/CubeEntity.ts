import * as THREE from 'three';
import Entity from './Entity';

export default class CubeEntity extends Entity {
    constructor() {
        super();

        const geometry = new THREE.BoxGeometry(1.5, 1.5, 1.5);
        const material = new THREE.MeshStandardMaterial();

        this.mesh = new THREE.Mesh(geometry, material);
    }
}