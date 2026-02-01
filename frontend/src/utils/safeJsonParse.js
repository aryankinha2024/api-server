/**
 * Safely parse JSON without crashing
 * Returns parsed object or fallback value if parsing fails
 * 
 * @param {string} jsonStr - The JSON string to parse
 * @param {any} fallback - The value to return if parsing fails (default: null)
 * @returns {any} - Parsed object or fallback value
 */
export const safeJsonParse = (jsonStr, fallback = null) => {
  // Guard against undefined, null, or empty string
  if (jsonStr === undefined || jsonStr === null || jsonStr === '') {
    return fallback;
  }

  try {
    const parsed = JSON.parse(jsonStr);
    return parsed;
  } catch (error) {
    console.warn(`Failed to parse JSON: ${error.message}`, jsonStr);
    return fallback;
  }
};

/**
 * Safely get item from localStorage and parse it
 * 
 * @param {string} key - The localStorage key
 * @param {any} fallback - The value to return if not found or parsing fails
 * @returns {any} - Parsed object or fallback value
 */
export const safeLocalStorageGetJson = (key, fallback = null) => {
  try {
    const item = localStorage.getItem(key);
    return safeJsonParse(item, fallback);
  } catch (error) {
    console.warn(`Failed to get JSON from localStorage[${key}]: ${error.message}`);
    return fallback;
  }
};

/**
 * Safely get item from sessionStorage and parse it
 * 
 * @param {string} key - The sessionStorage key
 * @param {any} fallback - The value to return if not found or parsing fails
 * @returns {any} - Parsed object or fallback value
 */
export const safeSessionStorageGetJson = (key, fallback = null) => {
  try {
    const item = sessionStorage.getItem(key);
    return safeJsonParse(item, fallback);
  } catch (error) {
    console.warn(`Failed to get JSON from sessionStorage[${key}]: ${error.message}`);
    return fallback;
  }
};

/**
 * Safely set item to localStorage as JSON
 * 
 * @param {string} key - The localStorage key
 * @param {any} value - The value to store (will be stringified)
 * @returns {boolean} - True if successful, false otherwise
 */
export const safeLocalStorageSetJson = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.warn(`Failed to set JSON to localStorage[${key}]: ${error.message}`);
    return false;
  }
};

/**
 * Validate user object has required fields
 * 
 * @param {object} user - The user object to validate
 * @returns {boolean} - True if user has required fields, false otherwise
 */
export const isValidUserObject = (user) => {
  if (!user || typeof user !== 'object') {
    return false;
  }

  // Check for required fields (at least _id or id, and name)
  const hasId = user._id || user.id;
  const hasName = user.name && typeof user.name === 'string' && user.name.trim().length > 0;

  return !!hasId && !!hasName;
};
