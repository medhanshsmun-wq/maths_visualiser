/**
 * Linear Algebra Visualizer - Main Entry Point
 * Unified 3D visualization powered by Gemini AI
 */

import './style.css';
import { initializeGemini, isInitialized, generateVisualization, processMultimodalInput } from './services/geminiApi.js';
import { processFile, formatFileSize } from './services/fileProcessor.js';
import { init3D, render3D, dispose3D, resetCamera, toggleAutoRotate } from './engine/renderer3D.js';
import * as Animation from './engine/animationEngine.js';
import { marked } from 'marked';
import katex from 'katex';

// State
let currentPlane = 'xy'; // xy, xz, yz - plane for 2D objects in 3D space
let currentData = null;
let uploadedFile = null;
let explanationVisible = false;
let isLearningMode = false;
let learningRenderer = null; // Separate 3D renderer for learning mode

// DOM Elements
const elements = {};

/**
 * Initialize the application
 */
function init() {
  cacheElements();
  setupEventListeners();

  const savedKey = localStorage.getItem('gemini_api_key');
  if (savedKey) {
    initializeGemini(savedKey);
    elements.apiModal.classList.add('hidden');
    initializeRenderers();
  }
}

/**
 * Cache all necessary DOM elements
 */
function cacheElements() {
  elements.apiModal = document.getElementById('api-modal');
  elements.apiKeyInput = document.getElementById('api-key-input');
  elements.saveApiKey = document.getElementById('save-api-key');
  elements.closeModalBtn = document.getElementById('close-modal-btn');

  elements.queryInput = document.getElementById('query-input');
  elements.visualizeBtn = document.getElementById('visualize-btn');
  elements.btnText = elements.visualizeBtn.querySelector('.btn-text');
  elements.btnLoader = elements.visualizeBtn.querySelector('.btn-loader');
  elements.errorMessage = document.getElementById('error-message');

  elements.dropZone = document.getElementById('drop-zone');
  elements.fileInput = document.getElementById('file-input');
  elements.filePreview = document.getElementById('file-preview');

  elements.planeSelect = document.getElementById('plane-select');
  elements.canvas3D = document.getElementById('canvas-3d');
  elements.canvasContainer = document.getElementById('canvas-container');
  elements.emptyState = document.getElementById('empty-state');
  elements.legend = document.getElementById('legend');

  elements.animationControls = document.getElementById('animation-controls');
  elements.playBtn = document.getElementById('play-btn');
  elements.playIcon = document.getElementById('play-icon');
  elements.pauseIcon = document.getElementById('pause-icon');
  elements.timelineSlider = document.getElementById('timeline-slider');
  elements.timeDisplay = document.getElementById('time-display');
  elements.resetBtn = document.getElementById('reset-btn');

  elements.explanationPanel = document.getElementById('explanation-panel');
  elements.explanationContent = document.getElementById('explanation-content');
  elements.copyExplanation = document.getElementById('copy-explanation');
  elements.closeExplanation = document.getElementById('close-explanation');
  elements.toggleExplanation = document.getElementById('toggle-explanation');
  elements.explanationToggleContainer = document.getElementById('explanation-toggle-container');

  elements.viewControls = document.getElementById('view-controls');
  elements.resetViewBtn = document.getElementById('reset-view-btn');
  elements.autoRotateBtn = document.getElementById('auto-rotate-btn');

  elements.exampleChips = document.querySelectorAll('.chip');
  elements.settingsBtn = document.getElementById('settings-btn');
  elements.descriptionText = document.getElementById('description-text');

  // Learning Mode elements
  elements.learningToggle = document.getElementById('learning-toggle');
  elements.appContainer = document.getElementById('app');
  elements.learningMode = document.getElementById('learning-mode');
  elements.exitLearning = document.getElementById('exit-learning');
  elements.learningTopic = document.getElementById('learning-topic');
  elements.learningCanvas = document.getElementById('learning-canvas-3d');
  elements.learningTheoryContent = document.getElementById('learning-theory-content');
  elements.learningPractice = document.getElementById('learning-practice');
  elements.practiceQuestions = document.getElementById('practice-questions');
  elements.learningInput = document.getElementById('learning-input');
  elements.learningSend = document.getElementById('learning-send');
  elements.learningAnimLabel = document.getElementById('learning-anim-label');
  elements.learningPlayBtn = document.getElementById('learning-play-btn');
  elements.learningTimeline = document.getElementById('learning-timeline');
  elements.learningTime = document.getElementById('learning-time');
}

/**
 * Setup all event listeners
 */
function setupEventListeners() {
  // API Key modal
  elements.saveApiKey.addEventListener('click', handleSaveApiKey);
  elements.apiKeyInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleSaveApiKey();
  });

  // Main actions
  elements.visualizeBtn.addEventListener('click', handleVisualize);
  elements.queryInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.ctrlKey) handleVisualize();
  });

  // File upload
  elements.dropZone.addEventListener('click', () => elements.fileInput.click());
  elements.dropZone.addEventListener('dragover', handleDragOver);
  elements.dropZone.addEventListener('dragleave', handleDragLeave);
  elements.dropZone.addEventListener('drop', handleDrop);
  elements.fileInput.addEventListener('change', handleFileSelect);

  // Plane selector - for choosing which plane 2D objects are rendered on
  if (elements.planeSelect) {
    elements.planeSelect.addEventListener('change', (e) => {
      currentPlane = e.target.value;
      if (currentData) {
        renderVisualization(currentData);
      }
    });
  }

  // Learning mode toggle - USER controlled
  if (elements.learningToggle) {
    elements.learningToggle.addEventListener('change', (e) => {
      isLearningMode = e.target.checked;
      if (isLearningMode && currentData) {
        enterLearningMode(currentData);
      } else if (!isLearningMode) {
        exitLearningMode();
      }
    });
  }

  // Animation controls
  elements.playBtn.addEventListener('click', handlePlayPause);
  elements.timelineSlider.addEventListener('input', handleSeek);
  elements.resetBtn.addEventListener('click', handleReset);

  // Explanation panel - Fixed toggle functionality
  elements.copyExplanation.addEventListener('click', handleCopyExplanation);
  elements.closeExplanation.addEventListener('click', () => {
    toggleExplanationPanel(false);
  });

  // Toggle explanation button
  if (elements.toggleExplanation) {
    elements.toggleExplanation.addEventListener('click', () => {
      toggleExplanationPanel(!explanationVisible);
    });
  }

  // View controls
  if (elements.resetViewBtn) {
    elements.resetViewBtn.addEventListener('click', () => {
      resetCamera();
    });
  }

  if (elements.autoRotateBtn) {
    elements.autoRotateBtn.addEventListener('click', () => {
      const rotating = toggleAutoRotate();
      elements.autoRotateBtn.classList.toggle('active', rotating);
    });
  }

  // Example chips
  elements.exampleChips.forEach(chip => {
    chip.addEventListener('click', () => {
      elements.queryInput.value = chip.dataset.query;
      handleVisualize();
    });
  });

  // Settings - don't delete key immediately, just show modal with cancel option
  elements.settingsBtn.addEventListener('click', () => {
    // Show cancel button when opening from settings
    if (elements.closeModalBtn) {
      elements.closeModalBtn.classList.remove('hidden');
    }
    elements.apiModal.classList.remove('hidden');
  });

  // Close modal button (cancel)
  if (elements.closeModalBtn) {
    elements.closeModalBtn.addEventListener('click', () => {
      elements.apiModal.classList.add('hidden');
    });
  }

  // Learning mode exit button
  if (elements.exitLearning) {
    elements.exitLearning.addEventListener('click', exitLearningMode);
  }

  // Learning mode input
  if (elements.learningSend) {
    elements.learningSend.addEventListener('click', handleLearningInput);
  }
  if (elements.learningInput) {
    elements.learningInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') handleLearningInput();
    });
  }

  // Learning mode animation controls
  if (elements.learningPlayBtn) {
    elements.learningPlayBtn.addEventListener('click', handleLearningAnimationPlay);
  }
  if (elements.learningTimeline) {
    elements.learningTimeline.addEventListener('input', handleLearningAnimationSeek);
  }
}

/**
 * Toggle explanation panel visibility
 */
function toggleExplanationPanel(show) {
  explanationVisible = show;
  elements.explanationPanel.classList.toggle('hidden', !show);

  if (elements.toggleExplanation) {
    elements.toggleExplanation.classList.toggle('active', show);
  }
}

/**
 * Enter Learning Mode
 */
function enterLearningMode(data) {
  isLearningMode = true;

  // Hide main app, show learning layout
  elements.appContainer.classList.add('hidden');
  elements.learningMode.classList.remove('hidden');

  // Set topic
  if (elements.learningTopic) {
    elements.learningTopic.textContent = data.description || 'Learning Session';
  }

  // Initialize learning renderer if needed
  if (!learningRenderer && elements.learningCanvas) {
    init3D(elements.learningCanvas);
    learningRenderer = true;
  }

  // Render visualization
  if (data.objects && data.objects.length > 0) {
    render3D(data, { plane: currentPlane });
  }

  // Render theory content
  renderTheoryContent(data);

  // Render practice questions if present
  renderPracticeQuestions(data.practice_questions);

  // Set animation label if present
  if (data.animation && data.animation.description && elements.learningAnimLabel) {
    elements.learningAnimLabel.textContent = data.animation.description;
  }
}

/**
 * Exit Learning Mode
 */
function exitLearningMode() {
  isLearningMode = false;
  learningRenderer = null; // Reset so learning canvas reinitializes next time
  Animation.disposeAnimation();

  // Sync the toggle checkbox state
  if (elements.learningToggle) {
    elements.learningToggle.checked = false;
  }

  // Show main app, hide learning layout
  elements.appContainer.classList.remove('hidden');
  elements.learningMode.classList.add('hidden');

  // Reinitialize the main 3D renderer (since learning mode took over the global renderer)
  init3D(elements.canvas3D);

  // Re-render current visualization if available
  if (currentData && currentData.objects && currentData.objects.length > 0) {
    render3D(currentData, { plane: currentPlane });
  }
}

/**
 * Handle learning animation play/pause
 */
function handleLearningAnimationPlay() {
  const state = Animation.getState();

  // If no animation configured, create a default trace animation
  if (state.type === 'none' && currentData) {
    setupLearningAnimation(currentData);
  }

  const isNowPlaying = Animation.togglePlay();
  updateLearningAnimationUI(isNowPlaying);
}

/**
 * Handle learning animation seek
 */
function handleLearningAnimationSeek(e) {
  const percent = parseFloat(e.target.value);
  Animation.seekPercent(percent);
}

/**
 * Setup animation for learning mode with 3B1B-style reveal animations
 */
function setupLearningAnimation(data) {
  // Default to scale_grow for a nice balloon inflate effect
  const config = data.animation || { type: 'scale_grow', duration_seconds: 3, easing: 'ease-out' };

  // Initialize animation with progress callback (now receives revealParams)
  Animation.initAnimation(config, data.objects, (progress, time, duration, type, animConfig, revealParams) => {
    // Update timeline UI
    if (elements.learningTimeline) {
      elements.learningTimeline.value = progress * 100;
    }
    if (elements.learningTime) {
      elements.learningTime.textContent = `${Animation.formatTime(time)} / ${Animation.formatTime(duration)}`;
    }

    // Re-render with animation progress and reveal params
    renderWithAnimationProgress(data, progress, type, revealParams);
  }, () => {
    // Animation complete
    updateLearningAnimationUI(false);
  });
}

/**
 * Render visualization with 3B1B-style animation progress
 */
function renderWithAnimationProgress(data, progress, animationType, revealParams) {
  // Pass progress and reveal params to renderer for procedural animations
  render3D(data, {
    plane: currentPlane,
    animationProgress: progress,
    animationType: animationType,
    revealParams: revealParams  // Contains scale, phiLength, opacity, etc.
  });
}

/**
 * Update learning animation UI (play/pause icons)
 */
function updateLearningAnimationUI(isPlaying) {
  const playIcon = document.getElementById('learning-play-icon');
  const pauseIcon = document.getElementById('learning-pause-icon');

  if (playIcon && pauseIcon) {
    playIcon.classList.toggle('hidden', isPlaying);
    pauseIcon.classList.toggle('hidden', !isPlaying);
  }
}

/**
 * Handle learning mode input - APPENDS to existing content
 */
async function handleLearningInput() {
  const query = elements.learningInput.value.trim();
  if (!query) return;

  elements.learningInput.value = '';

  // Show loading state
  const loadingDiv = document.createElement('div');
  loadingDiv.className = 'follow-up-loading';
  loadingDiv.innerHTML = '<p><em>Thinking...</em></p>';

  const theoryText = elements.learningTheoryContent.querySelector('.theory-text');
  if (theoryText) {
    theoryText.appendChild(loadingDiv);
  }

  try {
    const data = await generateVisualization(query);

    // Remove loading
    loadingDiv.remove();

    // APPEND new content instead of replacing
    appendFollowUpContent(query, data);

    // Update visualization if there are new objects
    if (data.objects && data.objects.length > 0) {
      render3D(data, { plane: currentPlane });
    }

    // Append new practice questions if any
    if (data.practice_questions && data.practice_questions.length > 0) {
      appendPracticeQuestions(data.practice_questions);
    }

  } catch (error) {
    loadingDiv.remove();
    console.error('Learning mode error:', error);
  }
}

/**
 * Append follow-up content to theory
 */
function appendFollowUpContent(query, data) {
  const theoryText = elements.learningTheoryContent.querySelector('.theory-text');
  if (!theoryText || !data.explanation) return;

  // Create a follow-up section
  const followUpDiv = document.createElement('div');
  followUpDiv.className = 'follow-up-section';

  let content = data.explanation;

  // Process LaTeX
  content = content.replace(/\$\$(.*?)\$\$/gs, (match, latex) => {
    try {
      return `<div class="katex-display">${katex.renderToString(latex.trim(), { displayMode: true, throwOnError: false })}</div>`;
    } catch (e) {
      return `<div class="katex-display">${match}</div>`;
    }
  });

  content = content.replace(/\$(.*?)\$/g, (match, latex) => {
    try {
      return katex.renderToString(latex.trim(), { displayMode: false, throwOnError: false });
    } catch (e) {
      return match;
    }
  });

  followUpDiv.innerHTML = `
    <h4 class="follow-up-question">📝 "${query}"</h4>
    ${marked.parse(content)}
  `;

  theoryText.appendChild(followUpDiv);

  // Scroll to the new content
  followUpDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/**
 * Append additional practice questions
 */
function appendPracticeQuestions(questions) {
  if (!elements.practiceQuestions || !questions || questions.length === 0) return;

  elements.learningPractice.classList.remove('hidden');

  const startIndex = elements.practiceQuestions.querySelectorAll('.practice-question').length;

  let html = '';
  questions.forEach((q, i) => {
    const idx = startIndex + i;
    html += `
      <div class="practice-question" data-index="${idx}">
        <p><strong>Q${idx + 1}:</strong> ${q.question}</p>
        <input type="text" class="practice-answer-input" placeholder="Your answer..."/>
        <p class="practice-hint">${q.hint || ''}</p>
      </div>
    `;
  });

  elements.practiceQuestions.insertAdjacentHTML('beforeend', html);
}

/**
 * Render theory content with markdown and LaTeX
 */
function renderTheoryContent(data) {
  if (!elements.learningTheoryContent || !data.explanation) return;

  let content = data.explanation;

  // Replace display LaTeX
  content = content.replace(/\$\$(.*?)\$\$/gs, (match, latex) => {
    try {
      return `<div class="katex-display">${katex.renderToString(latex.trim(), { displayMode: true, throwOnError: false })}</div>`;
    } catch (e) {
      return `<div class="katex-display">${match}</div>`;
    }
  });

  // Replace inline LaTeX
  content = content.replace(/\$(.*?)\$/g, (match, latex) => {
    try {
      return katex.renderToString(latex.trim(), { displayMode: false, throwOnError: false });
    } catch (e) {
      return match;
    }
  });

  // Insert theory content before the practice questions div
  // Find or create a theory-text container
  let theoryText = elements.learningTheoryContent.querySelector('.theory-text');
  if (!theoryText) {
    theoryText = document.createElement('div');
    theoryText.className = 'theory-text';
    elements.learningTheoryContent.insertBefore(theoryText, elements.learningPractice);
  }
  theoryText.innerHTML = marked.parse(content);
}

/**
 * Render practice questions
 */
function renderPracticeQuestions(questions) {
  if (!elements.practiceQuestions || !elements.learningPractice) return;

  if (!questions || questions.length === 0) {
    elements.learningPractice.classList.add('hidden');
    return;
  }

  elements.learningPractice.classList.remove('hidden');

  let html = '';
  questions.forEach((q, i) => {
    html += `
      <div class="practice-question" data-index="${i}">
        <p><strong>Q${i + 1}:</strong> ${q.question}</p>
        <input type="text" class="practice-answer-input" placeholder="Your answer..."/>
        <p class="practice-hint">${q.hint || ''}</p>
      </div>
    `;
  });

  elements.practiceQuestions.innerHTML = html;
}

/**
 * Initialize 3D renderer
 */
function initializeRenderers() {
  init3D(elements.canvas3D);
}

/**
 * Handle saving API key
 */
function handleSaveApiKey() {
  const key = elements.apiKeyInput.value.trim();
  if (!key) {
    showError('Please enter a valid API key');
    return;
  }

  try {
    initializeGemini(key);
    localStorage.setItem('gemini_api_key', key);
    elements.apiModal.classList.add('hidden');
    initializeRenderers();
  } catch (error) {
    showError('Failed to initialize API: ' + error.message);
  }
}

/**
 * Handle visualization request
 */
async function handleVisualize() {
  const query = elements.queryInput.value.trim();

  if (!query && !uploadedFile) {
    showError('Please enter a query or upload a file');
    return;
  }

  if (!isInitialized()) {
    showError('Please configure your API key first');
    elements.apiModal.classList.remove('hidden');
    return;
  }

  setLoading(true);
  hideError();

  try {
    let data;

    if (uploadedFile) {
      data = await processMultimodalInput(
        uploadedFile.base64,
        uploadedFile.mimeType,
        query
      );
    } else {
      data = await generateVisualization(query);
    }

    currentData = data;

    // Check if user has learning mode toggle ON
    if (isLearningMode) {
      enterLearningMode(data);
    } else {
      renderVisualization(data);
      showExplanation(data);
    }

  } catch (error) {
    console.error('Visualization error:', error);
    showError(error.message);
  } finally {
    setLoading(false);
  }
}

/**
 * Render the visualization in unified 3D view
 */
function renderVisualization(data) {
  // Hide empty state
  elements.emptyState.classList.add('hidden');

  // Show view controls
  if (elements.viewControls) {
    elements.viewControls.classList.remove('hidden');
  }

  // Update description
  if (elements.descriptionText && data.description) {
    elements.descriptionText.textContent = data.description;
    elements.descriptionText.parentElement.classList.remove('hidden');
  }

  // Render everything in 3D, passing the plane for 2D objects
  const renderOptions = { plane: currentPlane };
  const legendItems = render3D(data, renderOptions);

  updateLegend(legendItems);
  setupAnimation(data);
}

/**
 * Update the legend panel
 */
function updateLegend(items) {
  if (!items || items.length === 0) {
    elements.legend.classList.add('hidden');
    return;
  }

  elements.legend.classList.remove('hidden');
  elements.legend.innerHTML = `
    <h4>Objects</h4>
    ${items.map(item => `
      <div class="legend-item">
        <div class="legend-color" style="background: ${item.color}"></div>
        <span class="legend-label">${item.label}</span>
      </div>
    `).join('')}
  `;
}

/**
 * Setup animation controls for regular (non-learning) mode
 * Updated to support 3B1B-style reveal animations
 */
function setupAnimation(data) {
  // Default to scale_grow animation for cool reveal effect
  const animConfig = data.animation || { type: 'scale_grow', duration_seconds: 3, easing: 'ease-out' };

  const hasAnimation = Animation.initAnimation(
    animConfig,
    data.objects,
    // Updated callback signature: (progress, time, duration, type, config, revealParams)
    (progress, time, duration, type, config, revealParams) => {
      // Re-render with animation progress and reveal params
      render3D(data, {
        plane: currentPlane,
        animationProgress: progress,
        animationType: type,
        revealParams: revealParams  // Contains scale, phiLength, opacity, etc.
      });
      updateTimeDisplay(time, duration);
    },
    () => {
      updatePlayButton(false);
    }
  );

  if (hasAnimation) {
    elements.animationControls.classList.remove('hidden');
    updateTimeDisplay(0, animConfig.duration_seconds || 3);

    // Auto-play animation for dramatic effect
    setTimeout(() => {
      Animation.play();
      updatePlayButton(true);
    }, 500);
  } else {
    elements.animationControls.classList.add('hidden');
  }
}

function handlePlayPause() {
  const isPlaying = Animation.togglePlay();
  updatePlayButton(isPlaying);
}

function handleSeek() {
  Animation.seekPercent(parseFloat(elements.timelineSlider.value));
}

function handleReset() {
  Animation.reset();
  updatePlayButton(false);
}

function updatePlayButton(isPlaying) {
  elements.playIcon.classList.toggle('hidden', isPlaying);
  elements.pauseIcon.classList.toggle('hidden', !isPlaying);
}

function updateTimeDisplay(current, total) {
  elements.timeDisplay.textContent = `${Animation.formatTime(current)} / ${Animation.formatTime(total)}`;
  elements.timelineSlider.value = (current / total) * 100;
}

/**
 * Show the explanation panel with markdown content
 */
function showExplanation(data) {
  if (!data.explanation) {
    toggleExplanationPanel(false);
    // Hide the toggle container when no explanation
    if (elements.explanationToggleContainer) {
      elements.explanationToggleContainer.classList.add('hidden');
    }
    return;
  }

  // Show toggle container (the button will always be visible now)
  if (elements.explanationToggleContainer) {
    elements.explanationToggleContainer.classList.remove('hidden');
  }

  // Process markdown with LaTeX
  let content = data.explanation;

  // Replace display LaTeX
  content = content.replace(/\$\$(.*?)\$\$/gs, (match, latex) => {
    try {
      return `<div class="katex-display">${katex.renderToString(latex.trim(), { displayMode: true, throwOnError: false })}</div>`;
    } catch (e) {
      return `<div class="katex-display">${match}</div>`;
    }
  });

  // Replace inline LaTeX
  content = content.replace(/\$(.*?)\$/g, (match, latex) => {
    try {
      return katex.renderToString(latex.trim(), { displayMode: false, throwOnError: false });
    } catch (e) {
      return match;
    }
  });

  // Render markdown
  elements.explanationContent.innerHTML = marked.parse(content);

  // Auto-show explanation panel
  toggleExplanationPanel(true);
}

/**
 * Handle copy explanation
 */
async function handleCopyExplanation() {
  if (!currentData?.explanation) return;

  try {
    await navigator.clipboard.writeText(currentData.explanation);
    elements.copyExplanation.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="20 6 9 17 4 12"/>
      </svg>
    `;
    setTimeout(() => {
      elements.copyExplanation.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
        </svg>
      `;
    }, 2000);
  } catch (error) {
    console.error('Copy failed:', error);
  }
}

// File upload handlers
function handleDragOver(e) {
  e.preventDefault();
  elements.dropZone.classList.add('drag-over');
}

function handleDragLeave(e) {
  e.preventDefault();
  elements.dropZone.classList.remove('drag-over');
}

function handleDrop(e) {
  e.preventDefault();
  elements.dropZone.classList.remove('drag-over');

  const file = e.dataTransfer.files[0];
  if (file) handleFile(file);
}

function handleFileSelect(e) {
  const file = e.target.files[0];
  if (file) handleFile(file);
}

async function handleFile(file) {
  try {
    uploadedFile = await processFile(file);
    showFilePreview(uploadedFile);
  } catch (error) {
    showError(error.message);
    uploadedFile = null;
  }
}

function showFilePreview(fileData) {
  elements.filePreview.classList.remove('hidden');
  elements.filePreview.innerHTML = `
    <div class="file-icon">${fileData.icon}</div>
    <div class="file-info">
      <div class="file-name">${fileData.fileName}</div>
      <div class="file-size">${formatFileSize(fileData.fileSize)}</div>
    </div>
    <button class="remove-file" onclick="window.removeFile()">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="18" y1="6" x2="6" y2="18"/>
        <line x1="6" y1="6" x2="18" y2="18"/>
      </svg>
    </button>
  `;
}

window.removeFile = function () {
  uploadedFile = null;
  elements.filePreview.classList.add('hidden');
  elements.fileInput.value = '';
};

// UI Helpers
function setLoading(loading) {
  elements.visualizeBtn.disabled = loading;
  elements.btnText.classList.toggle('hidden', loading);
  elements.btnLoader.classList.toggle('hidden', !loading);
}

function showError(message) {
  elements.errorMessage.textContent = message;
  elements.errorMessage.classList.remove('hidden');
}

function hideError() {
  elements.errorMessage.classList.add('hidden');
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', init);
