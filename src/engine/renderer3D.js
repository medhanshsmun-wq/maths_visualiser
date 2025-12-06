/**
 * 3D Renderer Engine - Enhanced with COSMIC SPACE THEME ✨
 * Uses Three.js to render vectors, planes, lines, points, functions, and parametric curves
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { generateImplicitSurfaceMesh } from './marchingCubes.js';

let scene, camera, renderer, controls;
let objects = [];
let container = null;
let animationFrameId = null;
let starField = null;

// Enhanced COSMIC color palette
const DEFAULT_COLORS = {
    vector: '#00d4ff',     // Stellar Cyan
    plane: '#b44aff',      // Nebula Purple
    line: '#ffd700',       // Star Gold
    point: '#ff6b9d',      // Cosmic Pink
    function: '#00ff88',   // Aurora Green
    surface: '#ff44aa'     // Galaxy Magenta
};

/**
 * Initialize the 3D scene with enhanced graphics and SPACE THEME
 */
export function init3D(containerElement) {
    container = containerElement;

    if (renderer) {
        dispose3D();
    }

    // Create scene with deep space background
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x020208);

    // Add cosmic fog for depth
    scene.fog = new THREE.FogExp2(0x050510, 0.015);

    // Create starfield
    createStarfield();

    // Create camera
    const aspect = container.clientWidth / container.clientHeight;
    camera = new THREE.PerspectiveCamera(50, aspect, 0.1, 1000);
    camera.position.set(12, 10, 12);
    camera.lookAt(0, 0, 0);

    // Create renderer with enhanced settings
    renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance'
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.4;
    container.appendChild(renderer.domElement);

    // Enhanced orbit controls
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 3;
    controls.maxDistance = 100;
    controls.enablePan = true;
    controls.panSpeed = 0.8;
    controls.rotateSpeed = 0.8;
    controls.zoomSpeed = 1.2;
    controls.autoRotate = false;
    controls.autoRotateSpeed = 0.5;

    // Enhanced cosmic grid
    createEnhancedGrid();

    // Enhanced axes with cosmic colors
    createEnhancedAxes();

    // Cosmic lighting setup
    setupLighting();

    // Handle resize
    window.addEventListener('resize', onResize);

    // Start animation loop
    animate();
}

/**
 * Create starfield for cosmic atmosphere (optimized)
 */
function createStarfield() {
    const starsGeometry = new THREE.BufferGeometry();
    const starCount = 800;  // Reduced for better performance
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);
    const sizes = new Float32Array(starCount);

    for (let i = 0; i < starCount; i++) {
        // Position stars in a large sphere around the scene
        const radius = 50 + Math.random() * 150;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos((Math.random() * 2) - 1);

        positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
        positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
        positions[i * 3 + 2] = radius * Math.cos(phi);

        // Vary star colors (white, blue-white, slightly gold)
        const colorChoice = Math.random();
        if (colorChoice < 0.6) {
            // White stars
            colors[i * 3] = 0.9 + Math.random() * 0.1;
            colors[i * 3 + 1] = 0.9 + Math.random() * 0.1;
            colors[i * 3 + 2] = 1.0;
        } else if (colorChoice < 0.85) {
            // Blue-white stars
            colors[i * 3] = 0.7 + Math.random() * 0.2;
            colors[i * 3 + 1] = 0.8 + Math.random() * 0.2;
            colors[i * 3 + 2] = 1.0;
        } else {
            // Golden stars
            colors[i * 3] = 1.0;
            colors[i * 3 + 1] = 0.85 + Math.random() * 0.15;
            colors[i * 3 + 2] = 0.5 + Math.random() * 0.3;
        }

        sizes[i] = 0.5 + Math.random() * 1.5;
    }

    starsGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    starsGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    starsGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const starsMaterial = new THREE.PointsMaterial({
        size: 0.8,
        vertexColors: true,
        transparent: true,
        opacity: 0.9,
        sizeAttenuation: true
    });

    starField = new THREE.Points(starsGeometry, starsMaterial);
    scene.add(starField);
}

/**
 * Create enhanced grid with better visuals
 */
function createEnhancedGrid() {
    // Main grid with cosmic colors
    const gridSize = 40;
    const divisions = 40;

    const gridHelper = new THREE.GridHelper(gridSize, divisions, 0x0066aa, 0x0a1a2a);
    gridHelper.position.y = 0;
    gridHelper.material.opacity = 0.35;
    gridHelper.material.transparent = true;
    scene.add(gridHelper);

    // Secondary finer grid with subtle glow
    const fineGrid = new THREE.GridHelper(gridSize, divisions * 2, 0x004488, 0x081018);
    fineGrid.position.y = 0.001;
    fineGrid.material.opacity = 0.15;
    fineGrid.material.transparent = true;
    scene.add(fineGrid);

    // ✨ Subtle white accent grid lines (3B1B style)
    const accentGrid = new THREE.GridHelper(gridSize, 8, 0xffffff, 0xffffff);
    accentGrid.position.y = 0.002;
    accentGrid.material.opacity = 0.08;
    accentGrid.material.transparent = true;
    scene.add(accentGrid);
}

/**
 * Create enhanced axes with labels and arrows
 */
function createEnhancedAxes() {
    const axisLength = 15;
    // Cosmic axis colors: Stellar Cyan (X), Aurora Green (Y), Cosmic Pink (Z)
    const axisData = [
        { dir: [1, 0, 0], color: 0x00d4ff, label: 'X', labelColor: '#00d4ff' },
        { dir: [0, 1, 0], color: 0x00ff88, label: 'Y', labelColor: '#00ff88' },
        { dir: [0, 0, 1], color: 0xff6b9d, label: 'Z', labelColor: '#ff6b9d' }
    ];

    axisData.forEach(axis => {
        const dir = new THREE.Vector3(...axis.dir);
        const origin = new THREE.Vector3(0, 0, 0);

        // Arrow helper
        const arrow = new THREE.ArrowHelper(dir, origin, axisLength, axis.color, 0.5, 0.3);
        scene.add(arrow);

        // Negative direction line
        const negDir = dir.clone().multiplyScalar(-1);
        const negGeometry = new THREE.BufferGeometry().setFromPoints([
            origin,
            negDir.clone().multiplyScalar(axisLength)
        ]);
        const negMaterial = new THREE.LineDashedMaterial({
            color: axis.color,
            dashSize: 0.3,
            gapSize: 0.2,
            opacity: 0.5,
            transparent: true
        });
        const negLine = new THREE.Line(negGeometry, negMaterial);
        negLine.computeLineDistances();
        scene.add(negLine);

        // Axis label
        addLabel3D(axis.label, dir.clone().multiplyScalar(axisLength + 1), axis.labelColor, 1.2);
    });

    // Origin label
    addLabel3D('O', new THREE.Vector3(-0.5, -0.5, 0), '#94a3b8', 0.8);

    // Add tick marks
    for (let i = -10; i <= 10; i++) {
        if (i === 0) continue;

        // X axis ticks
        addSmallLabel(i.toString(), new THREE.Vector3(i, -0.5, 0), '#94a3b8');
        // Y axis ticks  
        addSmallLabel(i.toString(), new THREE.Vector3(-0.5, i, 0), '#94a3b8');
        // Z axis ticks
        addSmallLabel(i.toString(), new THREE.Vector3(0, -0.5, i), '#94a3b8');
    }
}

/**
 * Add small tick labels
 */
function addSmallLabel(text, position, color) {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = 64;
    canvas.height = 32;

    context.fillStyle = color;
    context.font = '18px JetBrains Mono';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(text, 32, 16);

    const texture = new THREE.CanvasTexture(canvas);
    const spriteMaterial = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        opacity: 0.6
    });
    const sprite = new THREE.Sprite(spriteMaterial);
    sprite.position.copy(position);
    sprite.scale.set(0.6, 0.3, 1);
    scene.add(sprite);
}

/**
 * Enhanced lighting setup
 */
function setupLighting() {
    // Ambient light with slight blue tint (space atmosphere)
    const ambient = new THREE.AmbientLight(0x8899bb, 0.4);
    scene.add(ambient);

    // Main directional light (sun-like)
    const mainLight = new THREE.DirectionalLight(0xffeedd, 0.9);
    mainLight.position.set(10, 20, 10);
    mainLight.castShadow = true;
    scene.add(mainLight);

    // Nebula purple accent light
    const nebulaLight = new THREE.DirectionalLight(0xb44aff, 0.35);
    nebulaLight.position.set(-15, 8, -10);
    scene.add(nebulaLight);

    // Stellar cyan rim light
    const cyanLight = new THREE.DirectionalLight(0x00d4ff, 0.25);
    cyanLight.position.set(0, -5, 15);
    scene.add(cyanLight);

    // Cosmic pink fill light
    const pinkLight = new THREE.DirectionalLight(0xff6b9d, 0.15);
    pinkLight.position.set(15, 5, -15);
    scene.add(pinkLight);
}

function onResize() {
    if (!container || !camera || !renderer) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
}

function animate() {
    animationFrameId = requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}

/**
 * Render visualization data
 * @param {object} data - Visualization data with objects array
 * @param {object} options - Render options (plane, animationProgress, animationType)
 */
export function render3D(data, options = {}) {
    clearObjects();

    const legendItems = [];
    const animProgress = options.animationProgress !== undefined ? options.animationProgress : 1;
    const animType = options.animationType || 'none';
    const revealParams = options.revealParams || null;

    // Extract reveal animation parameters
    const revealScale = revealParams?.scale ?? 1;
    const revealPhiLength = revealParams?.phiLength ?? Math.PI;
    const revealSweepProgress = revealParams?.sweepProgress ?? 1;
    const revealWireframeOpacity = revealParams?.wireframeOpacity ?? 0.3;
    const revealSolidOpacity = revealParams?.solidOpacity ?? 0.7;
    const revealTraceProgress = revealParams?.traceProgress ?? 1;

    // Set view range (only on first render, not during animation)
    if (data.view && animProgress === 1) {
        const range = Math.max(
            Math.abs(data.view.x_range?.[0] || 10),
            Math.abs(data.view.x_range?.[1] || 10),
            Math.abs(data.view.y_range?.[0] || 10),
            Math.abs(data.view.y_range?.[1] || 10),
            Math.abs(data.view.z_range?.[0] || 10),
            Math.abs(data.view.z_range?.[1] || 10)
        );
        const distance = Math.max(range * 1.5, 8);
        camera.position.set(distance * 0.7, distance * 0.5, distance * 0.7);
        controls.update();
    }

    // Animation options to pass to each render function
    const animOptions = {
        scale: revealScale,
        phiLength: revealPhiLength,
        sweepProgress: revealSweepProgress,
        wireframeOpacity: revealWireframeOpacity,
        solidOpacity: revealSolidOpacity,
        traceProgress: revealTraceProgress,
        animationType: revealParams?.type || animType
    };

    // Render each object (with animation support for ALL types)
    data.objects.forEach((obj, index) => {
        const color = obj.color || getDefaultColor(obj.kind);

        switch (obj.kind) {
            case 'vector3d':
                renderVector3D(obj, color, animOptions);
                legendItems.push({ color, label: obj.label || `Vector ${index + 1}` });
                break;
            case 'vector2d':
                // Render 2D vector in XY plane in 3D view
                renderVector2DIn3D(obj, color, animOptions);
                legendItems.push({ color, label: obj.label || `Vector ${index + 1}` });
                break;
            case 'plane3d':
                renderPlane3D(obj, color, animOptions);
                legendItems.push({ color, label: obj.label || `Plane ${index + 1}` });
                break;
            case 'line3d':
                renderLine3D(obj, color, animOptions);
                legendItems.push({ color, label: obj.label || `Line ${index + 1}` });
                break;
            case 'line2d':
                renderLine2DIn3D(obj, color, animOptions);
                legendItems.push({ color, label: obj.label || `Line ${index + 1}` });
                break;
            case 'point3d':
                renderPoint3D(obj, color, animOptions);
                legendItems.push({ color, label: obj.label || `Point ${index + 1}` });
                break;
            case 'point2d':
                renderPoint2DIn3D(obj, color, animOptions);
                legendItems.push({ color, label: obj.label || `Point ${index + 1}` });
                break;
            case 'function2d':
                renderFunction2DIn3D(obj, color, data.view, animOptions);
                legendItems.push({ color, label: obj.label || obj.expression });
                break;
            case 'function3d':
                renderFunction3D(obj, color, data.view, animOptions);
                legendItems.push({ color, label: obj.label || obj.expression });
                break;
            case 'parametric2d':
                renderParametric2DIn3D(obj, color, animOptions);
                legendItems.push({ color, label: obj.label || 'Parametric Curve' });
                break;
            case 'parametric3d':
                renderParametric3D(obj, color, animOptions);
                legendItems.push({ color, label: obj.label || 'Parametric Curve' });
                break;
            case 'circle2d':
                renderCircle2DIn3D(obj, color);
                legendItems.push({ color, label: obj.label || 'Circle' });
                break;
            case 'sphere3d':
                renderSphere3D(obj, color, animOptions);
                legendItems.push({ color, label: obj.label || 'Sphere' });
                break;
            case 'ellipsoid3d':
                renderEllipsoid3D(obj, color);
                legendItems.push({ color, label: obj.label || 'Ellipsoid' });
                break;
            case 'cylinder3d':
                renderCylinder3D(obj, color);
                legendItems.push({ color, label: obj.label || 'Cylinder' });
                break;
            case 'cone3d':
                renderCone3D(obj, color);
                legendItems.push({ color, label: obj.label || 'Cone' });
                break;
            case 'torus3d':
                renderTorus3D(obj, color);
                legendItems.push({ color, label: obj.label || 'Torus' });
                break;
            case 'implicit_surface':
                renderImplicitSurface(obj, color, data.view);
                legendItems.push({ color, label: obj.label || 'Surface' });
                break;
        }
    });

    return legendItems;
}

/**
 * Render a 3D vector as an enhanced arrow with animation support
 */
function renderVector3D(obj, color, animOptions = {}) {
    const tail = new THREE.Vector3(...(obj.tail || [0, 0, 0]));
    const fullHead = new THREE.Vector3(...obj.head);
    const fullDirection = fullHead.clone().sub(tail);
    const fullLength = fullDirection.length();

    if (fullLength === 0) return;

    // Apply scale_grow animation: vector grows from tail towards head
    const scale = animOptions.scale ?? 1;
    const animatedLength = fullLength * scale;

    if (animatedLength < 0.01) return;  // Skip if too small

    fullDirection.normalize();
    const head = tail.clone().add(fullDirection.clone().multiplyScalar(animatedLength));
    const direction = fullDirection;
    const length = animatedLength;

    // Create arrow with better proportions
    const arrowHelper = new THREE.ArrowHelper(
        direction,
        tail,
        length,
        new THREE.Color(color),
        Math.min(length * 0.15, 0.6),
        Math.min(length * 0.08, 0.3)
    );

    // Make the line thicker
    arrowHelper.line.material.linewidth = 3;

    scene.add(arrowHelper);
    objects.push(arrowHelper);

    // Add glow effect (only when animation complete for performance)
    if (scale > 0.9) {
        const glowGeometry = new THREE.CylinderGeometry(0.03, 0.03, length * 0.85, 8);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: new THREE.Color(color),
            transparent: true,
            opacity: 0.3
        });
        const glow = new THREE.Mesh(glowGeometry, glowMaterial);

        // Position and orient the glow
        const midpoint = tail.clone().add(head).multiplyScalar(0.5);
        glow.position.copy(midpoint);
        glow.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);

        scene.add(glow);
        objects.push(glow);
    }

    // Add label when mostly visible
    if (scale > 0.8) {
        addLabel3D(obj.label, head.clone().add(direction.clone().multiplyScalar(0.5)), color);
    }
}

/**
 * Render 2D vector in 3D space (on XY plane)
 */
function renderVector2DIn3D(obj, color, animOptions = {}) {
    const tail = obj.tail || [0, 0];
    const head = obj.head;

    renderVector3D({
        ...obj,
        tail: [tail[0], tail[1], 0],
        head: [head[0], head[1], 0]
    }, color, animOptions);
}

/**
 * Render an enhanced 3D plane with animation support
 */
function renderPlane3D(obj, color, animOptions = {}) {
    const { a, b, c, d } = obj;
    const fullSize = 15;

    // Apply scale_grow animation: plane grows from center
    const scale = animOptions.scale ?? 1;
    if (scale < 0.01) return;  // Skip if too small

    const size = fullSize * scale;

    // Create plane mesh
    const geometry = new THREE.PlaneGeometry(size, size, Math.ceil(20 * scale), Math.ceil(20 * scale));

    const normal = new THREE.Vector3(a, b, c).normalize();

    // Solid fill with transparency
    const material = new THREE.MeshBasicMaterial({  // Use BasicMaterial during animation
        color: new THREE.Color(color),
        transparent: true,
        opacity: 0.25 * scale,
        side: THREE.DoubleSide
    });

    const plane = new THREE.Mesh(geometry, material);
    plane.lookAt(normal);

    const distanceFromOrigin = -d / Math.sqrt(a * a + b * b + c * c);
    plane.position.copy(normal.clone().multiplyScalar(distanceFromOrigin));

    scene.add(plane);
    objects.push(plane);

    // Add grid lines on the plane
    const gridMaterial = new THREE.LineBasicMaterial({
        color: new THREE.Color(color),
        transparent: true,
        opacity: 0.4
    });

    const gridLines = [];
    for (let i = -size / 2; i <= size / 2; i += 1) {
        gridLines.push(new THREE.Vector3(-size / 2, i, 0));
        gridLines.push(new THREE.Vector3(size / 2, i, 0));
        gridLines.push(new THREE.Vector3(i, -size / 2, 0));
        gridLines.push(new THREE.Vector3(i, size / 2, 0));
    }

    const gridGeometry = new THREE.BufferGeometry().setFromPoints(gridLines);
    const grid = new THREE.LineSegments(gridGeometry, gridMaterial);
    grid.lookAt(normal);
    grid.position.copy(plane.position);

    scene.add(grid);
    objects.push(grid);

    // Add border
    const borderPoints = [
        new THREE.Vector3(-size / 2, -size / 2, 0),
        new THREE.Vector3(size / 2, -size / 2, 0),
        new THREE.Vector3(size / 2, size / 2, 0),
        new THREE.Vector3(-size / 2, size / 2, 0),
        new THREE.Vector3(-size / 2, -size / 2, 0)
    ];

    const borderGeometry = new THREE.BufferGeometry().setFromPoints(borderPoints);
    const borderMaterial = new THREE.LineBasicMaterial({
        color: new THREE.Color(color),
        linewidth: 2
    });
    const border = new THREE.Line(borderGeometry, borderMaterial);
    border.lookAt(normal);
    border.position.copy(plane.position);

    scene.add(border);
    objects.push(border);
}

/**
 * Render a 3D line with animation support
 */
function renderLine3D(obj, color, animOptions = {}) {
    const point = new THREE.Vector3(...(obj.point || [0, 0, 0]));
    const direction = new THREE.Vector3(...(obj.direction || [1, 0, 0])).normalize();

    const fullLineLength = 25;

    // Apply scale_grow animation: line grows from center outward
    const scale = animOptions.scale ?? 1;
    if (scale < 0.01) return;  // Skip if too small

    const lineLength = fullLineLength * scale;
    const start = point.clone().sub(direction.clone().multiplyScalar(lineLength / 2));
    const end = point.clone().add(direction.clone().multiplyScalar(lineLength / 2));

    // Create tube geometry for thicker line
    const curve = new THREE.LineCurve3(start, end);
    const tubeGeometry = new THREE.TubeGeometry(curve, 1, 0.04, 6, false);
    const tubeMaterial = new THREE.MeshBasicMaterial({ color: new THREE.Color(color) });
    const tube = new THREE.Mesh(tubeGeometry, tubeMaterial);

    scene.add(tube);
    objects.push(tube);

    // Add glow only when animation complete
    if (scale > 0.9) {
        const glowTube = new THREE.Mesh(
            new THREE.TubeGeometry(curve, 1, 0.08, 8, false),
            new THREE.MeshBasicMaterial({
                color: new THREE.Color(color),
                transparent: true,
                opacity: 0.2
            })
        );
        scene.add(glowTube);
        objects.push(glowTube);
    }

    if (scale > 0.8) {
        addLabel3D(obj.label, point.clone().add(new THREE.Vector3(0.5, 0.5, 0)), color);
    }
}

/**
 * Render 2D line in 3D (on XY plane) with animation support
 */
function renderLine2DIn3D(obj, color, animOptions = {}) {
    const m = obj.m || 0;
    const b = obj.b || 0;

    // Apply scale_grow animation
    const scale = animOptions.scale ?? 1;
    const traceProgress = animOptions.traceProgress ?? 1;
    const progress = Math.max(scale, traceProgress);  // Use whichever animation type

    if (progress < 0.01) return;

    // Create points along the line
    const allPoints = [];
    for (let x = -15; x <= 15; x += 0.5) {
        const y = m * x + b;
        if (Math.abs(y) <= 20) {
            allPoints.push(new THREE.Vector3(x, y, 0));
        }
    }

    if (allPoints.length < 2) return;

    // Apply trace animation
    const visibleCount = Math.max(2, Math.floor(allPoints.length * progress));
    const points = allPoints.slice(0, visibleCount);

    const curve = new THREE.CatmullRomCurve3(points);
    const tubeGeometry = new THREE.TubeGeometry(curve, Math.min(points.length * 2, 60), 0.05, 4, false);
    const tubeMaterial = new THREE.MeshBasicMaterial({ color: new THREE.Color(color) });
    const tube = new THREE.Mesh(tubeGeometry, tubeMaterial);

    scene.add(tube);
    objects.push(tube);

    if (progress > 0.8) {
        addLabel3D(obj.label, new THREE.Vector3(2, m * 2 + b + 0.5, 0), color);
    }
}

/**
 * Render a 3D point with scale_grow animation
 */
function renderPoint3D(obj, color, animOptions = {}) {
    const position = new THREE.Vector3(...(obj.position || [0, 0, 0]));

    // Apply scale_grow animation
    const scale = animOptions.scale ?? 1;
    if (scale < 0.05) return;  // Skip if too small

    // Main sphere - size scales with animation
    const geometry = new THREE.SphereGeometry(0.2 * scale, 16, 16);
    const material = new THREE.MeshBasicMaterial({
        color: new THREE.Color(color)
    });

    const sphere = new THREE.Mesh(geometry, material);
    sphere.position.copy(position);

    scene.add(sphere);
    objects.push(sphere);

    // Glow effect only when animation complete
    if (scale > 0.9) {
        const glowGeometry = new THREE.SphereGeometry(0.35, 16, 16);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: new THREE.Color(color),
            transparent: true,
            opacity: 0.2
        });
        const glow = new THREE.Mesh(glowGeometry, glowMaterial);
        glow.position.copy(position);

        scene.add(glow);
        objects.push(glow);
    }

    if (scale > 0.8) {
        addLabel3D(obj.label, position.clone().add(new THREE.Vector3(0.4, 0.4, 0)), color);
    }
}

/**
 * Render 2D point in 3D
 */
function renderPoint2DIn3D(obj, color, animOptions = {}) {
    renderPoint3D({
        ...obj,
        position: [obj.x, obj.y, 0]
    }, color, animOptions);
}

/**
 * Parse and evaluate a math expression
 */
function evaluateExpression(expr, vars) {
    let e = expr.toLowerCase()
        .replace(/\^/g, '**')
        .replace(/sin/g, 'Math.sin')
        .replace(/cos/g, 'Math.cos')
        .replace(/tan/g, 'Math.tan')
        .replace(/sqrt/g, 'Math.sqrt')
        .replace(/abs/g, 'Math.abs')
        .replace(/log/g, 'Math.log')
        .replace(/exp/g, 'Math.exp')
        .replace(/pi/g, 'Math.PI')
        .replace(/e(?![xp])/g, 'Math.E');

    // Handle implicit multiplication: 2x -> 2*x, 3sin -> 3*sin
    e = e.replace(/(\d)([a-z])/g, '$1*$2');
    e = e.replace(/(\))(\()/g, '$1*$2');
    e = e.replace(/(\d)(\()/g, '$1*$2');

    try {
        const varNames = Object.keys(vars);
        const varValues = Object.values(vars);
        const fn = new Function(...varNames, `return ${e}`);
        const result = fn(...varValues);
        return isFinite(result) ? result : NaN;
    } catch {
        return NaN;
    }
}

/**
 * Render a 2D function in 3D (as a curve on XY plane) with 3B1B trace animation
 * @param {object} animOptions - Animation options for trace drawing
 */
function renderFunction2DIn3D(obj, color, view, animOptions = {}) {
    const expr = obj.expression;
    const xMin = view?.x_range?.[0] || -10;
    const xMax = view?.x_range?.[1] || 10;

    // Use fewer points during animation for smoother performance
    const traceProgress = animOptions.traceProgress ?? 1;
    const isAnimating = traceProgress < 1;
    const numPoints = isAnimating ? 100 : 200;  // Reduce complexity during animation
    const step = (xMax - xMin) / numPoints;

    const allPoints = [];

    for (let x = xMin; x <= xMax; x += step) {
        const y = evaluateExpression(expr, { x });
        if (!isNaN(y) && isFinite(y) && Math.abs(y) < 100) {
            allPoints.push(new THREE.Vector3(x, y, 0));
        }
    }

    if (allPoints.length < 2) return;

    // Apply trace animation: only show portion of points
    const visibleCount = Math.max(2, Math.floor(allPoints.length * traceProgress));
    const points = allPoints.slice(0, visibleCount);

    if (points.length < 2) return;

    // Use simpler tube geometry during animation
    const tubeSegments = isAnimating ? 4 : 8;
    const curve = new THREE.CatmullRomCurve3(points);
    const tubeGeometry = new THREE.TubeGeometry(curve, Math.min(points.length, 100), 0.06, tubeSegments, false);
    const tubeMaterial = new THREE.MeshBasicMaterial({  // Use BasicMaterial for speed during animation
        color: new THREE.Color(color)
    });
    const tube = new THREE.Mesh(tubeGeometry, tubeMaterial);

    scene.add(tube);
    objects.push(tube);

    // Only add glow when not animating (performance)
    if (!isAnimating) {
        const glowGeometry = new THREE.TubeGeometry(curve, points.length, 0.12, 8, false);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: new THREE.Color(color),
            transparent: true,
            opacity: 0.2
        });
        const glow = new THREE.Mesh(glowGeometry, glowMaterial);
        scene.add(glow);
        objects.push(glow);
    }

    // Add a glowing "pen" point at the drawing tip during animation
    if (isAnimating && points.length > 0) {
        const tipPoint = points[points.length - 1];
        const tipGeometry = new THREE.SphereGeometry(0.12, 8, 8);  // Simpler sphere
        const tipMaterial = new THREE.MeshBasicMaterial({
            color: new THREE.Color(color)
        });
        const tip = new THREE.Mesh(tipGeometry, tipMaterial);
        tip.position.copy(tipPoint);
        scene.add(tip);
        objects.push(tip);
    }

    // Label at final visible point
    if (traceProgress > 0.9 && points.length > 0) {
        const labelPoint = points[points.length - 1].clone().add(new THREE.Vector3(0.5, 0.5, 0));
        addLabel3D(obj.label, labelPoint, color);
    }
}

/**
 * Render a 3D surface function z = f(x, y) with 3B1B animations
 * @param {object} animOptions - Animation options for reveal effects
 */
function renderFunction3D(obj, color, view, animOptions = {}) {
    const expr = obj.expression;
    const xMin = view?.x_range?.[0] || -5;
    const xMax = view?.x_range?.[1] || 5;
    const yMin = view?.y_range?.[0] || -5;
    const yMax = view?.y_range?.[1] || 5;

    // Get animation parameters
    const scale = animOptions.scale ?? 1;
    const wireframeOpacity = animOptions.wireframeOpacity ?? 0.3;
    const solidOpacity = animOptions.solidOpacity ?? 0.7;
    const animType = animOptions.animationType || 'none';

    const resolution = 50;
    const geometry = new THREE.PlaneGeometry(
        xMax - xMin,
        yMax - yMin,
        resolution,
        resolution
    );

    const positions = geometry.attributes.position;

    for (let i = 0; i < positions.count; i++) {
        const x = positions.getX(i) + (xMax + xMin) / 2;
        const y = positions.getY(i) + (yMax + yMin) / 2;
        let z = evaluateExpression(expr, { x, y });

        // Apply scale animation to z-values
        if (animType === 'scale_grow') {
            z = (isNaN(z) ? 0 : z) * scale;
        }

        positions.setX(i, x);
        positions.setY(i, y);
        positions.setZ(i, isNaN(z) ? 0 : Math.max(-10, Math.min(10, z)));
    }

    geometry.computeVertexNormals();

    // Surface material with animated opacity
    const material = new THREE.MeshPhongMaterial({
        color: new THREE.Color(color),
        side: THREE.DoubleSide,
        transparent: true,
        opacity: solidOpacity,
        shininess: 60,
        flatShading: false,
        emissive: new THREE.Color(color).multiplyScalar(0.1)
    });

    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);
    objects.push(mesh);

    // Wireframe overlay with animated opacity
    const wireframeMaterial = new THREE.MeshBasicMaterial({
        color: new THREE.Color(color),
        wireframe: true,
        transparent: true,
        opacity: wireframeOpacity
    });
    const wireframe = new THREE.Mesh(geometry.clone(), wireframeMaterial);
    scene.add(wireframe);
    objects.push(wireframe);
}

/**
 * Render parametric curve in 2D (displayed in 3D)
 */
function renderParametric2DIn3D(obj, color) {
    const tRange = obj.t_range || [0, 2 * Math.PI];
    const steps = 200;
    const dt = (tRange[1] - tRange[0]) / steps;

    const points = [];

    for (let i = 0; i <= steps; i++) {
        const t = tRange[0] + i * dt;
        const x = evaluateExpression(obj.x_expr, { t });
        const y = evaluateExpression(obj.y_expr, { t });

        if (!isNaN(x) && !isNaN(y) && isFinite(x) && isFinite(y)) {
            points.push(new THREE.Vector3(x, y, 0));
        }
    }

    if (points.length < 2) return;

    const curve = new THREE.CatmullRomCurve3(points);
    const tubeGeometry = new THREE.TubeGeometry(curve, points.length, 0.05, 8, false);
    const tubeMaterial = new THREE.MeshPhongMaterial({
        color: new THREE.Color(color),
        emissive: new THREE.Color(color).multiplyScalar(0.2)
    });
    const tube = new THREE.Mesh(tubeGeometry, tubeMaterial);

    scene.add(tube);
    objects.push(tube);

    addLabel3D(obj.label, points[0].clone().add(new THREE.Vector3(0.5, 0.5, 0)), color);
}

/**
 * Render 3D parametric curve with trace animation support (OPTIMIZED for 120fps)
 * @param {object} animOptions - Animation options for trace drawing
 */
function renderParametric3D(obj, color, animOptions = {}) {
    const tRange = obj.t_range || [0, 2 * Math.PI];
    const traceProgress = animOptions.traceProgress ?? 1;
    const isAnimating = traceProgress < 1;

    // Use fewer steps during animation for smooth performance
    const steps = isAnimating ? 100 : 200;
    const dt = (tRange[1] - tRange[0]) / steps;

    const allPoints = [];

    for (let i = 0; i <= steps; i++) {
        const t = tRange[0] + i * dt;
        const x = evaluateExpression(obj.x_expr, { t });
        const y = evaluateExpression(obj.y_expr, { t });
        const z = evaluateExpression(obj.z_expr, { t });

        if (!isNaN(x) && !isNaN(y) && !isNaN(z) && isFinite(x) && isFinite(y) && isFinite(z)) {
            allPoints.push(new THREE.Vector3(x, y, z));
        }
    }

    if (allPoints.length < 2) return;

    // Apply trace animation
    const visibleCount = Math.max(2, Math.floor(allPoints.length * traceProgress));
    const points = allPoints.slice(0, visibleCount);

    if (points.length < 2) return;

    // Use simpler geometry during animation
    const tubeSegments = isAnimating ? 4 : 8;
    const curve = new THREE.CatmullRomCurve3(points);
    const tubeGeometry = new THREE.TubeGeometry(curve, Math.min(points.length, 80), 0.06, tubeSegments, false);

    // Use BasicMaterial during animation for speed, PhongMaterial when done
    const tubeMaterial = isAnimating
        ? new THREE.MeshBasicMaterial({ color: new THREE.Color(color) })
        : new THREE.MeshPhongMaterial({
            color: new THREE.Color(color),
            emissive: new THREE.Color(color).multiplyScalar(0.25),
            shininess: 80
        });

    const tube = new THREE.Mesh(tubeGeometry, tubeMaterial);
    scene.add(tube);
    objects.push(tube);

    // Only add glow when not animating (performance)
    if (!isAnimating) {
        const glowGeometry = new THREE.TubeGeometry(curve, points.length, 0.12, 8, false);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: new THREE.Color(color),
            transparent: true,
            opacity: 0.2
        });
        const glow = new THREE.Mesh(glowGeometry, glowMaterial);
        scene.add(glow);
        objects.push(glow);
    }

    // Add simple pen point during animation
    if (isAnimating && points.length > 0) {
        const tipPoint = points[points.length - 1];
        const tipGeometry = new THREE.SphereGeometry(0.1, 6, 6);  // Very simple sphere
        const tipMaterial = new THREE.MeshBasicMaterial({ color: new THREE.Color(color) });
        const tip = new THREE.Mesh(tipGeometry, tipMaterial);
        tip.position.copy(tipPoint);
        scene.add(tip);
        objects.push(tip);
    }

    // Label when animation complete
    if (traceProgress > 0.9 && points.length > 0) {
        addLabel3D(obj.label, points[points.length - 1].clone().add(new THREE.Vector3(0.5, 0.5, 0)), color);
    }
}

/**
 * Render 2D circle in 3D
 */
function renderCircle2DIn3D(obj, color) {
    const center = obj.center || [0, 0];
    const radius = obj.radius || 1;

    const curve = new THREE.EllipseCurve(
        center[0], center[1],
        radius, radius,
        0, 2 * Math.PI,
        false, 0
    );

    const points = curve.getPoints(100).map(p => new THREE.Vector3(p.x, p.y, 0));

    const curve3D = new THREE.CatmullRomCurve3(points);
    const tubeGeometry = new THREE.TubeGeometry(curve3D, 100, 0.05, 8, true);
    const tubeMaterial = new THREE.MeshPhongMaterial({
        color: new THREE.Color(color),
        emissive: new THREE.Color(color).multiplyScalar(0.2)
    });
    const tube = new THREE.Mesh(tubeGeometry, tubeMaterial);

    scene.add(tube);
    objects.push(tube);

    addLabel3D(obj.label, new THREE.Vector3(center[0], center[1] + radius + 0.5, 0), color);
}

/**
 * Render a 3D sphere with 3Blue1Brown-style reveal animations
 * @param {object} obj - Sphere object with center, radius
 * @param {string} color - Color
 * @param {object} animOptions - Animation options (scale, phiLength, wireframeOpacity, etc.)
 */
function renderSphere3D(obj, color, animOptions = {}) {
    const center = obj.center || [0, 0, 0];
    const radius = obj.radius || 1;
    const animType = animOptions.animationType || 'none';

    // Calculate animated values
    let displayRadius = radius;
    let phiLength = Math.PI;  // Full sphere by default
    let solidOpacity = 0.7;
    let wireframeOpacity = 0.3;

    // Apply animation type
    switch (animType) {
        case 'scale_grow':
            // Balloon inflate effect
            displayRadius = radius * (animOptions.scale ?? 1);
            break;

        case 'parametric_sweep':
            // Draw sphere from pole to pole (3B1B style)
            phiLength = animOptions.phiLength ?? Math.PI;
            break;

        case 'wireframe_morph':
            // Wireframe fades out as solid fades in
            wireframeOpacity = animOptions.wireframeOpacity ?? 0.3;
            solidOpacity = animOptions.solidOpacity ?? 0.7;
            break;
    }

    // Skip rendering if scale is too small
    if (displayRadius < 0.001 && animType === 'scale_grow') return;

    // Create sphere geometry with parametric sweep support
    const geometry = new THREE.SphereGeometry(
        displayRadius,
        64, 64,
        0, Math.PI * 2,  // theta: full circle around
        0, phiLength     // phi: animated from 0 to π
    );

    // Main sphere mesh with cosmic glow
    const material = new THREE.MeshPhongMaterial({
        color: new THREE.Color(color),
        transparent: true,
        opacity: solidOpacity,
        side: THREE.DoubleSide,
        shininess: 100,
        emissive: new THREE.Color(color).multiplyScalar(0.15)
    });

    const sphere = new THREE.Mesh(geometry, material);
    sphere.position.set(center[0], center[1], center[2]);

    scene.add(sphere);
    objects.push(sphere);

    // Wireframe overlay - always present but animated opacity
    const wireframeMaterial = new THREE.MeshBasicMaterial({
        color: new THREE.Color(color),
        wireframe: true,
        transparent: true,
        opacity: wireframeOpacity
    });
    const wireframe = new THREE.Mesh(geometry.clone(), wireframeMaterial);
    wireframe.position.set(center[0], center[1], center[2]);

    scene.add(wireframe);
    objects.push(wireframe);

    // Outer glow for cosmic effect (especially nice during animations)
    if (displayRadius > 0.1) {
        const glowGeometry = new THREE.SphereGeometry(
            displayRadius * 1.05,
            32, 32,
            0, Math.PI * 2,
            0, phiLength
        );
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: new THREE.Color(color),
            transparent: true,
            opacity: 0.1 * (animOptions.scale ?? 1),
            side: THREE.BackSide
        });
        const glow = new THREE.Mesh(glowGeometry, glowMaterial);
        glow.position.set(center[0], center[1], center[2]);

        scene.add(glow);
        objects.push(glow);
    }

    // Add label (only when mostly visible)
    if ((animOptions.scale ?? 1) > 0.5) {
        addLabel3D(obj.label, new THREE.Vector3(center[0], center[1] + displayRadius + 0.5, center[2]), color);
    }
}

/**
 * Render a 3D ellipsoid with different semi-axes (a, b, c)
 * Equation: x²/a² + y²/b² + z²/c² = 1
 */
function renderEllipsoid3D(obj, color) {
    const center = obj.center || [0, 0, 0];
    // Semi-axes: a (x), b (y), c (z)
    const a = obj.a || obj.radius || 1;
    const b = obj.b || obj.radius || 1;
    const c = obj.c || obj.radius || 1;

    // Create a unit sphere and scale it to ellipsoid dimensions
    const geometry = new THREE.SphereGeometry(1, 64, 64);
    const material = new THREE.MeshPhongMaterial({
        color: new THREE.Color(color),
        transparent: true,
        opacity: 0.7,
        side: THREE.DoubleSide,
        shininess: 80
    });

    const ellipsoid = new THREE.Mesh(geometry, material);
    ellipsoid.position.set(center[0], center[1], center[2]);
    ellipsoid.scale.set(a, b, c);  // Scale to semi-axes

    scene.add(ellipsoid);
    objects.push(ellipsoid);

    // Wireframe overlay for better visibility
    const wireframeMaterial = new THREE.MeshBasicMaterial({
        color: new THREE.Color(color),
        wireframe: true,
        transparent: true,
        opacity: 0.3
    });
    const wireframe = new THREE.Mesh(geometry.clone(), wireframeMaterial);
    wireframe.position.set(center[0], center[1], center[2]);
    wireframe.scale.set(a, b, c);

    scene.add(wireframe);
    objects.push(wireframe);

    // Add label at top of ellipsoid
    const maxRadius = Math.max(a, b, c);
    addLabel3D(obj.label, new THREE.Vector3(center[0], center[1] + c + 0.5, center[2]), color);
}

/**
 * Render a 3D cylinder
 */
function renderCylinder3D(obj, color) {
    const center = obj.center || [0, 0, 0];
    const radius = obj.radius || 1;
    const height = obj.height || 2;

    const geometry = new THREE.CylinderGeometry(radius, radius, height, 64, 1, false);
    const material = new THREE.MeshPhongMaterial({
        color: new THREE.Color(color),
        transparent: true,
        opacity: 0.7,
        side: THREE.DoubleSide,
        shininess: 80
    });

    const cylinder = new THREE.Mesh(geometry, material);
    cylinder.position.set(center[0], center[1], center[2]);

    scene.add(cylinder);
    objects.push(cylinder);

    // Wireframe overlay
    const wireframeMaterial = new THREE.MeshBasicMaterial({
        color: new THREE.Color(color),
        wireframe: true,
        transparent: true,
        opacity: 0.3
    });
    const wireframe = new THREE.Mesh(geometry.clone(), wireframeMaterial);
    wireframe.position.set(center[0], center[1], center[2]);

    scene.add(wireframe);
    objects.push(wireframe);

    addLabel3D(obj.label, new THREE.Vector3(center[0], center[1] + height / 2 + 0.5, center[2]), color);
}

/**
 * Render a 3D cone
 */
function renderCone3D(obj, color) {
    const center = obj.center || [0, 0, 0];
    const radius = obj.radius || 1;
    const height = obj.height || 2;

    const geometry = new THREE.ConeGeometry(radius, height, 64, 1, false);
    const material = new THREE.MeshPhongMaterial({
        color: new THREE.Color(color),
        transparent: true,
        opacity: 0.7,
        side: THREE.DoubleSide,
        shininess: 80
    });

    const cone = new THREE.Mesh(geometry, material);
    cone.position.set(center[0], center[1], center[2]);

    scene.add(cone);
    objects.push(cone);

    // Wireframe overlay
    const wireframeMaterial = new THREE.MeshBasicMaterial({
        color: new THREE.Color(color),
        wireframe: true,
        transparent: true,
        opacity: 0.3
    });
    const wireframe = new THREE.Mesh(geometry.clone(), wireframeMaterial);
    wireframe.position.set(center[0], center[1], center[2]);

    scene.add(wireframe);
    objects.push(wireframe);

    addLabel3D(obj.label, new THREE.Vector3(center[0], center[1] + height / 2 + 0.5, center[2]), color);
}

/**
 * Render a 3D torus (donut shape)
 */
function renderTorus3D(obj, color) {
    const center = obj.center || [0, 0, 0];
    const majorRadius = obj.major_radius || obj.R || 2;
    const minorRadius = obj.minor_radius || obj.r || 0.5;

    const geometry = new THREE.TorusGeometry(majorRadius, minorRadius, 32, 100);
    const material = new THREE.MeshPhongMaterial({
        color: new THREE.Color(color),
        transparent: true,
        opacity: 0.7,
        side: THREE.DoubleSide,
        shininess: 80
    });

    const torus = new THREE.Mesh(geometry, material);
    torus.position.set(center[0], center[1], center[2]);

    scene.add(torus);
    objects.push(torus);

    // Wireframe overlay
    const wireframeMaterial = new THREE.MeshBasicMaterial({
        color: new THREE.Color(color),
        wireframe: true,
        transparent: true,
        opacity: 0.3
    });
    const wireframe = new THREE.Mesh(geometry.clone(), wireframeMaterial);
    wireframe.position.set(center[0], center[1], center[2]);

    scene.add(wireframe);
    objects.push(wireframe);

    addLabel3D(obj.label, new THREE.Vector3(center[0], center[1] + minorRadius + 0.5, center[2]), color);
}

/**
 * Render an implicit surface f(x,y,z) = 0 using marching cubes
 */
function renderImplicitSurface(obj, color, view) {
    const equation = obj.equation;
    if (!equation) return;

    // Determine bounds from view or object properties
    const minBound = obj.bounds?.min ?? view?.x_range?.[0] ?? -5;
    const maxBound = obj.bounds?.max ?? view?.x_range?.[1] ?? 5;
    const resolution = obj.resolution || 40;

    try {
        // Generate mesh using marching cubes
        const { vertices, indices } = generateImplicitSurfaceMesh(
            equation,
            { min: minBound, max: maxBound },
            resolution
        );

        if (vertices.length === 0) {
            console.warn('No surface found for equation:', equation);
            return;
        }

        // Create Three.js geometry from mesh data
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
        geometry.setIndex(new THREE.BufferAttribute(indices, 1));
        geometry.computeVertexNormals();

        // Main surface material
        const material = new THREE.MeshPhongMaterial({
            color: new THREE.Color(color),
            transparent: true,
            opacity: 0.75,
            side: THREE.DoubleSide,
            shininess: 60,
            flatShading: false
        });

        const mesh = new THREE.Mesh(geometry, material);
        scene.add(mesh);
        objects.push(mesh);

        // Wireframe overlay for better visibility
        const wireframeMaterial = new THREE.MeshBasicMaterial({
            color: new THREE.Color(color),
            wireframe: true,
            transparent: true,
            opacity: 0.2
        });
        const wireframe = new THREE.Mesh(geometry.clone(), wireframeMaterial);
        scene.add(wireframe);
        objects.push(wireframe);

        // Add label at center
        addLabel3D(obj.label, new THREE.Vector3(0, maxBound + 0.5, 0), color);

    } catch (error) {
        console.error('Error rendering implicit surface:', error);
    }
}

/**
 * Add a text label in 3D space
 */
function addLabel3D(text, position, color, scale = 1) {
    if (!text) return;

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = 256;
    canvas.height = 64;

    // Background
    context.fillStyle = 'rgba(15, 22, 41, 0.85)';
    context.roundRect(4, 4, canvas.width - 8, canvas.height - 8, 8);
    context.fill();

    // Border
    context.strokeStyle = color;
    context.lineWidth = 2;
    context.roundRect(4, 4, canvas.width - 8, canvas.height - 8, 8);
    context.stroke();

    // Text
    context.fillStyle = color;
    context.font = 'bold 28px JetBrains Mono';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(text, canvas.width / 2, canvas.height / 2);

    const texture = new THREE.CanvasTexture(canvas);
    const spriteMaterial = new THREE.SpriteMaterial({
        map: texture,
        transparent: true
    });
    const sprite = new THREE.Sprite(spriteMaterial);

    sprite.position.copy(position);
    sprite.scale.set(2 * scale, 0.5 * scale, 1);

    scene.add(sprite);
    objects.push(sprite);
}

function getDefaultColor(kind) {
    if (kind.includes('vector')) return DEFAULT_COLORS.vector;
    if (kind.includes('plane')) return DEFAULT_COLORS.plane;
    if (kind.includes('line')) return DEFAULT_COLORS.line;
    if (kind.includes('point')) return DEFAULT_COLORS.point;
    if (kind.includes('function')) return DEFAULT_COLORS.function;
    if (kind.includes('parametric')) return DEFAULT_COLORS.function;
    return '#ffffff';
}

function clearObjects() {
    objects.forEach(obj => {
        scene.remove(obj);
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
            if (Array.isArray(obj.material)) {
                obj.material.forEach(m => m.dispose());
            } else {
                obj.material.dispose();
            }
        }
    });
    objects = [];
}

export function dispose3D() {
    clearObjects();

    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
    }

    if (renderer) {
        renderer.dispose();
        if (renderer.domElement && renderer.domElement.parentNode) {
            renderer.domElement.parentNode.removeChild(renderer.domElement);
        }
    }

    if (controls) {
        controls.dispose();
    }

    window.removeEventListener('resize', onResize);

    scene = null;
    camera = null;
    renderer = null;
    controls = null;
}

/**
 * Reset camera to default position
 */
export function resetCamera() {
    if (camera && controls) {
        camera.position.set(12, 10, 12);
        controls.target.set(0, 0, 0);
        controls.update();
    }
}

/**
 * Toggle auto-rotate
 */
export function toggleAutoRotate() {
    if (controls) {
        controls.autoRotate = !controls.autoRotate;
        return controls.autoRotate;
    }
    return false;
}

export function getScene() {
    return { scene, camera, renderer, controls };
}
