/**
 * Form Validation Library
 * Handles all form validations and error displays
 */

// Validation functions
const Validators = {
  // Zip code validation (5 digits)
  zipCode: (zip) => {
    const zipRegex = /^\d{5}(-\d{4})?$/;
    return zipRegex.test(zip);
  },

  // Mileage validation (positive number less than 1M)
  mileage: (mileage) => {
    const miles = Number(mileage);
    return miles > 0 && miles < 1000000;
  },

  // Email validation
  email: (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  // Phone validation
  phone: (phone) => {
    // Remove all non-digit characters for validation
    const cleanedPhone = phone.replace(/\D/g, '');
    // Check if we have exactly 10 digits for a US phone number
    return cleanedPhone.length === 10;
  },

  // Name validation (letters and spaces only, min 2 chars)
  name: (name) => {
    const trimmed = name.trim();
    const nameRegex = /^[A-Za-z\s]+$/;
    return trimmed.length >= 2 && nameRegex.test(trimmed);
  },

  // VIN validation (17 alphanumeric characters)
  vin: (vin) => {
    const vinRegex = /^[A-HJ-NPR-Z0-9]{17}$/;
    return vinRegex.test(vin);
  },

  // License plate validation (2-8 characters)
  licensePlate: (plate) => {
    return plate.length >= 2 && plate.length <= 8;
  },
};

// Error messages
const ErrorMessages = {
  required: "This field is required",
  zipCode: "Please enter a valid 5-digit ZIP code",
  mileage: "Please enter a valid mileage between 0 and 1,000,000",
  email: "Please enter a valid email address",
  phone: "Please enter a valid phone number (e.g., (212) 445-5454)",
  name: "Name must be at least 2 characters long and contain only letters",
  vin: "Please enter a valid 17-character VIN number",
  licensePlate: "License plate must be between 2-8 characters",
  state: "Please select a state",
  radioGroup: "Please select an option",
};

/**
 * Show error message below an input field
 * @param {HTMLElement} input - The input element
 * @param {string} message - Error message to display
 */
function showError(input, message) {
  // Remove any existing error
  clearError(input);

  // Create error element
  const errorElement = document.createElement("div");
  errorElement.className = "validation-error";
  errorElement.textContent = message;
  errorElement.style.color = "#ff3860";
  errorElement.style.fontSize = "12px";
  errorElement.style.marginTop = "5px";

  // Insert after input or its parent for radio buttons
  if (input.type === "radio") {
    const radioGroup = input.closest(".radio-group");
    if (radioGroup && !radioGroup.querySelector(".validation-error")) {
      radioGroup.appendChild(errorElement);
    }
  } else {
    input.parentNode.appendChild(errorElement);
  }

  // Add error class to input
  input.classList.add("input-error");
  input.style.borderColor = "#ff3860";
}

/**
 * Clear error message
 * @param {HTMLElement} input - The input element
 */
function clearError(input) {
  if (input.type === "radio") {
    const radioGroup = input.closest(".radio-group");
    if (radioGroup) {
      const error = radioGroup.querySelector(".validation-error");
      if (error) error.remove();
    }
  } else {
    const error = input.parentNode.querySelector(".validation-error");
    if (error) error.remove();
  }

  input.classList.remove("input-error");
  input.style.borderColor = "";
}

/**
 * Validate a single input field and show/clear error message
 * @param {HTMLElement} input - The input element to validate
 * @returns {boolean} - True if valid, false otherwise
 */
function validateInput(input) {
  // Skip disabled inputs
  if (input.disabled) return true;

  // Get input value
  const value = input.value.trim();

  // Check if required field is empty
  if (input.required && value === "") {
    // Only show error if the field has been touched or is being submitted
    if (
      input.dataset.touched === "true" ||
      input.form.dataset.submitting === "true"
    ) {
      showError(input, ErrorMessages.required);
    }
    return false;
  }

  // Validate based on input type and name
  let isValid = true;

  switch (input.name) {
    case "zip":
      if (value && !Validators.zipCode(value)) {
        if (
          input.dataset.touched === "true" ||
          input.form.dataset.submitting === "true"
        ) {
          showError(input, ErrorMessages.zipCode);
        }
        isValid = false;
      }
      break;

    case "mileage":
      if (value && !Validators.mileage(value)) {
        if (
          input.dataset.touched === "true" ||
          input.form.dataset.submitting === "true"
        ) {
          showError(input, ErrorMessages.mileage);
        }
        isValid = false;
      }
      break;

    case "email":
      if (value && !Validators.email(value)) {
        if (
          input.dataset.touched === "true" ||
          input.form.dataset.submitting === "true"
        ) {
          showError(input, ErrorMessages.email);
        }
        isValid = false;
      }
      break;

    case "phone":
      if (value && !Validators.phone(value)) {
        if (
          input.dataset.touched === "true" ||
          input.form.dataset.submitting === "true"
        ) {
          showError(input, ErrorMessages.phone);
        }
        isValid = false;
      }
      break;

    case "firstName":
    case "lastName":
      if (value && !Validators.name(value)) {
        if (
          input.dataset.touched === "true" ||
          input.form.dataset.submitting === "true"
        ) {
          showError(input, ErrorMessages.name);
        }
        isValid = false;
      }
      break;

    case "vin":
      if (value && !Validators.vin(value)) {
        if (
          input.dataset.touched === "true" ||
          input.form.dataset.submitting === "true"
        ) {
          showError(input, ErrorMessages.vin);
        }
        isValid = false;
      }
      break;

    case "licensePlate":
      if (value && !Validators.licensePlate(value)) {
        if (
          input.dataset.touched === "true" ||
          input.form.dataset.submitting === "true"
        ) {
          showError(input, ErrorMessages.licensePlate);
        }
        isValid = false;
      }
      break;

    case "state":
      if (input.required && value === "") {
        if (
          input.dataset.touched === "true" ||
          input.form.dataset.submitting === "true"
        ) {
          showError(input, ErrorMessages.state);
        }
        isValid = false;
      }
      break;
  }

  // If valid, clear any existing error
  if (isValid) {
    clearError(input);
  }

  return isValid;
}

/**
 * Validate radio button group
 * @param {HTMLElement} radioGroup - The container with radio buttons
 * @returns {boolean} - True if any radio is checked, false otherwise
 */
function validateRadioGroup(radioGroup) {
  const radios = radioGroup.querySelectorAll('input[type="radio"]');
  const groupName = radios.length > 0 ? radios[0].name : "";

  // Skip validation if no radio buttons in group
  if (radios.length === 0) return true;

  // Check if any radio button is selected
  const isChecked = Array.from(radios).some((radio) => radio.checked);

  if (!isChecked) {
    // Show error on the first radio
    showError(radios[0], ErrorMessages.radioGroup);
    return false;
  } else {
    // Clear error
    clearError(radios[0]);
    return true;
  }
}

/**
 * Validate a tab or section of the form
 * @param {HTMLElement} tabElement - The tab/section element
 * @returns {boolean} - True if all fields in the tab are valid
 */
function validateTab(tabElement) {
  let isValid = true;

  // Validate all input fields and selects
  const inputs = tabElement.querySelectorAll(
    'input:not([type="radio"]), select'
  );
  inputs.forEach((input) => {
    if (input.required || input.value.trim() !== "") {
      const inputValid = validateInput(input);
      isValid = isValid && inputValid;
    }
  });

  // Validate all radio groups
  const radioGroups = tabElement.querySelectorAll(".radio-group");
  radioGroups.forEach((group) => {
    // Only validate if the group contains required radios
    const hasRequiredRadios =
      group.querySelectorAll("input[required]").length > 0;
    if (hasRequiredRadios) {
      const groupValid = validateRadioGroup(group);
      isValid = isValid && groupValid;
    }
  });

  // Log validation result for debugging
  console.log(`Tab ${tabElement.id} validation: ${isValid}`);

  return isValid;
}

/**
 * Setup validation listeners for all inputs in a container
 * @param {HTMLElement} container - The container element with inputs
 * @param {function} [callback] - Optional callback after validation
 */
function setupValidationListeners(container, callback) {
  // Add validation on input for text fields, selects, etc.
  const inputs = container.querySelectorAll(
    'input:not([type="radio"]), select'
  );
  inputs.forEach((input) => {
    // Add blur event to mark field as touched
    input.addEventListener("blur", () => {
      input.dataset.touched = "true";
      validateInput(input);
      if (typeof callback === "function") callback();
    });

    input.addEventListener("input", () => {
      validateInput(input);
      if (typeof callback === "function") callback();
    });
  });

  // Add validation for radio buttons
  const radios = container.querySelectorAll('input[type="radio"]');
  radios.forEach((radio) => {
    radio.addEventListener("change", () => {
      // Find the radio group
      const radioGroup = radio.closest(".radio-group");
      if (radioGroup) {
        validateRadioGroup(radioGroup);
        if (typeof callback === "function") callback();
      }
    });
  });
}

/**
 * Update navigation buttons based on current tab validation
 * @param {HTMLElement} tabElement - Current tab element
 * @param {HTMLElement} nextBtn - Next button element
 */
function updateNavigationButton(tabElement, nextBtn) {
  if (nextBtn) {
    const isValid = validateTab(tabElement);
    console.log(`Setting nextBtn disabled: ${!isValid}`);
    nextBtn.disabled = !isValid;

    // Add visual indication
    if (isValid) {
      nextBtn.style.opacity = "1";
      nextBtn.style.cursor = "pointer";
    } else {
      nextBtn.style.opacity = "0.7";
      nextBtn.style.cursor = "not-allowed";
    }
  }
}

/**
 * Force validation of a form tab and show all error messages
 * @param {HTMLElement} tabElement - The tab element to validate
 * @returns {boolean} - True if all fields are valid
 */
function forceValidateTab(tabElement) {
  // Mark form as submitting to show all errors
  const form = tabElement.closest("form");
  if (form) {
    form.dataset.submitting = "true";
  }

  // First validate all non-radio inputs
  const inputs = tabElement.querySelectorAll(
    'input:not([type="radio"]), select'
  );
  let isValid = true;

  inputs.forEach((input) => {
    if (input.required) {
      const inputValid = validateInput(input);
      isValid = isValid && inputValid;
    }
  });

  // Then validate all radio groups
  const radioGroups = tabElement.querySelectorAll(".radio-group");
  radioGroups.forEach((group) => {
    const hasRequiredRadios =
      group.querySelectorAll("input[required]").length > 0;
    if (hasRequiredRadios) {
      const groupValid = validateRadioGroup(group);
      isValid = isValid && groupValid;
    }
  });

  // Reset submitting flag
  if (form) {
    form.dataset.submitting = "false";
  }

  return isValid;
}

// Export functions
window.FormValidation = {
  Validators,
  ErrorMessages,
  validateInput,
  validateRadioGroup,
  validateTab,
  forceValidateTab,
  setupValidationListeners,
  updateNavigationButton,
  showError,
  clearError,
};
