/**
 * API Service for MathViz Backend
 */

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Get stored auth token
function getToken() {
    return localStorage.getItem('mathviz_token');
}

// Set auth token
export function setToken(token) {
    localStorage.setItem('mathviz_token', token);
}

// Clear auth token
export function clearToken() {
    localStorage.removeItem('mathviz_token');
}

// Check if logged in
export function isLoggedIn() {
    return !!getToken();
}

// Get auth headers
function getHeaders() {
    const token = getToken();
    return {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
    };
}

/**
 * Get current user
 */
export async function getCurrentUser() {
    if (!isLoggedIn()) return null;

    try {
        const res = await fetch(`${API_BASE}/auth/me`, {
            headers: getHeaders()
        });

        if (!res.ok) {
            if (res.status === 401) {
                clearToken();
                return null;
            }
            throw new Error('Failed to get user');
        }

        return await res.json();
    } catch (error) {
        console.error('Get user error:', error);
        return null;
    }
}

/**
 * Login with Google - redirects to OAuth
 */
export function loginWithGoogle() {
    window.location.href = `${API_BASE}/auth/google`;
}

/**
 * Logout
 */
export function logout() {
    clearToken();
    window.location.reload();
}

/**
 * Get all visualizations for current user
 */
export async function getVisualizations() {
    if (!isLoggedIn()) return [];

    try {
        const res = await fetch(`${API_BASE}/api/visualizations`, {
            headers: getHeaders()
        });

        if (!res.ok) throw new Error('Failed to fetch');

        return await res.json();
    } catch (error) {
        console.error('Fetch visualizations error:', error);
        return [];
    }
}

/**
 * Get single visualization by ID
 */
export async function getVisualization(id) {
    if (!isLoggedIn()) return null;

    try {
        const res = await fetch(`${API_BASE}/api/visualizations/${id}`, {
            headers: getHeaders()
        });

        if (!res.ok) return null;

        return await res.json();
    } catch (error) {
        console.error('Fetch visualization error:', error);
        return null;
    }
}

/**
 * Save visualization
 */
export async function saveVisualization(data) {
    if (!isLoggedIn()) return null;

    try {
        const res = await fetch(`${API_BASE}/api/visualizations`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({
                query: data.query || '',
                description: data.description || '',
                objects: data.objects || [],
                explanation: data.explanation || '',
                animation: data.animation || {},
                view: data.view || {}
            })
        });

        if (!res.ok) throw new Error('Failed to save');

        return await res.json();
    } catch (error) {
        console.error('Save visualization error:', error);
        return null;
    }
}

/**
 * Delete visualization
 */
export async function deleteVisualization(id) {
    if (!isLoggedIn()) return false;

    try {
        const res = await fetch(`${API_BASE}/api/visualizations/${id}`, {
            method: 'DELETE',
            headers: getHeaders()
        });

        return res.ok;
    } catch (error) {
        console.error('Delete visualization error:', error);
        return false;
    }
}
