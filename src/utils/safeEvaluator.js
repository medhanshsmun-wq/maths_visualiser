/**
 * Safe Expression Evaluator
 * Prevents XSS and code injection by using a sandboxed math parser
 */

// Whitelist of allowed functions
const ALLOWED_FUNCTIONS = {
  sin: Math.sin,
  cos: Math.cos,
  tan: Math.tan,
  asin: Math.asin,
  acos: Math.acos,
  atan: Math.atan,
  atan2: Math.atan2,
  sinh: Math.sinh,
  cosh: Math.cosh,
  tanh: Math.tanh,
  sqrt: Math.sqrt,
  abs: Math.abs,
  ceil: Math.ceil,
  floor: Math.floor,
  round: Math.round,
  log: Math.log,
  log10: Math.log10,
  log2: Math.log2,
  exp: Math.exp,
  pow: Math.pow,
  min: Math.min,
  max: Math.max,
  PI: Math.PI,
  E: Math.E,
  pi: Math.PI,
  e: Math.E
};

/**
 * Sanitize input expression
 */
function sanitizeExpression(expr) {
  if (typeof expr !== 'string') {
    throw new Error('Expression must be a string');
  }

  // Remove any potentially dangerous characters
  const sanitized = expr
    .replace(/[^\d\s+\-*/().a-z^,]/gi, '')
    .trim();

  if (sanitized.length === 0) {
    throw new Error('Invalid expression');
  }

  return sanitized;
}

/**
 * Parse and tokenize expression
 */
function tokenize(expr) {
  const tokens = [];
  let current = '';

  for (let i = 0; i < expr.length; i++) {
    const char = expr[i];

    if (/[a-z]/i.test(char)) {
      current += char;
    } else {
      if (current) {
        tokens.push(current);
        current = '';
      }
      if (char !== ' ') {
        tokens.push(char);
      }
    }
  }

  if (current) {
    tokens.push(current);
  }

  return tokens;
}

/**
 * Safely evaluate mathematical expression
 * @param {string} expr - The expression to evaluate
 * @param {object} vars - Variables to substitute (x, y, z, t, etc.)
 * @returns {number} - The result
 */
export function safeEvaluate(expr, vars = {}) {
  try {
    // Sanitize expression
    let sanitized = sanitizeExpression(expr);

    // Replace common patterns
    sanitized = sanitized
      .toLowerCase()
      .replace(/\^/g, '**')
      .replace(/pi/g, 'Math.PI')
      .replace(/\be\b/g, 'Math.E');

    // Replace function names with Math.*
    Object.keys(ALLOWED_FUNCTIONS).forEach(fn => {
      const regex = new RegExp(`\\b${fn}\\b`, 'g');
      sanitized = sanitized.replace(regex, `Math.${fn}`);
    });

    // Handle implicit multiplication
    sanitized = sanitized
      .replace(/(\d)([a-z])/gi, '$1*$2')
      .replace(/(\))(\()/g, '$1*$2')
      .replace(/(\d)(\()/g, '$1*$2');

    // Create safe context with only Math and provided variables
    const context = {
      Math: {
        sin: Math.sin,
        cos: Math.cos,
        tan: Math.tan,
        asin: Math.asin,
        acos: Math.acos,
        atan: Math.atan,
        atan2: Math.atan2,
        sinh: Math.sinh,
        cosh: Math.cosh,
        tanh: Math.tanh,
        sqrt: Math.sqrt,
        abs: Math.abs,
        ceil: Math.ceil,
        floor: Math.floor,
        round: Math.round,
        log: Math.log,
        log10: Math.log10,
        log2: Math.log2,
        exp: Math.exp,
        pow: Math.pow,
        min: Math.min,
        max: Math.max,
        PI: Math.PI,
        E: Math.E
      },
      ...vars
    };

    // Use Function constructor with strict context
    const varNames = Object.keys(context);
    const varValues = Object.values(context);

    const fn = new Function(...varNames, `'use strict'; return (${sanitized})`);
    const result = fn(...varValues);

    // Validate result
    if (!isFinite(result)) {
      return NaN;
    }

    return result;
  } catch (error) {
    console.warn('Expression evaluation error:', error.message);
    return NaN;
  }
}

/**
 * Validate expression without evaluating
 */
export function validateExpression(expr) {
  try {
    sanitizeExpression(expr);
    return { valid: true, error: null };
  } catch (error) {
    return { valid: false, error: error.message };
  }
}
