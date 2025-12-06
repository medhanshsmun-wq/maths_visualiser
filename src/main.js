/**
 * MathViz AI - Main Entry Point
 * Professional AI-powered math visualization
 */

import './style.css';
import { initializeGemini, isInitialized, generateVisualization, processMultimodalInput } from './services/geminiApi.js';
import { processFile, formatFileSize } from './services/fileProcessor.js';
import { init3D, render3D, dispose3D, resetCamera, toggleAutoRotate, exportImage } from './engine/renderer3D.js';
import * as Animation from './engine/animationEngine.js';
import { marked } from 'marked';
import katex from 'katex';
import { showSuccess, showError, showWarning, showInfo } from './utils/notifications.js';
import * as API from './services/api.js';

// State
let currentPlane = 'xy';
let currentData = null;
let uploadedFile = null;
let explanationVisible = false;
let isLearningMode = false;
let currentUser = null;
let learningRenderer = null;
let commandPaletteOpen = false;
let queryHistory = [];

// DOM Elements
const elements = {};

/**
 * Initialize the application
 */
async function init() {
  cacheElements();
  loadHistory();
  setupEventListeners();
  setupKeyboardShortcuts();

  // Check for OAuth callback token in URL
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');
  if (token) {
    API.setToken(token);
    window.history.replaceState({}, '', window.location.pathname);
    showSuccess('Logged in successfully!');
  }

  // Check if user is logged in
  await checkAuth();

  const savedKey = localStorage.getItem('gemini_api_key');
  if (savedKey) {
    initializeGemini(savedKey);
    elements.apiModal.classList.add('hidden');
    updateAIStatus(true);
    initializeRenderers();
  } else {
    updateAIStatus(false);
  }

  // Load history from backend if logged in
  if (currentUser) {
    await loadHistoryFromBackend();
  }
}

/**
 * Cache all necessary DOM elements
 */
function cacheElements() {
  // Modal
  elements.apiModal = document.getElementById('api-modal');
  elements.apiKeyInput = document.getElementById('api-key-input');
  elements.saveApiKey = document.getElementById('save-api-key');
  elements.closeModalBtn = document.getElementById('close-modal-btn');

  // Navigation
  elements.historyBtn = document.getElementById('history-btn');
  elements.examplesBtn = document.getElementById('examples-btn');
  elements.learnBtn = document.getElementById('learn-btn');
  elements.settingsBtn = document.getElementById('settings-btn');
  elements.aiStatus = document.getElementById('ai-status');

  // Canvas
  elements.canvas3D = document.getElementById('canvas-3d');
  elements.emptyState = document.getElementById('empty-state');
  elements.openCommandBtn = document.getElementById('open-command-btn');
  elements.viewControls = document.getElementById('view-controls');
  elements.resetViewBtn = document.getElementById('reset-view-btn');
  elements.autoRotateBtn = document.getElementById('auto-rotate-btn');
  elements.exportBtn = document.getElementById('export-btn');
  elements.legend = document.getElementById('legend');
  elements.descriptionBar = document.getElementById('description-bar');
  elements.descriptionText = document.getElementById('description-text');

  // AI Suggestions
  elements.aiSuggestions = document.getElementById('ai-suggestions');
  elements.suggestionsList = document.getElementById('suggestions-list');

  // Action Buttons
  elements.actionButtons = document.getElementById('action-buttons');
  elements.toggleExplanation = document.getElementById('toggle-explanation');
  elements.learningToggle = document.getElementById('learning-toggle');
  elements.newQueryBtn = document.getElementById('new-query-btn');

  // Animation Controls
  elements.animationControls = document.getElementById('animation-controls');
  elements.playBtn = document.getElementById('play-btn');
  elements.playIcon = document.getElementById('play-icon');
  elements.pauseIcon = document.getElementById('pause-icon');
  elements.timelineSlider = document.getElementById('timeline-slider');
  elements.timeDisplay = document.getElementById('time-display');
  elements.resetBtn = document.getElementById('reset-btn');

  // Command Palette
  elements.commandOverlay = document.getElementById('command-overlay');
  elements.commandPalette = document.getElementById('command-palette');
  elements.queryInput = document.getElementById('query-input');
  elements.dropZone = document.getElementById('drop-zone');
  elements.fileInput = document.getElementById('file-input');
  elements.filePreview = document.getElementById('file-preview');
  elements.autocomplete = document.getElementById('autocomplete');
  elements.autocompleteList = document.getElementById('autocomplete-list');
  elements.historySection = document.getElementById('history-section');
  elements.historyList = document.getElementById('history-list');
  elements.examplesSection = document.getElementById('examples-section');
  elements.visualizeBtn = document.getElementById('visualize-btn');
  elements.btnText = elements.visualizeBtn?.querySelector('.btn-text');
  elements.btnLoader = elements.visualizeBtn?.querySelector('.btn-loader');
  elements.exampleChips = document.querySelectorAll('.chip');

  // Explanation Panel
  elements.explanationPanel = document.getElementById('explanation-panel');
  elements.explanationContent = document.getElementById('explanation-content');
  elements.aiImprove = document.getElementById('ai-improve');
  elements.copyExplanation = document.getElementById('copy-explanation');
  elements.closeExplanation = document.getElementById('close-explanation');
  elements.followUpInput = document.getElementById('follow-up-input');
  elements.followUpSend = document.getElementById('follow-up-send');

  // History Panel
  elements.historyPanel = document.getElementById('history-panel');
  elements.historyContent = document.getElementById('history-content');
  elements.closeHistory = document.getElementById('close-history');
  elements.clearHistory = document.getElementById('clear-history');

  // Learning Mode
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

  // Hidden elements
  elements.planeSelect = document.getElementById('plane-select');
  elements.errorMessage = document.getElementById('error-message');
}

/**
 * Setup all event listeners
 */
function setupEventListeners() {
  // API Key modal
  elements.saveApiKey?.addEventListener('click', handleSaveApiKey);
  elements.apiKeyInput?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleSaveApiKey();
  });
  elements.closeModalBtn?.addEventListener('click', () => {
    elements.apiModal.classList.add('hidden');
  });

  // Navigation
  elements.historyBtn?.addEventListener('click', toggleHistoryPanel);
  elements.examplesBtn?.addEventListener('click', () => openCommandPalette());
  elements.learnBtn?.addEventListener('click', () => {
    if (currentData) {
      enterLearningMode(currentData);
    } else {
      showInfo('Visualize something first, then enter learning mode');
    }
  });
  elements.settingsBtn?.addEventListener('click', () => {
    if (elements.closeModalBtn) elements.closeModalBtn.classList.remove('hidden');
    elements.apiModal.classList.remove('hidden');
  });

  // AI status indicator - click to open API modal
  elements.aiStatus?.addEventListener('click', () => {
    if (elements.closeModalBtn) elements.closeModalBtn.classList.remove('hidden');
    elements.apiModal.classList.remove('hidden');
  });

  // Login/logout buttons
  document.getElementById('login-btn')?.addEventListener('click', handleLogin);
  document.getElementById('logout-btn')?.addEventListener('click', handleLogout);

  // Open command palette
  elements.openCommandBtn?.addEventListener('click', openCommandPalette);
  elements.newQueryBtn?.addEventListener('click', openCommandPalette);

  // Command palette
  elements.commandOverlay?.addEventListener('click', (e) => {
    if (e.target === elements.commandOverlay) closeCommandPalette();
  });

  // Main actions
  elements.visualizeBtn?.addEventListener('click', handleVisualize);
  elements.queryInput?.addEventListener('input', handleQueryInput);
  elements.queryInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleVisualize();
    }
    if (e.key === 'Escape') closeCommandPalette();
  });

  // File upload
  elements.dropZone?.addEventListener('click', () => elements.fileInput?.click());
  elements.dropZone?.addEventListener('dragover', handleDragOver);
  elements.dropZone?.addEventListener('dragleave', handleDragLeave);
  elements.dropZone?.addEventListener('drop', handleDrop);
  elements.fileInput?.addEventListener('change', handleFileSelect);

  // Example chips
  elements.exampleChips.forEach(chip => {
    chip.addEventListener('click', () => {
      if (elements.queryInput) {
        elements.queryInput.value = chip.dataset.query;
        elements.queryInput.focus();
      }
    });
  });

  // View controls
  elements.resetViewBtn?.addEventListener('click', resetCamera);
  elements.autoRotateBtn?.addEventListener('click', () => {
    const rotating = toggleAutoRotate();
    elements.autoRotateBtn.classList.toggle('active', rotating);
  });
  elements.exportBtn?.addEventListener('click', handleExport);

  // Animation controls
  elements.playBtn?.addEventListener('click', handlePlayPause);
  elements.timelineSlider?.addEventListener('input', handleSeek);
  elements.resetBtn?.addEventListener('click', handleReset);

  // Action buttons
  elements.toggleExplanation?.addEventListener('click', () => toggleExplanationPanel(!explanationVisible));
  elements.learningToggle?.addEventListener('click', () => {
    if (currentData) enterLearningMode(currentData);
  });

  // Explanation panel
  elements.closeExplanation?.addEventListener('click', () => toggleExplanationPanel(false));
  elements.copyExplanation?.addEventListener('click', handleCopyExplanation);
  elements.aiImprove?.addEventListener('click', handleImproveExplanation);
  elements.followUpSend?.addEventListener('click', handleFollowUp);
  elements.followUpInput?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleFollowUp();
  });

  // History panel
  elements.closeHistory?.addEventListener('click', () => toggleHistoryPanel());
  elements.clearHistory?.addEventListener('click', clearHistory);

  // Learning mode
  elements.exitLearning?.addEventListener('click', exitLearningMode);
  elements.learningSend?.addEventListener('click', handleLearningInput);
  elements.learningInput?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleLearningInput();
  });
  elements.learningPlayBtn?.addEventListener('click', handleLearningAnimationPlay);
  elements.learningTimeline?.addEventListener('input', handleLearningAnimationSeek);

  // Plane selector
  elements.planeSelect?.addEventListener('change', (e) => {
    currentPlane = e.target.value;
    if (currentData) renderVisualization(currentData);
  });
}

/**
 * Setup keyboard shortcuts
 */
function setupKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    // Cmd/Ctrl + K to open command palette
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      if (commandPaletteOpen) {
        closeCommandPalette();
      } else {
        openCommandPalette();
      }
    }

    // Escape to close panels
    if (e.key === 'Escape') {
      if (commandPaletteOpen) closeCommandPalette();
      if (explanationVisible) toggleExplanationPanel(false);
    }

    // Cmd/Ctrl + L for learning mode
    if ((e.metaKey || e.ctrlKey) && e.key === 'l' && currentData) {
      e.preventDefault();
      enterLearningMode(currentData);
    }
  });
}

/**
 * Open command palette
 */
function openCommandPalette() {
  commandPaletteOpen = true;
  elements.commandOverlay?.classList.remove('hidden');
  elements.queryInput?.focus();
  renderHistoryList();
}

/**
 * Close command palette
 */
function closeCommandPalette() {
  commandPaletteOpen = false;
  elements.commandOverlay?.classList.add('hidden');
}

/**
 * Handle query input (autocomplete)
 */
function handleQueryInput(e) {
  const query = e.target.value.trim();

  if (query.length > 2) {
    // Show AI autocomplete suggestions
    showAutocomplete(query);
  } else {
    elements.autocomplete?.classList.add('hidden');
  }
}

/**
 * Show autocomplete suggestions
 */
function showAutocomplete(query) {
  // Generate smart suggestions based on input
  const suggestions = generateSuggestions(query);

  if (suggestions.length === 0) {
    elements.autocomplete?.classList.add('hidden');
    return;
  }

  elements.autocomplete?.classList.remove('hidden');
  elements.autocompleteList.innerHTML = suggestions.map(s => `
    <button class="command-item" data-query="${s}">
      <div class="command-item-icon">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 2a10 10 0 1 0 10 10H12V2z" />
        </svg>
      </div>
      <span class="command-item-text">${s}</span>
    </button>
  `).join('');

  // Add click handlers
  elements.autocompleteList.querySelectorAll('.command-item').forEach(item => {
    item.addEventListener('click', () => {
      elements.queryInput.value = item.dataset.query;
      elements.autocomplete?.classList.add('hidden');
      handleVisualize();
    });
  });
}

/**
 * Generate smart suggestions based on query
 */
function generateSuggestions(query) {
  const lowerQuery = query.toLowerCase();
  const suggestions = [];

  // Math function suggestions
  if (lowerQuery.includes('sin') || lowerQuery.includes('cos') || lowerQuery.includes('tan')) {
    suggestions.push('Graph sin(x) and cos(x) together');
    suggestions.push('3D surface z = sin(x) * cos(y)');
  }

  if (lowerQuery.includes('vector')) {
    suggestions.push('Show unit vectors i, j, k in 3D');
    suggestions.push('Vector addition: (1,2,3) + (4,5,6)');
    suggestions.push('Cross product of two vectors');
  }

  if (lowerQuery.includes('matrix')) {
    suggestions.push('Linear transformation with matrix [[2,0],[0,2]]');
    suggestions.push('Visualize matrix eigenvalues and eigenvectors');
  }

  if (lowerQuery.includes('sphere') || lowerQuery.includes('ball')) {
    suggestions.push('3D sphere with radius 3 centered at origin');
    suggestions.push('Sphere equation x² + y² + z² = 16');
  }

  if (lowerQuery.includes('plane')) {
    suggestions.push('Plane defined by 2x + 3y - z = 6');
    suggestions.push('Intersection of two planes');
  }

  return suggestions.slice(0, 4);
}

/**
 * Load history from localStorage
 */
function loadHistory() {
  try {
    const saved = localStorage.getItem('mathviz_history');
    queryHistory = saved ? JSON.parse(saved) : [];
  } catch {
    queryHistory = [];
  }
}

/**
 * Save history to localStorage
 */
function saveHistory() {
  try {
    localStorage.setItem('mathviz_history', JSON.stringify(queryHistory.slice(0, 20)));
  } catch {
    // Ignore storage errors
  }
}

/**
 * Add query to history
 */
function addToHistory(query, description) {
  // Remove duplicates
  queryHistory = queryHistory.filter(h => h.query !== query);

  // Add to beginning
  queryHistory.unshift({
    query,
    description: description || query,
    timestamp: Date.now()
  });

  // Keep only 20 items
  queryHistory = queryHistory.slice(0, 20);
  saveHistory();
  renderHistoryList();
  renderHistoryPanel();
}

/**
 * Render history list in command palette
 */
function renderHistoryList() {
  if (!elements.historyList) return;

  if (queryHistory.length === 0) {
    elements.historyList.innerHTML = '<div class="command-empty">No history yet</div>';
    return;
  }

  elements.historyList.innerHTML = queryHistory.slice(0, 5).map(h => `
    <button class="command-item" data-query="${h.query}">
      <div class="command-item-icon">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      </div>
      <span class="command-item-text">${h.description}</span>
      <span class="command-item-time">${formatTimeAgo(h.timestamp)}</span>
    </button>
  `).join('');

  // Add click handlers
  elements.historyList.querySelectorAll('.command-item').forEach(item => {
    item.addEventListener('click', () => {
      elements.queryInput.value = item.dataset.query;
      handleVisualize();
    });
  });
}

/**
 * Render history panel
 */
function renderHistoryPanel() {
  if (!elements.historyContent) return;

  if (queryHistory.length === 0) {
    elements.historyContent.innerHTML = `
      <div class="history-empty">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
        <p>Your visualizations will appear here</p>
      </div>
    `;
    return;
  }

  elements.historyContent.innerHTML = queryHistory.map(h => `
    <button class="command-item" data-query="${h.query}">
      <div class="command-item-icon">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
        </svg>
      </div>
      <span class="command-item-text">${h.description}</span>
      <span class="command-item-time">${formatTimeAgo(h.timestamp)}</span>
    </button>
  `).join('');

  // Add click handlers
  elements.historyContent.querySelectorAll('.command-item').forEach(item => {
    item.addEventListener('click', () => {
      elements.queryInput.value = item.dataset.query;
      toggleHistoryPanel();
      openCommandPalette();
    });
  });
}

/**
 * Format timestamp to relative time
 */
function formatTimeAgo(timestamp) {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

/**
 * Clear history
 */
function clearHistory() {
  queryHistory = [];
  saveHistory();
  renderHistoryList();
  renderHistoryPanel();
  showSuccess('History cleared');
}

/**
 * Check if user is authenticated
 */
async function checkAuth() {
  currentUser = await API.getCurrentUser();
  updateUserUI();
}

/**
 * Load history from backend
 */
async function loadHistoryFromBackend() {
  try {
    const visualizations = await API.getVisualizations();
    queryHistory = visualizations.map(v => ({
      id: v._id,
      query: v.query,
      description: v.description || v.query,
      timestamp: new Date(v.createdAt).getTime(),
      cached: true,
      data: v
    }));
    renderHistoryList();
    renderHistoryPanel();
  } catch (error) {
    console.error('Failed to load history from backend:', error);
  }
}

/**
 * Update user UI based on login state
 */
function updateUserUI() {
  const loginBtn = document.getElementById('login-btn');
  const userInfo = document.getElementById('user-info');
  const userAvatar = document.getElementById('user-avatar');
  const userName = document.getElementById('user-name');

  if (currentUser) {
    loginBtn?.classList.add('hidden');
    userInfo?.classList.remove('hidden');
    if (userAvatar) userAvatar.src = currentUser.picture || '';
    if (userName) userName.textContent = currentUser.name || 'User';
  } else {
    loginBtn?.classList.remove('hidden');
    userInfo?.classList.add('hidden');
  }
}

/**
 * Handle login button click
 */
function handleLogin() {
  API.loginWithGoogle();
}

/**
 * Handle logout
 */
function handleLogout() {
  API.logout();
}

/**
 * Toggle history panel
 */
function toggleHistoryPanel() {
  const isVisible = !elements.historyPanel?.classList.contains('hidden');
  elements.historyPanel?.classList.toggle('hidden', isVisible);

  if (!isVisible) {
    renderHistoryPanel();
  }
}

/**
 * Update AI status indicator
 */
function updateAIStatus(connected) {
  if (!elements.aiStatus) return;

  if (connected) {
    elements.aiStatus.innerHTML = `
      <span class="status-dot"></span>
      <span>AI Ready</span>
    `;
    elements.aiStatus.style.background = 'rgba(34, 197, 94, 0.1)';
    elements.aiStatus.style.color = 'var(--success)';
  } else {
    elements.aiStatus.innerHTML = `
      <span class="status-dot" style="background: var(--warning); animation: none;"></span>
      <span>Connect AI</span>
    `;
    elements.aiStatus.style.background = 'rgba(245, 158, 11, 0.1)';
    elements.aiStatus.style.color = 'var(--warning)';
  }
}

/**
 * Show AI suggestions based on visualization
 */
function showAISuggestions(data) {
  if (!elements.aiSuggestions || !data) return;

  // Generate related concepts
  const suggestions = generateRelatedConcepts(data);

  if (suggestions.length === 0) {
    elements.aiSuggestions.classList.add('hidden');
    return;
  }

  elements.aiSuggestions.classList.remove('hidden');
  elements.suggestionsList.innerHTML = suggestions.map(s =>
    `<button class="suggestion-chip" data-query="${s}">${s}</button>`
  ).join('');

  // Add click handlers
  elements.suggestionsList.querySelectorAll('.suggestion-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      elements.queryInput.value = chip.dataset.query;
      openCommandPalette();
    });
  });
}

/**
 * Generate related concepts based on visualization
 */
function generateRelatedConcepts(data) {
  const suggestions = [];
  const objects = data.objects || [];

  // Analyze object types
  const hasVectors = objects.some(o => o.kind?.includes('vector'));
  const hasPlanes = objects.some(o => o.kind?.includes('plane'));
  const hasFunctions = objects.some(o => o.kind?.includes('function'));
  const hasSurfaces = objects.some(o => o.kind?.includes('sphere') || o.kind?.includes('surface'));

  if (hasVectors) {
    suggestions.push('Vector cross product');
    suggestions.push('Vector projections');
  }

  if (hasPlanes) {
    suggestions.push('Plane intersections');
    suggestions.push('Normal vectors');
  }

  if (hasFunctions) {
    suggestions.push('Derivatives');
    suggestions.push('Integrals');
  }

  if (hasSurfaces) {
    suggestions.push('Surface area');
    suggestions.push('Volume integral');
  }

  return suggestions.slice(0, 4);
}



/**
 * Handle improve explanation (AI enhancement)
 */
async function handleImproveExplanation() {
  if (!currentData?.explanation || !isInitialized()) return;

  showInfo('Improving explanation...');

  try {
    const improved = await generateVisualization(
      `Please provide a more detailed, intuitive explanation of: ${currentData.description}. 
       Focus on geometric intuition and step-by-step reasoning.`
    );

    if (improved?.explanation) {
      currentData.explanation = improved.explanation;
      showExplanation(currentData);
      showSuccess('Explanation improved');
    }
  } catch (error) {
    showError('Could not improve explanation');
  }
}

/**
 * Handle follow-up question
 */
async function handleFollowUp() {
  const query = elements.followUpInput?.value.trim();
  if (!query || !isInitialized()) return;

  elements.followUpInput.value = '';
  showInfo('Processing...');

  try {
    const context = currentData?.description || '';
    const data = await generateVisualization(`${query} (Context: ${context})`);

    if (data?.explanation) {
      // Append to current explanation
      const newContent = document.createElement('div');
      newContent.className = 'follow-up-section';
      newContent.innerHTML = `
        <h4 class="follow-up-question">📝 "${query}"</h4>
        ${marked.parse(processLatex(data.explanation))}
      `;
      elements.explanationContent?.appendChild(newContent);
      newContent.scrollIntoView({ behavior: 'smooth' });
    }

    // Update visualization if new objects
    if (data?.objects?.length > 0) {
      currentData = data;
      renderVisualization(data);
    }
  } catch (error) {
    showError('Could not process follow-up');
  }
}

/**
 * Process LaTeX in text
 */
function processLatex(content) {
  // Display LaTeX
  content = content.replace(/\$\$(.*?)\$\$/gs, (match, latex) => {
    try {
      return `<div class="katex-display">${katex.renderToString(latex.trim(), { displayMode: true, throwOnError: false })}</div>`;
    } catch {
      return `<div class="katex-display">${match}</div>`;
    }
  });

  // Inline LaTeX
  content = content.replace(/\$(.*?)\$/g, (match, latex) => {
    try {
      return katex.renderToString(latex.trim(), { displayMode: false, throwOnError: false });
    } catch {
      return match;
    }
  });

  return content;
}

/**
 * Handle export image
 */
function handleExport() {
  const dataUrl = exportImage();

  if (!dataUrl) {
    showWarning('No visualization to export');
    return;
  }

  try {
    const link = document.createElement('a');
    link.download = `mathviz-${Date.now()}.png`;
    link.href = dataUrl;
    link.click();
    showSuccess('Image exported successfully');
  } catch (error) {
    showError('Export failed');
  }
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
  const key = elements.apiKeyInput?.value.trim();
  if (!key) {
    showError('Please enter a valid API key');
    return;
  }

  try {
    initializeGemini(key);
    localStorage.setItem('gemini_api_key', key);
    elements.apiModal.classList.add('hidden');
    updateAIStatus(true);
    initializeRenderers();
    showSuccess('AI connected successfully');
  } catch (error) {
    showError('Failed to connect AI');
  }
}

/**
 * Handle visualization request
 */
async function handleVisualize() {
  const query = elements.queryInput?.value.trim();

  if (!query && !uploadedFile) {
    showWarning('Enter a math expression or upload a document');
    return;
  }

  if (!isInitialized()) {
    elements.apiModal.classList.remove('hidden');
    return;
  }

  setLoading(true);
  closeCommandPalette();

  try {
    let data;

    if (uploadedFile) {
      showInfo('Processing file...');
      data = await processMultimodalInput(uploadedFile.base64, uploadedFile.mimeType, query);
    } else {
      data = await generateVisualization(query);
    }

    if (!data?.objects?.length) {
      throw new Error('No visualization data generated');
    }

    currentData = data;

    // Add to history
    addToHistory(query, data.description || query);

    if (isLearningMode) {
      enterLearningMode(data);
    } else {
      renderVisualization(data);
      showExplanation(data);
      showAISuggestions(data);
    }

    showSuccess('Visualization created');

  } catch (error) {
    console.error('Visualization error:', error);
    showError(error.message || 'Failed to generate visualization');
  } finally {
    setLoading(false);
  }
}

/**
 * Render the visualization
 */
function renderVisualization(data) {
  // Hide empty state
  elements.emptyState?.classList.add('hidden');

  // Show controls
  elements.viewControls?.classList.remove('hidden');
  elements.actionButtons?.classList.remove('hidden');

  // Update description
  if (elements.descriptionText && data.description) {
    elements.descriptionText.textContent = data.description;
    elements.descriptionBar?.classList.remove('hidden');
  }

  // Render 3D
  const legendItems = render3D(data, { plane: currentPlane });
  updateLegend(legendItems);
  setupAnimation(data);
}

/**
 * Update legend
 */
function updateLegend(items) {
  if (!items?.length) {
    elements.legend?.classList.add('hidden');
    return;
  }

  elements.legend?.classList.remove('hidden');
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
 * Setup animation
 */
function setupAnimation(data) {
  const animConfig = data.animation || { type: 'scale_grow', duration_seconds: 3, easing: 'ease-out' };

  const hasAnimation = Animation.initAnimation(
    animConfig,
    data.objects,
    (progress, time, duration, type, config, revealParams) => {
      render3D(data, {
        plane: currentPlane,
        animationProgress: progress,
        animationType: type,
        revealParams
      });
      updateTimeDisplay(time, duration);
    },
    () => updatePlayButton(false)
  );

  if (hasAnimation) {
    elements.animationControls?.classList.remove('hidden');
    updateTimeDisplay(0, animConfig.duration_seconds || 3);

    setTimeout(() => {
      Animation.play();
      updatePlayButton(true);
    }, 500);
  } else {
    elements.animationControls?.classList.add('hidden');
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
  elements.playIcon?.classList.toggle('hidden', isPlaying);
  elements.pauseIcon?.classList.toggle('hidden', !isPlaying);
}

function updateTimeDisplay(current, total) {
  if (elements.timeDisplay) {
    elements.timeDisplay.textContent = `${Animation.formatTime(current)} / ${Animation.formatTime(total)}`;
  }
  if (elements.timelineSlider) {
    elements.timelineSlider.value = (current / total) * 100;
  }
}

/**
 * Toggle explanation panel
 */
function toggleExplanationPanel(show) {
  explanationVisible = show;
  elements.explanationPanel?.classList.toggle('hidden', !show);
  elements.toggleExplanation?.classList.toggle('active', show);
}

/**
 * Show explanation
 */
function showExplanation(data) {
  if (!data?.explanation) {
    toggleExplanationPanel(false);
    return;
  }

  const content = processLatex(data.explanation);
  if (elements.explanationContent) {
    elements.explanationContent.innerHTML = marked.parse(content);
  }

  toggleExplanationPanel(true);
}

/**
 * Handle copy explanation
 */
async function handleCopyExplanation() {
  if (!currentData?.explanation) return;

  try {
    await navigator.clipboard.writeText(currentData.explanation);
    showSuccess('Copied to clipboard');
  } catch {
    showError('Copy failed');
  }
}

// Learning Mode Functions
function enterLearningMode(data) {
  isLearningMode = true;
  elements.appContainer?.classList.add('hidden');
  elements.learningMode?.classList.remove('hidden');

  if (elements.learningTopic) {
    elements.learningTopic.textContent = data.description || 'Learning Session';
  }

  if (!learningRenderer && elements.learningCanvas) {
    init3D(elements.learningCanvas);
    learningRenderer = true;
  }

  if (data.objects?.length > 0) {
    render3D(data, { plane: currentPlane });
  }

  renderTheoryContent(data);
  renderPracticeQuestions(data.practice_questions);

  if (data.animation?.description && elements.learningAnimLabel) {
    elements.learningAnimLabel.textContent = data.animation.description;
  }
}

function exitLearningMode() {
  isLearningMode = false;
  learningRenderer = null;
  Animation.disposeAnimation();

  elements.appContainer?.classList.remove('hidden');
  elements.learningMode?.classList.add('hidden');

  init3D(elements.canvas3D);

  if (currentData?.objects?.length > 0) {
    render3D(currentData, { plane: currentPlane });
  }
}

function handleLearningAnimationPlay() {
  const state = Animation.getState();
  if (state.type === 'none' && currentData) {
    setupLearningAnimation(currentData);
  }
  const isNowPlaying = Animation.togglePlay();
  updateLearningAnimationUI(isNowPlaying);
}

function handleLearningAnimationSeek(e) {
  Animation.seekPercent(parseFloat(e.target.value));
}

function setupLearningAnimation(data) {
  const config = data.animation || { type: 'scale_grow', duration_seconds: 3, easing: 'ease-out' };

  Animation.initAnimation(config, data.objects, (progress, time, duration, type, animConfig, revealParams) => {
    if (elements.learningTimeline) elements.learningTimeline.value = progress * 100;
    if (elements.learningTime) {
      elements.learningTime.textContent = `${Animation.formatTime(time)} / ${Animation.formatTime(duration)}`;
    }
    render3D(data, { plane: currentPlane, animationProgress: progress, animationType: type, revealParams });
  }, () => updateLearningAnimationUI(false));
}

function updateLearningAnimationUI(isPlaying) {
  const playIcon = document.getElementById('learning-play-icon');
  const pauseIcon = document.getElementById('learning-pause-icon');
  playIcon?.classList.toggle('hidden', isPlaying);
  pauseIcon?.classList.toggle('hidden', !isPlaying);
}

async function handleLearningInput() {
  const query = elements.learningInput?.value.trim();
  if (!query) return;

  elements.learningInput.value = '';

  const loadingDiv = document.createElement('div');
  loadingDiv.className = 'follow-up-loading';
  loadingDiv.innerHTML = '<p><em>Thinking...</em></p>';

  const theoryText = elements.learningTheoryContent?.querySelector('.theory-text');
  theoryText?.appendChild(loadingDiv);

  try {
    const data = await generateVisualization(query);
    loadingDiv.remove();
    appendFollowUpContent(query, data);

    if (data.objects?.length > 0) {
      render3D(data, { plane: currentPlane });
    }

    if (data.practice_questions?.length > 0) {
      appendPracticeQuestions(data.practice_questions);
    }
  } catch {
    loadingDiv.remove();
    showError('Could not process question');
  }
}

function appendFollowUpContent(query, data) {
  const theoryText = elements.learningTheoryContent?.querySelector('.theory-text');
  if (!theoryText || !data.explanation) return;

  const followUpDiv = document.createElement('div');
  followUpDiv.className = 'follow-up-section';
  followUpDiv.innerHTML = `
    <h4 class="follow-up-question">📝 "${query}"</h4>
    ${marked.parse(processLatex(data.explanation))}
  `;
  theoryText.appendChild(followUpDiv);
  followUpDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function renderTheoryContent(data) {
  if (!elements.learningTheoryContent || !data.explanation) return;

  const content = processLatex(data.explanation);

  let theoryText = elements.learningTheoryContent.querySelector('.theory-text');
  if (!theoryText) {
    theoryText = document.createElement('div');
    theoryText.className = 'theory-text';
    elements.learningTheoryContent.insertBefore(theoryText, elements.learningPractice);
  }
  theoryText.innerHTML = marked.parse(content);
}

function renderPracticeQuestions(questions) {
  if (!elements.practiceQuestions || !elements.learningPractice) return;

  if (!questions?.length) {
    elements.learningPractice.classList.add('hidden');
    return;
  }

  elements.learningPractice.classList.remove('hidden');
  elements.practiceQuestions.innerHTML = questions.map((q, i) => `
    <div class="practice-question" data-index="${i}">
      <p><strong>Q${i + 1}:</strong> ${q.question}</p>
      <input type="text" class="practice-answer-input" placeholder="Your answer..."/>
      <p class="practice-hint">${q.hint || ''}</p>
    </div>
  `).join('');
}

function appendPracticeQuestions(questions) {
  if (!elements.practiceQuestions || !questions?.length) return;

  elements.learningPractice?.classList.remove('hidden');
  const startIndex = elements.practiceQuestions.querySelectorAll('.practice-question').length;

  const html = questions.map((q, i) => {
    const idx = startIndex + i;
    return `
      <div class="practice-question" data-index="${idx}">
        <p><strong>Q${idx + 1}:</strong> ${q.question}</p>
        <input type="text" class="practice-answer-input" placeholder="Your answer..."/>
        <p class="practice-hint">${q.hint || ''}</p>
      </div>
    `;
  }).join('');

  elements.practiceQuestions.insertAdjacentHTML('beforeend', html);
}

// File upload handlers
function handleDragOver(e) {
  e.preventDefault();
  elements.dropZone?.classList.add('drag-over');
}

function handleDragLeave(e) {
  e.preventDefault();
  elements.dropZone?.classList.remove('drag-over');
}

function handleDrop(e) {
  e.preventDefault();
  elements.dropZone?.classList.remove('drag-over');
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
    showSuccess(`File uploaded: ${file.name}`);
  } catch (error) {
    showError(error.message);
    uploadedFile = null;
  }
}

function showFilePreview(fileData) {
  if (!elements.filePreview) return;

  elements.filePreview.classList.remove('hidden');
  elements.filePreview.innerHTML = `
    <span>${fileData.icon} ${fileData.fileName}</span>
    <button onclick="window.removeFile()" style="background:none;border:none;color:var(--text-muted);cursor:pointer;">✕</button>
  `;
}

window.removeFile = function () {
  uploadedFile = null;
  elements.filePreview?.classList.add('hidden');
  if (elements.fileInput) elements.fileInput.value = '';
};

// UI Helpers
function setLoading(loading) {
  if (elements.visualizeBtn) elements.visualizeBtn.disabled = loading;
  elements.btnText?.classList.toggle('hidden', loading);
  elements.btnLoader?.classList.toggle('hidden', !loading);
}

// Initialize
document.addEventListener('DOMContentLoaded', init);
