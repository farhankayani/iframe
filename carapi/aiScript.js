const BASE_URL = "https://triumphant-happiness-production-8aa3.up.railway.app";
//"https://dealeriqai-iframe-api.up.railway.app"
const NEW_API_BASE_URL = "https://lionfish-app-dykha.ondigitalocean.app/api";

// Add this function to your script.js
function getSourceFromUrl(url) {
  try {
    console.log("URL:", url);

    // Extract domain and path from URL
    const urlObj = new URL(url);

    // Check for Google Ads campaign ID in URL parameters
    const searchParams = new URLSearchParams(urlObj.search);
    const campaignId = searchParams.get("GA_campaign");

    if (campaignId) {
      console.log("Google Ads Campaign ID:", campaignId);
      // Return an object with source and subLeadSource for Google Ads campaigns
      return {
        source: "Google Ads",
        subLeadSource: campaignId,
      };
    }

    // If no campaign ID, fall back to path parts
    const pathParts = urlObj.pathname
      .split("/")
      .filter((part) => part.length > 0);

    // If there's a path part after the domain, use the first non-empty part
    if (pathParts.length > 0) {
      console.log("source from path:", pathParts[0]);
      return {
        source: pathParts[0],
      };
    }

    // If no path parts, return the hostname
    return {
      source: urlObj.hostname,
    };
  } catch (error) {
    console.error("Error parsing URL:", error);
    return {
      source: "thecartrackers.com",
    };
  }
}

// Add this function to your script.js
function updateSubmitButton() {
  const activeTab = document.querySelector(".tab-content.active").id;
  const submitButton = document.querySelector(
    `#${activeTab} button[type="submit"]`
  );

  if (submitButton) {
    submitButton.disabled = !formValidationStates[activeTab];
  }
}

function getIframeSource() {
  const urlParams = new URLSearchParams(window.location.search);
  const parentUrl = urlParams.get("parent_url");

  if (parentUrl) {
    return getSourceFromUrl(parentUrl);
  }

  return {
    source: "thecartrackers.com",
  };
}

// Add logging for parent_url parameter
console.log("window.location.href", window.location.href);
console.log("window.location.search", window.location.search);

const urlParams = new URLSearchParams(window.location.search);
const parentUrl = urlParams.get("parent_url");
console.log("parent_url parameter:", parentUrl);

// Form elements
const form = document.getElementById("carForm");
const extendedFormContainer = document.getElementById("extendedFormContainer");
const extendedForm = document.getElementById("extendedForm");
const tabBtns = document.querySelectorAll(".tab-btn");
const tabContents = document.querySelectorAll(".tab-content");
const resultDiv = document.getElementById("result");
const loader = document.getElementById("loader");

// Form input
const yearSelect = document.getElementById("year");
const makeSelect = document.getElementById("make");
const modelSelect = document.getElementById("model");
const trimSelect = document.getElementById("trim");
const vinInput = document.getElementById("vinNumber");
const licensePlateInput = document.getElementById("licensePlate");
const stateInput = document.getElementById("state");

let initialFormData = {};

// Form validation states
let formValidationStates = {
  "make-model": false,
  vin: false,
  "license-plate": false,
};

// Helper function to show/hide loader
const toggleLoader = (show) => {
  loader.style.display = show ? "block" : "none";
};

// Helper function for smooth transitions
const transition = (element, type) => {
  element.classList.add(type === "out" ? "fade-out" : "fade-in");
  setTimeout(() => {
    element.style.display = type === "out" ? "none" : "block";
    element.classList.remove(type === "out" ? "fade-out" : "fade-in");
  }, 300);
};

// Function to update iframe height
function updateIframeHeight() {
  if (window.self !== window.top) {
    window.parent.postMessage(
      {
        type: "formHeight",
        height: document.body.scrollHeight,
      },
      "*"
    );
  }
}

// Add resize listeners
window.addEventListener("load", updateIframeHeight);
window.addEventListener("resize", updateIframeHeight);

// Populate year dropdown
async function populateYears() {
  try {
    toggleLoader(true);
    for (let year = 2025; year >= 1990; year--) {
      const option = document.createElement("option");
      option.value = year;
      option.textContent = year;
      yearSelect.appendChild(option);
    }
    toggleLoader(false);
  } catch (error) {
    console.error("Error populating years:", error);
    toggleLoader(false);
  }
}

// Populate make dropdown based on selected year
yearSelect.addEventListener("change", async () => {
  makeSelect.innerHTML = '<option value="">Select Make</option>';
  modelSelect.innerHTML = '<option value="">Select Model</option>';
  trimSelect.innerHTML = '<option value="">Select Trim</option>';

  const year = yearSelect.value;
  if (year) {
    try {
      toggleLoader(true);
      const response = await fetch(`${NEW_API_BASE_URL}/getMakes/${year}`);
      const makes = await response.json();
      makes.forEach((make) => {
        const option = document.createElement("option");
        option.value = make.make;
        option.textContent = make.make;
        makeSelect.appendChild(option);
      });
      toggleLoader(false);
    } catch (error) {
      console.error("Error fetching makes:", error);
      toggleLoader(false);
    }
  }
  validateForm();
});

// Populate model dropdown based on selected make and year
makeSelect.addEventListener("change", async () => {
  modelSelect.innerHTML = '<option value="">Select Model</option>';
  trimSelect.innerHTML = '<option value="">Select Trim</option>';

  const year = yearSelect.value;
  const make = makeSelect.value;
  if (year && make) {
    try {
      toggleLoader(true);
      const response = await fetch(
        `${NEW_API_BASE_URL}/getModels/${year}/${make}`
      );
      const models = await response.json();
      models.forEach((model) => {
        const option = document.createElement("option");
        option.value = model.model;
        option.textContent = model.model;
        modelSelect.appendChild(option);
      });
      toggleLoader(false);
    } catch (error) {
      console.error("Error fetching models:", error);
      toggleLoader(false);
    }
  }
  validateForm();
});

// Populate trim dropdown based on selected model, make, and year
modelSelect.addEventListener("change", async () => {
  trimSelect.innerHTML = '<option value="">Select Trim</option>';

  const year = yearSelect.value;
  const make = makeSelect.value;
  const model = modelSelect.value;
  if (year && make && model) {
    try {
      toggleLoader(true);
      const response = await fetch(
        `${NEW_API_BASE_URL}/getTrims/${year}/${make}/${model}`
      );
      const trims = await response.json();
      const filteredTrims = new Set();
      trims.forEach((trim) => {
        const option = document.createElement("option");
        option.value = trim.trim;
        option.textContent = trim.trim;
        if (!filteredTrims.has(trim.trim)) {
          filteredTrims.add(trim.trim);
          trimSelect.appendChild(option);
        }
      });
      toggleLoader(false);
    } catch (error) {
      console.error("Error fetching trims:", error);
      toggleLoader(false);
    }
  }
  validateForm();
});

// Tab functionality with validation
tabBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    const targetTab = btn.dataset.tab;

    tabBtns.forEach((b) => b.classList.remove("active"));
    tabContents.forEach((c) => c.classList.remove("active"));

    btn.classList.add("active");
    document.getElementById(targetTab).classList.add("active");

    // Update required fields
    tabContents.forEach((content) => {
      const inputs = content.querySelectorAll("input, select");
      inputs.forEach((input) => {
        input.required = content.classList.contains("active");
      });
    });

    updateSubmitButton();
    setTimeout(updateIframeHeight, 100);
  });
});

// Form validation functions
const validateMakeModel = () => {
  return (
    yearSelect.value &&
    makeSelect.value &&
    modelSelect.value &&
    trimSelect.value
  );
};

const validateForm = () => {
  const activeTab = document.querySelector(".tab-content.active").id;
  const tabElement = document.getElementById(activeTab);

  // Use FormValidation library to validate the tab
  formValidationStates[activeTab] = FormValidation.validateTab(tabElement);

  updateSubmitButton();
};

// Helper function to format phone number
const formatPhoneNumber = (phone) => {
  // Remove all non-digit characters
  const cleaned = ("" + phone).replace(/\D/g, "");

  // Limit to 10 digits
  const truncated = cleaned.slice(0, 10);

  // Format based on length
  if (truncated.length === 0) return "";
  if (truncated.length < 3) return truncated;
  if (truncated.length < 6)
    return `(${truncated.slice(0, 3)}) ${truncated.slice(3)}`;

  // Format as (XXX) XXX-XXXX
  return `(${truncated.slice(0, 3)}) ${truncated.slice(3, 6)}-${truncated.slice(
    6
  )}`;
};

// Add phone number formatting and validation
const phoneInput = document.getElementById("phone");
if (phoneInput) {
  phoneInput.addEventListener("input", (e) => {
    const originalValue = e.target.value;
    const cursorPosition = e.target.selectionStart;

    e.target.value = formatPhoneNumber(originalValue);

    // Preserve cursor position
    const newLength = e.target.value.length;
    const diff = newLength - originalValue.length;
    e.target.setSelectionRange(cursorPosition + diff, cursorPosition + diff);

    // Validate the phone field
    FormValidation.validateInput(e.target);
  });
}

// Extended form navigation
const initializeExtendedForm = () => {
  const tabs = document.querySelectorAll("#extendedForm .tab-content");
  const bubbles = document.querySelectorAll(".bubble");
  const nextBtn = document.getElementById("nextBtn");
  const prevBtn = document.getElementById("prevBtn");
  let currentTab = 0;

  const showTab = (n) => {
    tabs.forEach((tab, index) => {
      tab.style.display = index === n ? "block" : "none";
      tab.classList.toggle("active", index === n);
    });

    bubbles.forEach((bubble, index) => {
      bubble.classList.toggle("active", index <= n);
    });

    // Update next button state based on tab validation
    const currentTabElement = tabs[n];
    console.log(`Current tab: ${currentTabElement.id}`);

    // Initial validation - check tab content based on tab ID
    let isValid = false;

    if (currentTabElement.id === "vehicle-info") {
      isValid = validateFirstTab();
    } else if (currentTabElement.id === "vehicle-condition") {
      isValid = validateConditionTab();
    } else if (currentTabElement.id === "contact-info") {
      isValid = validateContactTab();
    } else {
      isValid = FormValidation.validateTab(currentTabElement);
    }

    console.log(`Tab validation result: ${isValid}`);

    // Update button state
    nextBtn.disabled = !isValid;

    // Show/hide prev button based on tab index
    prevBtn.style.display = n === 0 ? "none" : "block";

    // Update button text for last tab
    nextBtn.textContent = n === tabs.length - 1 ? "Get My Offer" : "Next";
    // Change button ID on last tab
    nextBtn.id = n === tabs.length - 1 ? "submitbtn" : "nextBtn";

    setTimeout(updateIframeHeight, 100);
  };

  // Add special handling for mileage, zip, and title fields
  const setupFirstTabValidation = () => {
    const mileageInput = document.getElementById("mileage");
    const zipInput = document.getElementById("zip");
    const titleRadios = document.querySelectorAll('input[name="title"]');

    if (mileageInput) {
      mileageInput.addEventListener("input", () => {
        validateFirstTab();
      });

      mileageInput.addEventListener("blur", () => {
        FormValidation.validateInput(mileageInput);
        validateFirstTab();
      });
    }

    if (zipInput) {
      zipInput.addEventListener("input", () => {
        validateFirstTab();
      });

      zipInput.addEventListener("blur", () => {
        FormValidation.validateInput(zipInput);
        validateFirstTab();
      });
    }

    titleRadios.forEach((radio) => {
      radio.addEventListener("change", () => {
        console.log(`Title radio changed: ${radio.value}`);
        validateFirstTab();
      });
    });
  };

  // Validate the first tab specifically (Vehicle Info)
  const validateFirstTab = () => {
    const vehicleInfoTab = document.getElementById("vehicle-info");
    const mileageInput = document.getElementById("mileage");
    const zipInput = document.getElementById("zip");
    const titleRadioChecked = document.querySelector(
      'input[name="title"]:checked'
    );

    // Check individual fields
    const mileageValid =
      mileageInput.value &&
      FormValidation.Validators.mileage(mileageInput.value);
    const zipValid =
      zipInput.value && FormValidation.Validators.zipCode(zipInput.value);
    const titleValid = titleRadioChecked !== null;

    console.log(
      `Mileage valid: ${mileageValid}, Zip valid: ${zipValid}, Title valid: ${titleValid}`
    );

    // All fields must be valid
    const isValid = mileageValid && zipValid && titleValid;

    // Update button state
    nextBtn.disabled = !isValid;
    console.log(`Next button disabled: ${!isValid}`);

    return isValid;
  };

  // Validate the condition tab (second tab)
  const validateConditionTab = () => {
    const conditionTab = document.getElementById("vehicle-condition");

    // Check if each radio group has a selection
    const accidentSelected =
      document.querySelector('input[name="accident"]:checked') !== null;
    const drivableSelected =
      document.querySelector('input[name="drivable"]:checked') !== null;
    const repaintedSelected =
      document.querySelector('input[name="repainted"]:checked') !== null;

    console.log(
      `Accident selected: ${accidentSelected}, Drivable selected: ${drivableSelected}, Repainted selected: ${repaintedSelected}`
    );

    // All radio groups must have a selection
    const isValid = accidentSelected && drivableSelected && repaintedSelected;

    // Update button state
    nextBtn.disabled = !isValid;
    console.log(
      `Condition tab valid: ${isValid}, Next button disabled: ${!isValid}`
    );

    return isValid;
  };

  // Validate the contact tab (third tab)
  const validateContactTab = () => {
    const contactTab = document.getElementById("contact-info");

    // Get all the required fields in the contact tab
    const firstName = document.getElementById("firstName");
    const lastName = document.getElementById("lastName");
    const phone = document.getElementById("phone");
    const email = document.getElementById("email");

    // Validate each field
    const firstNameValid = firstName.value.trim() !== "";
    const lastNameValid = lastName.value.trim() !== "";

    // For phone, use the validator
    const phoneValid =
      phone.value.trim() !== "" && FormValidation.Validators.phone(phone.value);

    // For email, use the validator
    const emailValid =
      email.value.trim() !== "" && FormValidation.Validators.email(email.value);

    console.log(
      `FirstName valid: ${firstNameValid}, LastName valid: ${lastNameValid}, ` +
        `Phone valid: ${phoneValid}, Email valid: ${emailValid}`
    );

    // All fields must be valid
    const isValid = firstNameValid && lastNameValid && phoneValid && emailValid;

    // Update button state
    nextBtn.disabled = !isValid;
    console.log(
      `Contact tab valid: ${isValid}, Submit button disabled: ${!isValid}`
    );

    return isValid;
  };

  // Add special handling for the vehicle condition tab
  const setupConditionTabValidation = () => {
    const accidentRadios = document.querySelectorAll('input[name="accident"]');
    const drivableRadios = document.querySelectorAll('input[name="drivable"]');
    const repaintedRadios = document.querySelectorAll(
      'input[name="repainted"]'
    );

    // Add change event listeners to all radio buttons
    [...accidentRadios, ...drivableRadios, ...repaintedRadios].forEach(
      (radio) => {
        radio.addEventListener("change", () => {
          console.log(
            `Condition radio changed: ${radio.name} = ${radio.value}`
          );
          validateConditionTab();
        });
      }
    );
  };

  // Setup validation for the contact tab
  const setupContactTabValidation = () => {
    const firstName = document.getElementById("firstName");
    const lastName = document.getElementById("lastName");
    const phone = document.getElementById("phone");
    const email = document.getElementById("email");

    // Add validation to all inputs
    [firstName, lastName, phone, email].forEach((input) => {
      if (input) {
        input.addEventListener("input", () => {
          validateContactTab();
        });

        input.addEventListener("blur", () => {
          input.dataset.touched = "true";
          FormValidation.validateInput(input);
          validateContactTab();
        });
      }
    });
  };

  // Setup validation for all tabs with improved logging
  tabs.forEach((tab, index) => {
    FormValidation.setupValidationListeners(tab, () => {
      if (tab.classList.contains("active")) {
        if (tab.id === "vehicle-info") {
          validateFirstTab();
        } else if (tab.id === "vehicle-condition") {
          validateConditionTab();
        } else if (tab.id === "contact-info") {
          validateContactTab();
        } else {
          FormValidation.updateNavigationButton(tab, nextBtn);
        }
      }
    });
  });

  nextBtn.addEventListener("click", async () => {
    const currentTabElement = tabs[currentTab];

    let isValid = false;

    // Use specific validation based on tab ID
    if (currentTabElement.id === "vehicle-info") {
      isValid = validateFirstTab();
    } else if (currentTabElement.id === "vehicle-condition") {
      isValid = validateConditionTab();
    } else if (currentTabElement.id === "contact-info") {
      isValid = validateContactTab();
    } else {
      isValid = FormValidation.validateTab(currentTabElement);
    }

    console.log(`Tab ${currentTabElement.id} valid: ${isValid}`);

    // Validate current tab before proceeding
    if (isValid) {
      if (currentTab < tabs.length - 1) {
        // Go to next tab
        currentTab++;
        showTab(currentTab);
      } else {
        // On last tab, handle form submission
        prevBtn.style.display = "none";
        nextBtn.textContent = "Loading...";
        nextBtn.disabled = true;
        const sourceInfo = await getIframeSource();

        // Get all form data
        const extendedFormData = new FormData(extendedForm);
        const formDataEntries = Object.fromEntries(extendedFormData);

        const completeFormData = {
          ...initialFormData,
          ...formDataEntries,
          source: "Ai call",
          subLeadSource: sourceInfo.subLeadSource || "",
        };
        console.log("Complete Form Data:", completeFormData);

        // Submit complete form data
        fetch(`${BASE_URL}/api/submit-form`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(completeFormData),
        })
          .then((response) => response.json())
          .then((data) => {
            console.log("Form submission response:", data);
            // Update the current tab URL
            window.top.location.href =
              "https://thecartrackers.com/thank-you-new/";
          })
          .catch((error) => {
            console.error("Error submitting form:", error);
            alert("Error submitting form. Please try again.");
            nextBtn.textContent = "Get My Offer";
            nextBtn.disabled = false;
          });
      }
    } else {
      // Force validation UI feedback if validation fails
      if (currentTabElement.id === "vehicle-info") {
        // Explicitly validate each field in the first tab
        const mileageInput = document.getElementById("mileage");
        const zipInput = document.getElementById("zip");
        const titleRadioGroup = document.querySelector(".radio-group");

        if (mileageInput && !mileageInput.value) {
          FormValidation.showError(
            mileageInput,
            FormValidation.ErrorMessages.required
          );
        }

        if (zipInput && !zipInput.value) {
          FormValidation.showError(
            zipInput,
            FormValidation.ErrorMessages.required
          );
        }

        if (
          titleRadioGroup &&
          !document.querySelector('input[name="title"]:checked')
        ) {
          const firstTitleRadio = titleRadioGroup.querySelector(
            'input[type="radio"]'
          );
          if (firstTitleRadio) {
            FormValidation.showError(
              firstTitleRadio,
              FormValidation.ErrorMessages.radioGroup
            );
          }
        }
      } else if (currentTabElement.id === "vehicle-condition") {
        // Explicitly validate each radio group in the condition tab
        const radioGroups = currentTabElement.querySelectorAll(".radio-group");

        radioGroups.forEach((group) => {
          const radios = group.querySelectorAll('input[type="radio"]');
          if (radios.length > 0) {
            const groupName = radios[0].name;
            const isChecked =
              document.querySelector(`input[name="${groupName}"]:checked`) !==
              null;

            if (!isChecked && radios[0]) {
              FormValidation.showError(
                radios[0],
                FormValidation.ErrorMessages.radioGroup
              );
            }
          }
        });
      } else if (currentTabElement.id === "contact-info") {
        // Explicitly validate each field in the contact tab
        const firstName = document.getElementById("firstName");
        const lastName = document.getElementById("lastName");
        const phone = document.getElementById("phone");
        const email = document.getElementById("email");

        // Show errors for empty or invalid fields
        if (firstName && !firstName.value.trim()) {
          FormValidation.showError(
            firstName,
            FormValidation.ErrorMessages.required
          );
        }

        if (lastName && !lastName.value.trim()) {
          FormValidation.showError(
            lastName,
            FormValidation.ErrorMessages.required
          );
        }

        if (phone) {
          if (!phone.value.trim()) {
            FormValidation.showError(
              phone,
              FormValidation.ErrorMessages.required
            );
          } else if (!FormValidation.Validators.phone(phone.value)) {
            FormValidation.showError(phone, FormValidation.ErrorMessages.phone);
          }
        }

        if (email) {
          if (!email.value.trim()) {
            FormValidation.showError(
              email,
              FormValidation.ErrorMessages.required
            );
          } else if (!FormValidation.Validators.email(email.value)) {
            FormValidation.showError(email, FormValidation.ErrorMessages.email);
          }
        }
      } else {
        // Use the standard validation for other tabs
        FormValidation.forceValidateTab(currentTabElement);
      }
    }
  });

  prevBtn.addEventListener("click", () => {
    if (currentTab > 0) {
      currentTab--;
      showTab(currentTab);
    } else {
      transition(extendedFormContainer, "out");
      setTimeout(() => {
        transition(form, "in");
      }, 300);
    }
  });

  // Initialize the first tab
  showTab(currentTab);
  setupFirstTabValidation();
  setupConditionTabValidation();
  setupContactTabValidation();
};

// Set up validations for the initial form
function setupInitialFormValidations() {
  // Apply validation to all tabs
  tabContents.forEach((tabContent) => {
    FormValidation.setupValidationListeners(tabContent, validateForm);
  });
}

// Form submission handler
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  // Validate the active tab before submission
  const activeTab = document.querySelector(".tab-content.active").id;
  const tabElement = document.getElementById(activeTab);

  if (!FormValidation.validateTab(tabElement)) {
    // Form validation failed - display error messages
    return;
  }

  toggleLoader(true);
  resultDiv.innerHTML = "";

  let endpoint, params;

  try {
    switch (activeTab) {
      case "make-model":
        endpoint = "/trims";
        params = `year=${yearSelect.value}&make=${makeSelect.value}&model=${modelSelect.value}&trim=${trimSelect.value}`;
        // Store the initial form data
        initialFormData = {
          year: yearSelect.value,
          make: makeSelect.options[makeSelect.selectedIndex].text,
          model: modelSelect.options[modelSelect.selectedIndex].text,
          trim: trimSelect.options[trimSelect.selectedIndex].text,
          vin: "",
        };
        break;
      case "vin":
        endpoint = `/vin/${vinInput.value}`;
        params = "";
        break;
      case "license-plate":
        endpoint = `/license-plate?country_code=US&region=${stateInput.value}&lookup=${licensePlateInput.value}`;
        params = "";
        break;
    }
    let data;
    if (activeTab === "make-model") {
      const year = yearSelect.value;
      const make = makeSelect.value;
      const model = modelSelect.value;
      const trim = trimSelect.value;
      data = { year, make, model, trim };
      console.log("Complete Form Submission:", data);
    } else {
      const response = await fetch(
        `${BASE_URL}${endpoint}${params ? `?${params}` : ""}`
      );

      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 400) {
          resultDiv.innerHTML = `Invalid input: ${errorData.message}`;
        } else {
          resultDiv.innerHTML = "An error occurred. Please try again.";
        }
        toggleLoader(false);
        return;
      }

      data = await response.json();
      console.log("Car Information received:", data);
    }
    // Map VIN response to form data
    if (activeTab === "vin") {
      if (data.exception) {
        resultDiv.innerHTML = `Invalid input: ${data.message}`;
        toggleLoader(false);
        return;
      }
      initialFormData = {
        year: data.year,
        make: data.make,
        model: data.model,
        trim: data.trim,
        vin: vinInput.value,
      };
    }

    // Map license plate response to form data
    if (activeTab === "license-plate") {
      if (data.exception) {
        resultDiv.innerHTML = `Invalid input: ${data.message}`;
        toggleLoader(false);
        return;
      }
      initialFormData = {
        year: data.year,
        make: data.make,
        model: data.model,
        trim: data.trim,
        vin: data.vin,
        licensePlate: licensePlateInput.value,
        state: stateInput.value,
      };
    }

    // Get form containers by ID
    const initialFormContainer = document.getElementById(
      "initialFormContainer"
    );
    const extendedFormContainer = document.getElementById(
      "extendedFormContainer"
    );

    if (initialFormContainer) {
      initialFormContainer.style.display = "none";
    }

    if (extendedFormContainer) {
      extendedFormContainer.style.display = "block";
    }
    toggleLoader(false);
    setTimeout(updateIframeHeight, 100);
  } catch (error) {
    console.error("Error:", error);
    resultDiv.innerHTML = "An error occurred. Please try again.";
    toggleLoader(false);
  }
});

// Function to clear browser cache
function clearBrowserCache() {
  if ("caches" in window) {
    caches.keys().then((names) => {
      names.forEach((name) => {
        caches.delete(name);
      });
    });
  }
  localStorage.clear();
  sessionStorage.clear();
}

// Initialize everything
document.addEventListener("DOMContentLoaded", async () => {
  clearBrowserCache();
  populateYears();
  document.querySelector(".tab-btn.active").click();
  setupInitialFormValidations();
  initializeExtendedForm();
  validateForm();

  // Set source asynchronously
  const source = await getIframeSource();
  document.getElementById("source").value = source.source;
  document.getElementById("sourceExtended").value = source.source;

  // Set subLeadSource if it exists
  if (source.subLeadSource) {
    if (document.getElementById("subLeadSource")) {
      document.getElementById("subLeadSource").value = source.subLeadSource;
    }
    if (document.getElementById("subLeadSourceExtended")) {
      document.getElementById("subLeadSourceExtended").value =
        source.subLeadSource;
    }
  }
});
