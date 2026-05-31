import * as THREE from 'three';
import { createCube } from './cube';

export function createScene(container: HTMLDivElement) {
    const scene = new THREE.Scene();

    scene.background = new THREE.Color(0xeeeeee);

    const width = container.clientWidth;
    const height = container.clientHeight;

    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 100);

    camera.position.set(3, 4, 5);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({
        antialias: true
    });

    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);

    renderer.shadowMap.enabled = true;

    container.appendChild(renderer.domElement);

    const cube = createCube();
    cube.position.y = 0.5;
    scene.add(cube);

    const floorGeometry = new THREE.PlaneGeometry(10, 10);

    const floorMaterial = new THREE.MeshStandardMaterial({
        color: 0xffffff
    });

    const floor = new THREE.Mesh(floorGeometry, floorMaterial);

    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;

    scene.add(floor);

    const light = new THREE.DirectionalLight(0xffffff, 3);

    light.position.set(3, 5, 2);
    light.castShadow = true;

    scene.add(light);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);

    scene.add(ambientLight);

    function resize() {
        const width = container.clientWidth;
        const height = container.clientHeight;

        camera.aspect = width / height;
        camera.updateProjectionMatrix();

        renderer.setSize(width, height);
    }

    function animate() {
        cube.rotation.x += 0.01;
        cube.rotation.y += 0.01;

        renderer.render(scene, camera);

        requestAnimationFrame(animate);
    }

    window.addEventListener('resize', resize);

    animate();

    return {
        destroy() {
            window.removeEventListener('resize', resize);
            renderer.dispose();
            container.removeChild(renderer.domElement);
        }
    };
}