import * as THREE from 'three';
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';

import Entity from './Entity';
import CubeEntity from './CubeEntity';
import SphereEntity from './SphereEntity';
import PyramidEntity from './PyramidEntity';

export default class VRScene {
    private readonly debugMode = false;

    private scene: THREE.Scene;
    private camera: THREE.PerspectiveCamera;
    private renderer: THREE.WebGLRenderer;

    private controls?: PointerLockControls;

    private entities: Entity[] = [];
    private currentEntity = 0;

    private raycaster = new THREE.Raycaster();

    private leftButton!: THREE.Mesh;
    private rightButton!: THREE.Mesh;
    private buttons: THREE.Object3D[] = [];

    private teleportRing!: THREE.Mesh;
    private lastTeleportPoint = new THREE.Vector3();

    private gazeTarget: THREE.Object3D | null = null;
    private gazeStartTime = 0;
    private readonly gazeDuration = 3000;

    private progressRing!: THREE.Line;
    private progressGeometry!: THREE.BufferGeometry;

    private previousTime = performance.now();

    private readonly center = new THREE.Vector3(0, 1, 0);
    private readonly buttonDistance = 2.4;
    private readonly buttonHeight = 1;
    private readonly buttonSideAngle = Math.PI / 5;

    constructor(container: HTMLElement) {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87ceeb);

        this.camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            100
        );

        this.camera.position.set(0, 1.6, 5);
        this.camera.lookAt(this.center);

        this.renderer = new THREE.WebGLRenderer({
            antialias: true
        });

        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(window.innerWidth, window.innerHeight);

        container.appendChild(this.renderer.domElement);

        if (this.debugMode) {
            this.controls = new PointerLockControls(
                this.camera,
                this.renderer.domElement
            );

            this.renderer.domElement.addEventListener('click', () => {
                this.controls?.lock();
            });
        } else {
            this.renderer.xr.enabled = true;

            document.body.appendChild(
                VRButton.createButton(this.renderer)
            );
        }

        const ambient = new THREE.AmbientLight(0xffffff, 1.5);
        this.scene.add(ambient);

        const light = new THREE.DirectionalLight(0xffffff, 2);
        light.position.set(5, 5, 5);
        this.scene.add(light);

        this.createEntities();
        this.createButtons();
        this.createTeleportRing();
        this.createCrosshair();

        window.addEventListener('resize', this.onResize);

        if (this.debugMode) {
            requestAnimationFrame(this.animateDesktop);
        } else {
            this.renderer.setAnimationLoop(this.animateWebXR);
        }
    }

    private createEntities() {
        this.entities.push(new CubeEntity());
        this.entities.push(new SphereEntity());
        this.entities.push(new PyramidEntity());

        for (const entity of this.entities) {
            entity.object.position.copy(this.center);
            entity.hide();
            this.scene.add(entity.object);
        }

        this.entities[0].show();
    }

    private createButtons() {
        this.leftButton = this.createArrow(false);
        this.rightButton = this.createArrow(true);

        this.leftButton.userData.direction = 'left';
        this.rightButton.userData.direction = 'right';

        this.scene.add(this.leftButton);
        this.scene.add(this.rightButton);

        this.buttons.push(this.leftButton);
        this.buttons.push(this.rightButton);

        this.updateButtonPositions();
    }

    private createArrow(right: boolean) {
        const shape = new THREE.Shape();

        if (right) {
            shape.moveTo(-0.4, 0.4);
            shape.lineTo(0.1, 0.4);
            shape.lineTo(0.1, 0.7);
            shape.lineTo(0.7, 0);
            shape.lineTo(0.1, -0.7);
            shape.lineTo(0.1, -0.4);
            shape.lineTo(-0.4, -0.4);
        } else {
            shape.moveTo(0.4, 0.4);
            shape.lineTo(-0.1, 0.4);
            shape.lineTo(-0.1, 0.7);
            shape.lineTo(-0.7, 0);
            shape.lineTo(-0.1, -0.7);
            shape.lineTo(-0.1, -0.4);
            shape.lineTo(0.4, -0.4);
        }

        const geometry = new THREE.ShapeGeometry(shape);

        const material = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            side: THREE.DoubleSide
        });

        return new THREE.Mesh(geometry, material);
    }

    private updateButtonPositions() {
        const cameraPosition = new THREE.Vector3();
        this.camera.getWorldPosition(cameraPosition);

        const angleToCamera = Math.atan2(
            cameraPosition.x - this.center.x,
            cameraPosition.z - this.center.z
        );

        this.setButtonOnCircle(
            this.leftButton,
            angleToCamera - this.buttonSideAngle
        );

        this.setButtonOnCircle(
            this.rightButton,
            angleToCamera + this.buttonSideAngle
        );
    }

    private setButtonOnCircle(
        button: THREE.Mesh,
        angle: number
    ) {
        const x = this.center.x + Math.sin(angle) * this.buttonDistance;
        const z = this.center.z + Math.cos(angle) * this.buttonDistance;

        button.position.set(x, this.buttonHeight, z);

        button.lookAt(this.camera.position);
    }

    private createTeleportRing() {
        const geometry = new THREE.RingGeometry(
            3.8,
            4.2,
            128
        );

        const material = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.35
        });

        this.teleportRing = new THREE.Mesh(geometry, material);

        this.teleportRing.rotation.x = -Math.PI / 2;
        this.teleportRing.position.y = 0;

        this.scene.add(this.teleportRing);
    }

    private createCrosshair() {
        const crosshairGeometry = new THREE.RingGeometry(
            0.015,
            0.03,
            32
        );

        const crosshairMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            depthTest: false
        });

        const crosshair = new THREE.Mesh(
            crosshairGeometry,
            crosshairMaterial
        );

        crosshair.position.z = -2;
        this.camera.add(crosshair);

        this.progressGeometry = new THREE.BufferGeometry();

        const progressMaterial = new THREE.LineBasicMaterial({
            color: 0xff0000,
            depthTest: false
        });

        this.progressRing = new THREE.Line(
            this.progressGeometry,
            progressMaterial
        );

        this.progressRing.position.z = -1.99;
        this.camera.add(this.progressRing);

        this.updateProgressRing(0);

        this.scene.add(this.camera);
    }

    private updateProgressRing(progress: number) {
        const fixedProgress = Math.max(0, Math.min(progress, 1));

        const segments = 64;
        const radius = 0.04;
        const points: number[] = [];

        if (fixedProgress > 0) {
            const visibleSegments = Math.ceil(
                segments * fixedProgress
            );

            for (let i = 0; i <= visibleSegments; i++) {
                const angle =
                    -Math.PI / 2 +
                    Math.PI * 2 * fixedProgress * (i / visibleSegments);

                points.push(
                    Math.cos(angle) * radius,
                    Math.sin(angle) * radius,
                    0
                );
            }
        }

        this.progressGeometry.dispose();
        this.progressGeometry = new THREE.BufferGeometry();

        this.progressGeometry.setAttribute(
            'position',
            new THREE.Float32BufferAttribute(points, 3)
        );

        this.progressRing.geometry = this.progressGeometry;
    }

    private setGazeRay() {
        if (this.debugMode) {
            this.raycaster.setFromCamera(
                new THREE.Vector2(0, 0),
                this.camera
            );

            return;
        }

        const xrCamera = this.renderer.xr.getCamera(this.camera);

        const position = new THREE.Vector3();
        const direction = new THREE.Vector3(0, 0, -1);

        xrCamera.getWorldPosition(position);
        direction.applyQuaternion(xrCamera.quaternion);

        this.raycaster.set(position, direction.normalize());
    }

    private checkGaze() {
        this.setGazeRay();

        const buttonHits = this.raycaster.intersectObjects(this.buttons);

        if (buttonHits.length > 0) {
            const target = buttonHits[0].object;

            this.handleGazeTarget(target, () => {
                this.activateButton(target);
            });

            return;
        }

        const ringHits = this.raycaster.intersectObject(this.teleportRing);

        if (ringHits.length > 0) {
            const target = ringHits[0].object;

            this.lastTeleportPoint.copy(ringHits[0].point);

            this.handleGazeTarget(target, () => {
                this.teleportToLastPoint();
            });

            return;
        }

        this.gazeTarget = null;
        this.gazeStartTime = 0;
        this.updateProgressRing(0);
    }

    private handleGazeTarget(
        target: THREE.Object3D,
        action: () => void
    ) {
        if (target !== this.gazeTarget) {
            this.gazeTarget = target;
            this.gazeStartTime = performance.now();
            this.updateProgressRing(0);
            return;
        }

        const elapsed = performance.now() - this.gazeStartTime;

        const progress = Math.min(
            elapsed / this.gazeDuration,
            1
        );

        this.updateProgressRing(progress);

        if (elapsed >= this.gazeDuration) {
            action();

            this.gazeStartTime = performance.now();
            this.updateProgressRing(0);
        }
    }

    private activateButton(button: THREE.Object3D) {
        if (button.userData.direction === 'left') {
            this.previousEntity();
        }

        if (button.userData.direction === 'right') {
            this.nextEntity();
        }
    }

    private teleportToLastPoint() {
        this.camera.position.set(
            this.lastTeleportPoint.x,
            1.6,
            this.lastTeleportPoint.z
        );

        this.updateButtonPositions();
    }

    private nextEntity() {
        this.entities[this.currentEntity].hide();

        this.currentEntity++;

        if (this.currentEntity >= this.entities.length) {
            this.currentEntity = 0;
        }

        this.entities[this.currentEntity].show();
    }

    private previousEntity() {
        this.entities[this.currentEntity].hide();

        this.currentEntity--;

        if (this.currentEntity < 0) {
            this.currentEntity = this.entities.length - 1;
        }

        this.entities[this.currentEntity].show();
    }

    private update() {
        const now = performance.now();
        const delta = (now - this.previousTime) / 1000;

        this.previousTime = now;

        this.entities[this.currentEntity].update(delta);

        this.updateButtonPositions();
        this.checkGaze();
    }

    private animateDesktop = () => {
        this.update();

        this.renderer.render(this.scene, this.camera);

        requestAnimationFrame(this.animateDesktop);
    };

    private animateWebXR = () => {
        this.update();

        this.renderer.render(this.scene, this.camera);
    };

    private onResize = () => {
        this.camera.aspect =
            window.innerWidth / window.innerHeight;

        this.camera.updateProjectionMatrix();

        this.renderer.setSize(
            window.innerWidth,
            window.innerHeight
        );
    };
}