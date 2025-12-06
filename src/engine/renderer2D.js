/**
 * 2D Renderer Engine - Enhanced
 * Uses Canvas API to render vectors, lines, points, and functions with better graphics
 */

import { safeEvaluate } from '../utils/safeEvaluator.js';

let canvas = null;
let ctx = null;
let viewConfig = {
    xRange: [-10, 10],
    yRange: [-10, 10],
    padding: 50
};

const DEFAULT_COLORS = {
    vector: '#ff6b6b',
    line: '#f59e0b',
    point: '#fbbf24',
    function: '#06b6d4',
    grid: '#1a1a3a',
    axis: '#4a4a6a',
    text: '#94a3b8'
};

export function init2D(canvasElement) {
    canvas = canvasElement;
    ctx = canvas.getContext('2d');

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
}

function resizeCanvas() {
    if (!canvas) return;

    const container = canvas.parentElement;
    const dpr = window.devicePixelRatio || 1;

    canvas.width = container.clientWidth * dpr;
    canvas.height = container.clientHeight * dpr;
    canvas.style.width = container.clientWidth + 'px';
    canvas.style.height = container.clientHeight + 'px';

    ctx.scale(dpr, dpr);
}

function toCanvasX(x) {
    const { xRange, padding } = viewConfig;
    const width = canvas.width / (window.devicePixelRatio || 1) - padding * 2;
    return padding + ((x - xRange[0]) / (xRange[1] - xRange[0])) * width;
}

function toCanvasY(y) {
    const { yRange, padding } = viewConfig;
    const height = canvas.height / (window.devicePixelRatio || 1) - padding * 2;
    return padding + ((yRange[1] - y) / (yRange[1] - yRange[0])) * height;
}

function fromCanvasX(cx) {
    const { xRange, padding } = viewConfig;
    const width = canvas.width / (window.devicePixelRatio || 1) - padding * 2;
    return xRange[0] + ((cx - padding) / width) * (xRange[1] - xRange[0]);
}

export function render2D(data, options = {}) {
    if (!canvas || !ctx) return [];

    const plane = options.plane || 'xy';

    if (data.view) {
        viewConfig.xRange = data.view.x_range || [-10, 10];
        viewConfig.yRange = data.view.y_range || [-10, 10];
    }

    const width = canvas.width / (window.devicePixelRatio || 1);
    const height = canvas.height / (window.devicePixelRatio || 1);

    // Gradient background
    const gradient = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, width * 0.7);
    gradient.addColorStop(0, '#0f1629');
    gradient.addColorStop(1, '#0a0f1a');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    drawGrid(plane);
    drawAxes(plane);

    const legendItems = [];

    data.objects.forEach((obj, index) => {
        const color = obj.color || getDefaultColor(obj.kind);

        // Handle native 2D objects
        switch (obj.kind) {
            case 'vector2d':
                renderVector2D(obj, color);
                legendItems.push({ color, label: obj.label || `Vector ${index + 1}` });
                break;
            case 'line2d':
                renderLine2D(obj, color);
                legendItems.push({ color, label: obj.label || `Line ${index + 1}` });
                break;
            case 'point2d':
                renderPoint2D(obj, color);
                legendItems.push({ color, label: obj.label || `Point ${index + 1}` });
                break;
            case 'function2d':
                renderFunction2D(obj, color);
                legendItems.push({ color, label: obj.label || obj.expression });
                break;
            case 'parametric2d':
                renderParametric2D(obj, color);
                legendItems.push({ color, label: obj.label || 'Parametric Curve' });
                break;
            case 'circle2d':
                renderCircle2D(obj, color);
                legendItems.push({ color, label: obj.label || 'Circle' });
                break;
            // Project 3D objects onto selected plane
            case 'vector3d':
                renderVector3DProjection(obj, color, plane);
                legendItems.push({ color, label: `${obj.label || 'Vector'} (${plane.toUpperCase()})` });
                break;
            case 'point3d':
                renderPoint3DProjection(obj, color, plane);
                legendItems.push({ color, label: `${obj.label || 'Point'} (${plane.toUpperCase()})` });
                break;
            case 'line3d':
                renderLine3DProjection(obj, color, plane);
                legendItems.push({ color, label: `${obj.label || 'Line'} (${plane.toUpperCase()})` });
                break;
            case 'function3d':
                // Project 3D function as contour/slice
                renderFunction3DProjection(obj, color, plane, data.view);
                legendItems.push({ color, label: `${obj.label || 'Surface'} slice (${plane.toUpperCase()})` });
                break;
        }
    });

    return legendItems;
}

/**
 * Project a 3D point onto the selected plane
 */
function project3DTo2D(point, plane) {
    const [x, y, z] = point;
    switch (plane) {
        case 'xy': return [x, y];       // Top view
        case 'xz': return [x, z];       // Front view
        case 'yz': return [y, z];       // Side view
        default: return [x, y];
    }
}

/**
 * Render 3D vector projected onto 2D plane
 */
function renderVector3DProjection(obj, color, plane) {
    const tail3D = obj.tail || [0, 0, 0];
    const head3D = obj.head;

    const tail2D = project3DTo2D(tail3D, plane);
    const head2D = project3DTo2D(head3D, plane);

    renderVector2D({ tail: tail2D, head: head2D, label: obj.label }, color);
}

/**
 * Render 3D point projected onto 2D plane
 */
function renderPoint3DProjection(obj, color, plane) {
    const pos3D = obj.position || [0, 0, 0];
    const pos2D = project3DTo2D(pos3D, plane);

    renderPoint2D({ x: pos2D[0], y: pos2D[1], label: obj.label }, color);
}

/**
 * Render 3D line projected onto 2D plane
 */
function renderLine3DProjection(obj, color, plane) {
    const point = obj.point || [0, 0, 0];
    const dir = obj.direction || [1, 0, 0];

    // Create two points along the line
    const p1 = [point[0] - dir[0] * 10, point[1] - dir[1] * 10, point[2] - dir[2] * 10];
    const p2 = [point[0] + dir[0] * 10, point[1] + dir[1] * 10, point[2] + dir[2] * 10];

    const p1_2D = project3DTo2D(p1, plane);
    const p2_2D = project3DTo2D(p2, plane);

    // Draw as a line connecting the projected points
    const dx = p2_2D[0] - p1_2D[0];
    const dy = p2_2D[1] - p1_2D[1];
    const len = Math.sqrt(dx * dx + dy * dy);

    if (len > 0.01) {
        const m = dy / dx;
        const b = p1_2D[1] - m * p1_2D[0];
        renderLine2D({ m, b, label: obj.label }, color);
    }
}

/**
 * Render 3D function as a slice on the selected plane
 */
function renderFunction3DProjection(obj, color, plane, view) {
    const expr = obj.expression;
    const xRange = view?.x_range || [-5, 5];
    const yRange = view?.y_range || [-5, 5];

    // For z=f(x,y), show slice at y=0 (XZ) or x=0 (YZ) or contour at z=0 (XY)
    if (plane === 'xz') {
        // Slice at y=0: z = f(x, 0)
        renderFunction2D({
            expression: expr.replace(/y/g, '0'),
            label: obj.label ? `${obj.label} (y=0)` : 'z = f(x, 0)'
        }, color);
    } else if (plane === 'yz') {
        // Slice at x=0: z = f(0, y) - swap x with y for display
        const yExpr = expr.replace(/x/g, '0').replace(/y/g, 'x');
        renderFunction2D({
            expression: yExpr,
            label: obj.label ? `${obj.label} (x=0)` : 'z = f(0, y)'
        }, color);
    } else {
        // XY plane - draw contour lines at different z values
        const contourLevels = [-2, -1, 0, 1, 2];
        contourLevels.forEach((zLevel, i) => {
            const alpha = 0.3 + (i / contourLevels.length) * 0.7;
            ctx.globalAlpha = alpha;
            // This is a simplified contour - just show the label
        });
        ctx.globalAlpha = 1;

        // Show a note about the view
        ctx.fillStyle = color;
        ctx.font = '14px JetBrains Mono';
        ctx.textAlign = 'center';
        ctx.fillText(`Surface: ${obj.label || expr}`, canvas.width / 4, 60);
        ctx.fillText('(Switch to XZ or YZ for cross-section)', canvas.width / 4, 80);
    }
}

function drawGrid(plane = 'xy') {
    const { xRange, yRange } = viewConfig;

    // Fine grid
    ctx.strokeStyle = '#151530';
    ctx.lineWidth = 1;

    const stepX = (xRange[1] - xRange[0]) / 40;
    for (let x = xRange[0]; x <= xRange[1]; x += stepX) {
        ctx.beginPath();
        ctx.moveTo(toCanvasX(x), toCanvasY(yRange[0]));
        ctx.lineTo(toCanvasX(x), toCanvasY(yRange[1]));
        ctx.stroke();
    }

    const stepY = (yRange[1] - yRange[0]) / 40;
    for (let y = yRange[0]; y <= yRange[1]; y += stepY) {
        ctx.beginPath();
        ctx.moveTo(toCanvasX(xRange[0]), toCanvasY(y));
        ctx.lineTo(toCanvasX(xRange[1]), toCanvasY(y));
        ctx.stroke();
    }

    // Main grid
    ctx.strokeStyle = DEFAULT_COLORS.grid;
    ctx.lineWidth = 1;

    for (let x = Math.ceil(xRange[0]); x <= xRange[1]; x++) {
        ctx.beginPath();
        ctx.moveTo(toCanvasX(x), toCanvasY(yRange[0]));
        ctx.lineTo(toCanvasX(x), toCanvasY(yRange[1]));
        ctx.stroke();
    }

    for (let y = Math.ceil(yRange[0]); y <= yRange[1]; y++) {
        ctx.beginPath();
        ctx.moveTo(toCanvasX(xRange[0]), toCanvasY(y));
        ctx.lineTo(toCanvasX(xRange[1]), toCanvasY(y));
        ctx.stroke();
    }
}

function drawAxes(plane = 'xy') {
    const { xRange, yRange } = viewConfig;

    // Determine axis labels based on plane
    const axisLabels = {
        xy: { h: 'x', v: 'y' },
        xz: { h: 'x', v: 'z' },
        yz: { h: 'y', v: 'z' }
    };
    const labels = axisLabels[plane] || axisLabels.xy;

    // Horizontal axis (X for xy/xz, Y for yz)
    if (yRange[0] <= 0 && yRange[1] >= 0) {
        ctx.strokeStyle = '#ff6b6b';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(toCanvasX(xRange[0]), toCanvasY(0));
        ctx.lineTo(toCanvasX(xRange[1]), toCanvasY(0));
        ctx.stroke();

        drawArrowHead(toCanvasX(xRange[1]), toCanvasY(0), 0, '#ff6b6b');

        ctx.fillStyle = '#ff6b6b';
        ctx.font = 'bold 14px Inter';
        ctx.fillText(labels.h, toCanvasX(xRange[1]) + 15, toCanvasY(0) + 5);
    }

    // Vertical axis (Y for xy, Z for xz/yz)
    if (xRange[0] <= 0 && xRange[1] >= 0) {
        ctx.strokeStyle = '#4ecdc4';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(toCanvasX(0), toCanvasY(yRange[0]));
        ctx.lineTo(toCanvasX(0), toCanvasY(yRange[1]));
        ctx.stroke();

        drawArrowHead(toCanvasX(0), toCanvasY(yRange[1]), -Math.PI / 2, '#4ecdc4');

        ctx.fillStyle = '#4ecdc4';
        ctx.font = 'bold 14px Inter';
        ctx.fillText(labels.v, toCanvasX(0) - 5, toCanvasY(yRange[1]) - 15);
    }

    // Tick labels
    ctx.fillStyle = DEFAULT_COLORS.text;
    ctx.font = '11px JetBrains Mono';

    const xStep = Math.ceil((xRange[1] - xRange[0]) / 20);
    for (let x = Math.ceil(xRange[0]); x <= xRange[1]; x += xStep) {
        if (x !== 0) {
            ctx.textAlign = 'center';
            ctx.fillText(x.toString(), toCanvasX(x), toCanvasY(0) + 18);
        }
    }

    const yStep = Math.ceil((yRange[1] - yRange[0]) / 20);
    for (let y = Math.ceil(yRange[0]); y <= yRange[1]; y += yStep) {
        if (y !== 0) {
            ctx.textAlign = 'right';
            ctx.fillText(y.toString(), toCanvasX(0) - 8, toCanvasY(y) + 4);
        }
    }

    ctx.textAlign = 'right';
    ctx.fillText('0', toCanvasX(0) - 8, toCanvasY(0) + 18);
}

function drawArrowHead(x, y, angle, color) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-12, -6);
    ctx.lineTo(-12, 6);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
}

function renderVector2D(obj, color) {
    const tail = obj.tail || [0, 0];
    const head = obj.head;

    const x1 = toCanvasX(tail[0]);
    const y1 = toCanvasY(tail[1]);
    const x2 = toCanvasX(head[0]);
    const y2 = toCanvasY(head[1]);

    const angle = Math.atan2(y2 - y1, x2 - x1);

    // Glow effect
    ctx.strokeStyle = color;
    ctx.lineWidth = 8;
    ctx.lineCap = 'round';
    ctx.globalAlpha = 0.2;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.globalAlpha = 1;

    // Main line
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    // Arrow head
    ctx.save();
    ctx.translate(x2, y2);
    ctx.rotate(angle);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-18, -9);
    ctx.lineTo(-18, 9);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Label with background
    if (obj.label) {
        const labelX = x2 + 15;
        const labelY = y2 - 15;

        ctx.font = 'bold 14px JetBrains Mono';
        const metrics = ctx.measureText(obj.label);

        ctx.fillStyle = 'rgba(15, 22, 41, 0.9)';
        ctx.roundRect(labelX - 6, labelY - 14, metrics.width + 12, 22, 4);
        ctx.fill();

        ctx.fillStyle = color;
        ctx.fillText(obj.label, labelX, labelY);
    }
}

function renderLine2D(obj, color) {
    const { xRange, yRange } = viewConfig;

    let points = [];

    if (obj.equation_type === 'explicit' || obj.m !== undefined) {
        const m = obj.m;
        const b = obj.b || 0;

        points = [
            [xRange[0], m * xRange[0] + b],
            [xRange[1], m * xRange[1] + b]
        ];
    } else if (obj.a !== undefined && obj.b !== undefined) {
        const { a, b, c } = obj;

        if (Math.abs(b) > 0.0001) {
            const y1 = -(a * xRange[0] + (c || 0)) / b;
            const y2 = -(a * xRange[1] + (c || 0)) / b;
            points = [[xRange[0], y1], [xRange[1], y2]];
        } else {
            const x = -(c || 0) / a;
            points = [[x, yRange[0]], [x, yRange[1]]];
        }
    }

    if (points.length < 2) return;

    // Glow
    ctx.strokeStyle = color;
    ctx.lineWidth = 6;
    ctx.globalAlpha = 0.2;
    ctx.beginPath();
    ctx.moveTo(toCanvasX(points[0][0]), toCanvasY(points[0][1]));
    ctx.lineTo(toCanvasX(points[1][0]), toCanvasY(points[1][1]));
    ctx.stroke();
    ctx.globalAlpha = 1;

    // Main line
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(toCanvasX(points[0][0]), toCanvasY(points[0][1]));
    ctx.lineTo(toCanvasX(points[1][0]), toCanvasY(points[1][1]));
    ctx.stroke();

    // Label
    if (obj.label) {
        const midX = (points[0][0] + points[1][0]) / 2;
        const midY = (points[0][1] + points[1][1]) / 2;

        ctx.font = 'bold 13px JetBrains Mono';
        const metrics = ctx.measureText(obj.label);

        ctx.fillStyle = 'rgba(15, 22, 41, 0.9)';
        ctx.roundRect(toCanvasX(midX) - metrics.width / 2 - 8, toCanvasY(midY) - 14, metrics.width + 16, 24, 4);
        ctx.fill();

        ctx.fillStyle = color;
        ctx.textAlign = 'center';
        ctx.fillText(obj.label, toCanvasX(midX), toCanvasY(midY) + 4);
    }
}

function renderPoint2D(obj, color) {
    const x = toCanvasX(obj.x);
    const y = toCanvasY(obj.y);

    // Outer glow
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.2;
    ctx.beginPath();
    ctx.arc(x, y, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    // Point
    ctx.beginPath();
    ctx.arc(x, y, 7, 0, Math.PI * 2);
    ctx.fill();

    // Inner highlight
    ctx.fillStyle = '#ffffff';
    ctx.globalAlpha = 0.4;
    ctx.beginPath();
    ctx.arc(x - 2, y - 2, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    // Label
    if (obj.label) {
        ctx.fillStyle = color;
        ctx.font = 'bold 13px JetBrains Mono';
        ctx.textAlign = 'left';
        ctx.fillText(obj.label, x + 12, y - 10);
    }
}

/**
 * Evaluate mathematical expression using safe evaluator
 */
function evaluateExpression(expr, vars) {
    try {
        return safeEvaluate(expr, vars);
    } catch (error) {
        console.warn('Expression evaluation failed:', error);
        return NaN;
    }
}

/**
 * Render a mathematical function
 */
function renderFunction2D(obj, color) {
    const { xRange, yRange } = viewConfig;
    const expr = obj.expression;
    const step = (xRange[1] - xRange[0]) / 500;

    // Draw function curve
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    let firstPoint = true;
    let lastY = null;

    ctx.beginPath();

    for (let x = xRange[0]; x <= xRange[1]; x += step) {
        const y = evaluateExpression(expr, { x });

        if (!isNaN(y) && isFinite(y) && y >= yRange[0] - 5 && y <= yRange[1] + 5) {
            const cx = toCanvasX(x);
            const cy = toCanvasY(y);

            // Check for discontinuities
            if (firstPoint || (lastY !== null && Math.abs(y - lastY) > (yRange[1] - yRange[0]) / 2)) {
                ctx.moveTo(cx, cy);
                firstPoint = false;
            } else {
                ctx.lineTo(cx, cy);
            }
            lastY = y;
        } else {
            firstPoint = true;
            lastY = null;
        }
    }

    // Glow effect
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 8;
    ctx.globalAlpha = 0.2;
    ctx.stroke();
    ctx.restore();

    // Main curve
    ctx.lineWidth = 3;
    ctx.stroke();

    // Label
    if (obj.label) {
        // Find a good spot for the label
        const midX = (xRange[0] + xRange[1]) / 2;
        const midY = evaluateExpression(expr, { x: midX });

        if (!isNaN(midY) && isFinite(midY)) {
            ctx.font = 'bold 14px JetBrains Mono';
            const metrics = ctx.measureText(obj.label);

            const labelX = toCanvasX(midX);
            const labelY = toCanvasY(midY) - 20;

            ctx.fillStyle = 'rgba(15, 22, 41, 0.9)';
            ctx.roundRect(labelX - metrics.width / 2 - 8, labelY - 10, metrics.width + 16, 24, 4);
            ctx.fill();

            ctx.fillStyle = color;
            ctx.textAlign = 'center';
            ctx.fillText(obj.label, labelX, labelY + 6);
        }
    }
}

/**
 * Render parametric curve
 */
function renderParametric2D(obj, color) {
    const tRange = obj.t_range || [0, 2 * Math.PI];
    const steps = 500;
    const dt = (tRange[1] - tRange[0]) / steps;

    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';

    ctx.beginPath();
    let firstPoint = true;

    for (let i = 0; i <= steps; i++) {
        const t = tRange[0] + i * dt;
        const x = evaluateExpression(obj.x_expr, { t });
        const y = evaluateExpression(obj.y_expr, { t });

        if (!isNaN(x) && !isNaN(y) && isFinite(x) && isFinite(y)) {
            if (firstPoint) {
                ctx.moveTo(toCanvasX(x), toCanvasY(y));
                firstPoint = false;
            } else {
                ctx.lineTo(toCanvasX(x), toCanvasY(y));
            }
        }
    }

    // Glow
    ctx.save();
    ctx.lineWidth = 8;
    ctx.globalAlpha = 0.2;
    ctx.stroke();
    ctx.restore();

    ctx.lineWidth = 3;
    ctx.stroke();

    // Label
    if (obj.label) {
        const t0 = tRange[0];
        const x0 = evaluateExpression(obj.x_expr, { t: t0 });
        const y0 = evaluateExpression(obj.y_expr, { t: t0 });

        ctx.fillStyle = color;
        ctx.font = 'bold 14px JetBrains Mono';
        ctx.textAlign = 'left';
        ctx.fillText(obj.label, toCanvasX(x0) + 10, toCanvasY(y0) - 10);
    }
}

/**
 * Render circle
 */
function renderCircle2D(obj, color) {
    const center = obj.center || [0, 0];
    const radius = obj.radius || 1;

    const cx = toCanvasX(center[0]);
    const cy = toCanvasY(center[1]);

    // Calculate radius in canvas pixels
    const rx = Math.abs(toCanvasX(center[0] + radius) - cx);

    // Glow
    ctx.strokeStyle = color;
    ctx.lineWidth = 8;
    ctx.globalAlpha = 0.2;
    ctx.beginPath();
    ctx.arc(cx, cy, rx, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;

    // Main circle
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, cy, rx, 0, Math.PI * 2);
    ctx.stroke();

    // Center point
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(cx, cy, 4, 0, Math.PI * 2);
    ctx.fill();

    // Label
    if (obj.label) {
        ctx.fillStyle = color;
        ctx.font = 'bold 14px JetBrains Mono';
        ctx.textAlign = 'center';
        ctx.fillText(obj.label, cx, cy - rx - 15);
    }
}

function getDefaultColor(kind) {
    if (kind.includes('vector')) return DEFAULT_COLORS.vector;
    if (kind.includes('line')) return DEFAULT_COLORS.line;
    if (kind.includes('point')) return DEFAULT_COLORS.point;
    if (kind.includes('function')) return DEFAULT_COLORS.function;
    if (kind.includes('parametric')) return DEFAULT_COLORS.function;
    if (kind.includes('circle')) return DEFAULT_COLORS.function;
    return '#ffffff';
}

export function dispose2D() {
    window.removeEventListener('resize', resizeCanvas);
    canvas = null;
    ctx = null;
}
