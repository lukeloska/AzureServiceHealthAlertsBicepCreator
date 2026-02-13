/**
 * Generic data loader utility for populating select elements from JSON files
 */

/**
 * Load data from a JSON file and populate a select element
 * @param {string} selectId - The ID of the select element to populate
 * @param {string} jsonPath - The path to the JSON file (e.g., 'data/services.json')
 * @param {string} placeholderText - The text for the placeholder option (default: 'Loading...')
 * @returns {Promise<void>}
 */
async function loadSelectFromJSON(selectId, jsonPath, placeholderText = 'Loading...') {
  const selectElement = document.getElementById(selectId);
  
  if (!selectElement) {
    console.error(`Select element with ID "${selectId}" not found`);
    return;
  }

  try {
    const response = await fetch(jsonPath);
    
    if (!response.ok) {
      const errorMsg = response.status === 404 
        ? `${jsonPath} not found. Make sure the data file exists.`
        : `HTTP ${response.status}: Failed to load ${jsonPath}`;
      throw new Error(errorMsg);
    }

    const data = await response.json();

    // Clear and rebuild options
    // For multi-select fields, don't add a placeholder option
    if (selectElement.multiple) {
      selectElement.innerHTML = '';
    } else {
      selectElement.innerHTML = `<option value="">Select ${selectId}...</option>`;
    }
    
    if (Array.isArray(data) && data.length > 0) {
      data.forEach(item => {
        if (!item.value || !item.label) {
          console.warn(`Invalid data format in ${jsonPath}:`, item);
          return;
        }
        const option = document.createElement('option');
        option.value = item.value;
        option.textContent = item.label;
        selectElement.appendChild(option);
      });
    } else {
      throw new Error(`No valid data in ${jsonPath}. Expected array of objects with 'value' and 'label' properties.`);
    }
  } catch (error) {
    console.error(`Error loading ${jsonPath}:`, error);
    const errorMsg = error.message || 'Unknown error';
    selectElement.innerHTML = `<option value="">❌ Error loading. ${errorMsg}</option>`;
    selectElement.setAttribute('aria-label', `Error loading ${selectId}: ${errorMsg}`);
    selectElement.disabled = true;
  }
}

/**
 * Load multiple select elements in parallel
 * @param {Array<{selectId: string, jsonPath: string}>} configs - Array of select/path configurations
 * @returns {Promise<void>}
 */
async function loadMultipleSelects(configs) {
  await Promise.all(
    configs.map(({ selectId, jsonPath }) => loadSelectFromJSON(selectId, jsonPath))
  );
}
