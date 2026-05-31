import * as THREE from 'three';
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';

import Entity from './Entity';
import CubeEntity from './CubeEntity';
import SphereEntity from './SphereEntity';
import PyramidEntity from './PyramidEntity';

export default class VRScene {
    private scene: THREE.Scene;
    private camera: THREE.PerspectiveCamera;
    private renderer: THREE.WebGLRenderer;

    private player = new THREE.Group();

    private entities: Entity[] = [];
    private currentEntity = 0;

    private raycaster = new THREE.Raycaster();

    private leftButton!: THREE.Mesh;
    private rightButton!: THREE.Mesh;
    private buttons: THREE.Object3D[] = [];

    private teleportRing!: THREE.Mesh;
    private teleportHitBox!: THREE.Mesh;
    private lastTeleportPoint = new THREE.Vector3();

    private gazeTarget: THREE.Object3D | null = null;
    private gazeStartTime = 0;
    private readonly gazeDuration = 1000;

    private progressRing!: THREE.Line;
    private progressGeometry!: THREE.BufferGeometry;

    private previousTime = performance.now();

    private readonly center = new THREE.Vector3(0, 1, 0);
    private readonly eyeHeight = 1.6;

    private readonly buttonDistance = 2.1;
    private readonly buttonHeight = 1;
    private readonly buttonSideAngle = Math.PI / 5;
    private readonly buttonScale = 0.45;

    private readonly teleportRadius = 4;

    constructor(container: HTMLElement) {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87ceeb);

        this.camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            100
        );

        this.camera.position.set(0, this.eyeHeight, 0);

        this.player.position.set(0, 0, this.teleportRadius);
        this.player.add(this.camera);
        this.scene.add(this.player);

        this.renderer = new THREE.WebGLRenderer({
            antialias: true
        });

        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.xr.enabled = true;

        container.appendChild(this.renderer.domElement);
        document.body.appendChild(VRButton.createButton(this.renderer));

        const ambient = new THREE.AmbientLight(0xffffff, 1.5);
        this.scene.add(ambient);

        const light = new THREE.DirectionalLight(0xffffff, 2);
        light.position.set(5, 5, 5);
        this.scene.add(light);

        this.createEntities();
        this.createButtons();
        this.createTeleportRing();
        this.createCrosshair();

        this.facePlayerToEntity();

        window.addEventListener('resize', this.onResize);

        this.renderer.setAnimationLoop(this.animate);
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

        this.leftButton.scale.setScalar(this.buttonScale);
        this.rightButton.scale.setScalar(this.buttonScale);

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

    private createTeleportRing() {
        const ringGeometry = new THREE.RingGeometry(
            this.teleportRadius - 0.15,
            this.teleportRadius + 0.15,
            128
        );

        const ringMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.45,
            depthWrite: false
        });

        this.teleportRing = new THREE.Mesh(
            ringGeometry,
            ringMaterial
        );

        this.teleportRing.rotation.x = -Math.PI / 2;
        this.teleportRing.position.set(0, 0.03, 0);

        this.scene.add(this.teleportRing);

        const hitBoxGeometry = new THREE.CylinderGeometry(
            this.teleportRadius + 0.25,
            this.teleportRadius + 0.25,
            1.2,
            128,
            1,
            true
        );

        const hitBoxMaterial = new THREE.MeshBasicMaterial({
            transparent: true,
            opacity: 0,
            side: THREE.DoubleSide
        });

        this.teleportHitBox = new THREE.Mesh(
            hitBoxGeometry,
            hitBoxMaterial
        );

        this.teleportHitBox.position.set(0, 0.6, 0);

        this.scene.add(this.teleportHitBox);
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

    private updateButtonPositions() {
        const angleToPlayer = Math.atan2(
            this.player.position.x,
            this.player.position.z
        );

        this.setButtonOnCircle(
            this.leftButton,
            angleToPlayer - this.buttonSideAngle
        );

        this.setButtonOnCircle(
            this.rightButton,
            angleToPlayer + this.buttonSideAngle
        );
    }

    private setButtonOnCircle(
        button: THREE.Mesh,
        angle: number
    ) {
        const x = Math.sin(angle) * this.buttonDistance;
        const z = Math.cos(angle) * this.buttonDistance;

        button.position.set(x, this.buttonHeight, z);

        button.lookAt(
            this.player.position.x,
            this.buttonHeight,
            this.player.position.z
        );
    }

    private setGazeRay() {
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

        const ringHits = this.raycaster.intersectObject(
            this.teleportHitBox,
            false
        );

        if (ringHits.length > 0) {
            const point = ringHits[0].point;

            this.setTeleportPointFromHit(point);

            this.handleGazeTarget(this.teleportHitBox, () => {
                this.teleportToLastPoint();
            });

            return;
        }

        this.gazeTarget = null;
        this.gazeStartTime = 0;
        this.updateProgressRing(0);
    }

    private setTeleportPointFromHit(point: THREE.Vector3) {
        const angle = Math.atan2(point.x, point.z);

        const x = Math.sin(angle) * this.teleportRadius;
        const z = Math.cos(angle) * this.teleportRadius;

        this.lastTeleportPoint.set(x, 0, z);
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

            this.gazeTarget = null;
            this.gazeStartTime = 0;
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
        this.player.position.set(
            this.lastTeleportPoint.x,
            0,
            this.lastTeleportPoint.z
        );

        this.facePlayerToEntity();
        this.updateButtonPositions();
    }

    private facePlayerToEntity() {
        const dx = this.center.x - this.player.position.x;
        const dz = this.center.z - this.player.position.z;

        this.player.rotation.y = Math.atan2(dx, dz);
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

    private animate = () => {
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