/**
 * Input validation utilities
 */

/**
 * Validate GUID format (UUID v4)
 * @param {string} value - The GUID string to validate
 * @returns {Object} - { isValid: boolean, message: string }
 */
function validateSubscriptionId(value) {
  if (!value || value.trim() === '') {
    return { isValid: false, message: 'Subscription ID is required. Enter your Azure subscription ID to scope the alert.' };
  }

  const cleanValue = value.trim();
  
  // Check for common formatting issues
  if (cleanValue.length > 0 && !cleanValue.includes('-')) {
    return { 
      isValid: false, 
      message: 'Subscription ID appears to be missing hyphens. Expected format: 00000000-0000-0000-0000-000000000000' 
    };
  }

  const guidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  
  if (!guidRegex.test(cleanValue)) {
    return {
      isValid: false,
      message: 'Invalid Subscription ID format. Expected: 00000000-0000-0000-0000-000000000000 (36 characters with hyphens)'
    };
  }

  return { isValid: true, message: '' };
}

/**
 * Validate alert name
 * @param {string} value - The alert name to validate
 * @returns {Object} - { isValid: boolean, message: string }
 */
function validateAlertName(value) {
  if (!value || value.trim() === '') {
    return { isValid: false, message: 'Alert Name is required. Provide a descriptive name for this alert.' };
  }

  const trimmedValue = value.trim();

  if (trimmedValue.length < 3) {
    return { isValid: false, message: `Alert Name is too short (${trimmedValue.length} chars). Minimum 3 characters required.` };
  }

  if (trimmedValue.length > 260) {
    return { isValid: false, message: `Alert Name is too long (${trimmedValue.length} chars). Maximum 260 characters allowed.` };
  }

  // Check for invalid characters (Azure resource naming rules)
  const invalidCharsRegex = /[<>%&\\?\/]/;
  if (invalidCharsRegex.test(trimmedValue)) {
    const found = trimmedValue.match(/[<>%&\\?\/]/g).join(', ');
    return { isValid: false, message: `Alert Name contains invalid characters: ${found}. Use letters, numbers, spaces, and hyphens only.` };
  }

  return { isValid: true, message: '' };
}

/**
 * Display validation error message
 * @param {HTMLElement} inputElement - The input element
 * @param {string} message - The error message
 */
function showValidationError(inputElement, message) {
  inputElement.setAttribute('aria-invalid', 'true');
  inputElement.classList.add('input-error');
  
  // Find or create error message element
  let errorElement = inputElement.nextElementSibling;
  while (errorElement && !errorElement.classList.contains('error-message')) {
    errorElement = errorElement.nextElementSibling;
  }
  
  if (!errorElement) {
    errorElement = document.createElement('div');
    errorElement.className = 'error-message';
    errorElement.setAttribute('role', 'alert');
    errorElement.setAttribute('aria-live', 'polite');
    errorElement.setAttribute('aria-atomic', 'true');
    inputElement.parentNode.insertBefore(errorElement, inputElement.nextSibling);
  }
  
  errorElement.textContent = message;
  errorElement.style.display = 'block';
  
  // Announce to screen readers
  inputElement.setAttribute('aria-describedby', errorElement.id || 'error-' + inputElement.id);
}

/**
 * Clear validation error message
 * @param {HTMLElement} inputElement - The input element
 */
function clearValidationError(inputElement) {
  inputElement.setAttribute('aria-invalid', 'false');
  inputElement.classList.remove('input-error');
  
  const errorElement = inputElement.nextElementSibling;
  if (errorElement && errorElement.classList.contains('error-message')) {
    errorElement.style.display = 'none';
    errorElement.textContent = '';
  }
}

/**
 * Validate form field selections
 * @param {string} selectId - The ID of the select element
 * @param {string} fieldName - The human-readable field name
 * @returns {Object} - { isValid: boolean, message: string }
 */
function validateSelectField(selectId, fieldName) {
  const selectElement = document.getElementById(selectId);
  const selectedOptions = Array.from(selectElement.selectedOptions).filter(opt => opt.value !== '');

  if (selectedOptions.length === 0) {
    return { isValid: false, message: `Please select at least one ${fieldName}. Use Ctrl/Cmd+Click to select multiple.` };
  }

  return { isValid: true, message: '' };
}

/**
 * Validate all required form fields
 * @returns {boolean} - True if all fields are valid
 */
function validateForm() {
  let isValid = true;

  // Validate Subscription ID
  const subscriptionIdInput = document.getElementById('subscriptionId');
  const subscriptionValidation = validateSubscriptionId(subscriptionIdInput.value);
  if (!subscriptionValidation.isValid) {
    showValidationError(subscriptionIdInput, subscriptionValidation.message);
    isValid = false;
  } else {
    clearValidationError(subscriptionIdInput);
  }

  // Validate Alert Name
  const alertNameInput = document.getElementById('alertName');
  const alertNameValidation = validateAlertName(alertNameInput.value);
  if (!alertNameValidation.isValid) {
    showValidationError(alertNameInput, alertNameValidation.message);
    isValid = false;
  } else {
    clearValidationError(alertNameInput);
  }

  // Validate Service selection
  const serviceValidation = validateSelectField('service', 'service');
  if (!serviceValidation.isValid) {
    const serviceSelect = document.getElementById('service');
    showValidationError(serviceSelect, serviceValidation.message);
    isValid = false;
  } else {
    clearValidationError(document.getElementById('service'));
  }

  // Validate Event Type selection
  const eventTypeValidation = validateSelectField('eventType', 'event type');
  if (!eventTypeValidation.isValid) {
    const eventTypeSelect = document.getElementById('eventType');
    showValidationError(eventTypeSelect, eventTypeValidation.message);
    isValid = false;
  } else {
    clearValidationError(document.getElementById('eventType'));
  }

  // Validate Region selection
  const regionValidation = validateSelectField('region', 'region');
  if (!regionValidation.isValid) {
    const regionSelect = document.getElementById('region');
    showValidationError(regionSelect, regionValidation.message);
    isValid = false;
  } else {
    clearValidationError(document.getElementById('region'));
  }

  // Validate Severity selection
  const severityValidation = validateSelectField('severity', 'severity level');
  if (!severityValidation.isValid) {
    const severitySelect = document.getElementById('severity');
    showValidationError(severitySelect, severityValidation.message);
    isValid = false;
  } else {
    clearValidationError(document.getElementById('severity'));
  }

  return isValid;
}
