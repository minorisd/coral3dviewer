import * as THREE from 'three';

export function createCube() {
    const geometry = new THREE.BoxGeometry(1, 1, 1);

    const material = new THREE.MeshStandardMaterial({
        color: 0x44aa88
    });

    const cube = new THREE.Mesh(geometry, material);

    cube.castShadow = true;
    cube.receiveShadow = true;

    return cube;
}