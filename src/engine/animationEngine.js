/**
 * Animation Engine - Enhanced with 3Blue1Brown-Style Reveal Animations
 * Supports reveal animations: scale_grow, parametric_sweep, wireframe_morph
 * Plus trace, morph, rotate, and parameter sweep animations
 */

let isPlaying = false;
let currentTime = 0;
let duration = 0;
let animationType = 'none';
let animationConfig = null;
let animationFrameId = null;
let lastTimestamp = null;
let onUpdate = null;
let onComplete = null;
let originalObjects = [];

// ============================================
// EASING FUNCTIONS (3Blue1Brown style - smooth and satisfying)
// ============================================

/**
 * Linear interpolation
 */
export function lerp(a, b, t) {
    return a + (b - a) * t;
}

/**
 * Ease-in (quadratic) - starts slow, accelerates
 */
export function easeIn(t) {
    return t * t;
}

/**
 * Ease-out (quadratic) - starts fast, decelerates (3B1B favorite)
 */
export function easeOut(t) {
    return 1 - (1 - t) * (1 - t);
}

/**
 * Ease-in-out (smooth S-curve) - most natural looking
 */
export function easeInOut(t) {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

/**
 * Smooth step (cubic Hermite interpolation) - very smooth
 */
export function smoothStep(t) {
    return t * t * (3 - 2 * t);
}

/**
 * Smoother step (quintic) - even smoother, zero second derivative at endpoints
 */
export function smootherStep(t) {
    return t * t * t * (t * (t * 6 - 15) + 10);
}

/**
 * Elastic easing - overshoots then settles (great for attention)
 */
export function easeOutElastic(t) {
    const c4 = (2 * Math.PI) / 3;
    return t === 0 ? 0 : t === 1 ? 1 :
        Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
}

/**
 * Bounce easing - like a ball bouncing
 */
export function easeOutBounce(t) {
    const n1 = 7.5625;
    const d1 = 2.75;
    if (t < 1 / d1) {
        return n1 * t * t;
    } else if (t < 2 / d1) {
        return n1 * (t -= 1.5 / d1) * t + 0.75;
    } else if (t < 2.5 / d1) {
        return n1 * (t -= 2.25 / d1) * t + 0.9375;
    } else {
        return n1 * (t -= 2.625 / d1) * t + 0.984375;
    }
}

/**
 * Back easing - slight overshoot (subtle anticipation)
 */
export function easeOutBack(t) {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

/**
 * Get easing function by name
 */
export function getEasingFunction(name) {
    const easings = {
        'linear': (t) => t,
        'ease-in': easeIn,
        'ease-out': easeOut,
        'ease-in-out': easeInOut,
        'smooth': smoothStep,
        'smoother': smootherStep,
        'elastic': easeOutElastic,
        'bounce': easeOutBounce,
        'back': easeOutBack
    };
    return easings[name] || easeInOut;
}

// ============================================
// REVEAL ANIMATION TYPES (3Blue1Brown Style)
// ============================================

/**
 * Animation Types:
 * - 'scale_grow': Object scales from 0 → 1 (balloon inflate)
 * - 'parametric_sweep': Surface draws from pole to pole (phi 0 → π)
 * - 'wireframe_morph': Wireframe fades out as solid fades in
 * - 'trace': Draw curves progressively
 * - 'fade_in': Simple opacity fade
 * - 'rotate_reveal': Object rotates in from behind
 */

/**
 * Calculate reveal progress for different animation types
 * @param {string} type - Animation type
 * @param {number} progress - Raw progress 0-1
 * @param {object} config - Animation config
 * @returns {object} - Reveal parameters for the renderer
 */
export function getRevealParams(type, progress, config = {}) {
    const easing = getEasingFunction(config.easing || 'ease-out');
    const easedProgress = easing(progress);

    switch (type) {
        case 'scale_grow':
            return {
                type: 'scale_grow',
                scale: easedProgress,
                // Apply slight overshoot for more life
                scaleWithBounce: config.bounce ? easeOutBack(progress) : easedProgress
            };

        case 'parametric_sweep':
            return {
                type: 'parametric_sweep',
                // phi range: 0 → π (draws sphere from top to bottom)
                phiLength: easedProgress * Math.PI,
                // For surfaces: percentage of UV to render
                sweepProgress: easedProgress
            };

        case 'wireframe_morph':
            return {
                type: 'wireframe_morph',
                // Wireframe starts at 1, fades to 0
                wireframeOpacity: 1 - easedProgress,
                // Solid starts at 0, fades to 1
                solidOpacity: easedProgress * 0.7, // Max 0.7 for transparency
                // Wireframe line width diminishes
                wireframeScale: 1 - easedProgress * 0.3
            };

        case 'trace':
            return {
                type: 'trace',
                // Percentage of curve/path to draw (0-1)
                traceProgress: easedProgress,
                // Number of points to show
                pointCount: Math.floor(easedProgress * (config.totalPoints || 100))
            };

        case 'fade_in':
            return {
                type: 'fade_in',
                opacity: easedProgress
            };

        case 'rotate_reveal':
            return {
                type: 'rotate_reveal',
                // Rotate from -90° to 0°
                rotationY: (1 - easedProgress) * (-Math.PI / 2),
                opacity: easedProgress
            };

        default:
            return {
                type: 'none',
                progress: easedProgress
            };
    }
}

// ============================================
// CORE ANIMATION ENGINE
// ============================================

/**
 * Initialize the animation engine with configuration
 * @param {object} config - Animation configuration from visualization JSON
 * @param {Array} objects - The objects to animate
 * @param {Function} updateCallback - Called with progress on each frame
 * @param {Function} completeCallback - Called when animation completes
 */
export function initAnimation(config, objects, updateCallback, completeCallback) {
    if (!config || config.type === 'none') {
        return false;
    }

    animationType = config.type || 'scale_grow'; // Default to scale_grow
    duration = config.duration_seconds || 3; // Shorter default for snappier feel
    animationConfig = {
        ...config,
        easing: config.easing || 'ease-out',
        stagger: config.stagger || 0, // Delay between multiple objects
        loop: config.loop || false,
        autoPlay: config.autoPlay !== false // Default true
    };
    originalObjects = objects || [];
    onUpdate = updateCallback;
    onComplete = completeCallback;
    currentTime = 0;
    isPlaying = false;

    return animationType !== 'none';
}

/**
 * Play the animation
 */
export function play() {
    if (animationType === 'none') return;

    isPlaying = true;
    lastTimestamp = null;
    animationFrameId = requestAnimationFrame(tick);
}

/**
 * Pause the animation
 */
export function pause() {
    isPlaying = false;
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }
}

/**
 * Toggle play/pause
 * @returns {boolean} - New playing state
 */
export function togglePlay() {
    if (isPlaying) {
        pause();
    } else {
        play();
    }
    return isPlaying;
}

/**
 * Seek to a specific time
 * @param {number} time - Time in seconds
 */
export function seek(time) {
    currentTime = Math.max(0, Math.min(duration, time));
    updateAnimation();
}

/**
 * Seek to a percentage of the duration
 * @param {number} percent - Percentage (0-100)
 */
export function seekPercent(percent) {
    seek((percent / 100) * duration);
}

/**
 * Reset to the beginning
 */
export function reset() {
    pause();
    currentTime = 0;
    updateAnimation();
}

/**
 * Get current playback state
 * @returns {object}
 */
export function getState() {
    return {
        isPlaying,
        currentTime,
        duration,
        progress: duration > 0 ? (currentTime / duration) * 100 : 0,
        type: animationType,
        config: animationConfig
    };
}

/**
 * Animation tick function - optimized for smooth 60fps target
 */
let lastProgress = -1;
const MIN_PROGRESS_DELTA = 0.005;  // Skip updates if progress changed less than 0.5%

function tick(timestamp) {
    if (!isPlaying) return;

    if (lastTimestamp === null) {
        lastTimestamp = timestamp;
    }

    const deltaTime = (timestamp - lastTimestamp) / 1000;
    lastTimestamp = timestamp;

    currentTime += deltaTime;

    if (currentTime >= duration) {
        currentTime = duration;
        updateAnimation();
        lastProgress = -1;  // Reset for next animation

        if (animationConfig.loop) {
            currentTime = 0;
            animationFrameId = requestAnimationFrame(tick);
        } else {
            pause();
            if (onComplete) onComplete();
        }
        return;
    }

    // Only update if progress changed enough (performance optimization)
    const newProgress = currentTime / duration;
    if (lastProgress < 0 || Math.abs(newProgress - lastProgress) >= MIN_PROGRESS_DELTA) {
        updateAnimation();
        lastProgress = newProgress;
    }

    animationFrameId = requestAnimationFrame(tick);
}

/**
 * Update the animation based on current time and type
 */
function updateAnimation() {
    if (!onUpdate) return;

    const rawProgress = duration > 0 ? currentTime / duration : 0;

    // Get reveal parameters for current animation type
    const revealParams = getRevealParams(animationType, rawProgress, animationConfig);

    // Call the update callback with both progress and reveal params
    onUpdate(rawProgress, currentTime, duration, animationType, animationConfig, revealParams);
}

/**
 * Format time as mm:ss
 */
export function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Dispose of the animation engine
 */
export function disposeAnimation() {
    pause();
    animationType = 'none';
    animationConfig = null;
    originalObjects = [];
    onUpdate = null;
    onComplete = null;
    currentTime = 0;
    duration = 0;
}

/**
 * Create a staggered animation timeline for multiple objects
 * @param {number} objectCount - Number of objects
 * @param {number} staggerDelay - Delay between each object (0-1)
 * @param {number} progress - Current overall progress (0-1)
 * @returns {Array} - Array of individual progress values for each object
 */
export function getStaggeredProgress(objectCount, staggerDelay, progress) {
    const results = [];
    for (let i = 0; i < objectCount; i++) {
        const startTime = i * staggerDelay;
        const endTime = startTime + (1 - (objectCount - 1) * staggerDelay);
        const objectProgress = Math.max(0, Math.min(1, (progress - startTime) / (endTime - startTime)));
        results.push(objectProgress);
    }
    return results;
}

