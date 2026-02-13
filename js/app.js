function getSelectedOptions(select) {
  return Array.from(select.selectedOptions).map((o) => o.value);
}

function serviceHealthQuote(val) {
  return "'" + val.replace(/'/g, "\\'") + "'";
}

function makeShortName(name) {
  if (!name) return "ag";
  let s =
    name && name.normalize
      ? name.normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
      : name;
  s = String(s)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
  if (!s) return "ag";
  if (/^[0-9]/.test(s)) s = "ag" + s;
  return s.slice(0, 12) || "ag";
}

function jsObjToBicep(obj, indent = "    ", compactThreshold = 2) {
  const isSimple = (v) =>
    typeof v === "string" ||
    typeof v === "number" ||
    typeof v === "boolean";
  if (Array.isArray(obj)) {
    if (obj.length === 0) return "[]";
    if (obj.length <= compactThreshold && obj.every(isSimple))
      return (
        "[ " +
        obj.map((i) => jsObjToBicep(i, "", compactThreshold)).join(" ") +
        " ]"
      );
    return (
      "[\n" +
      obj
        .map(
          (item) =>
            indent + jsObjToBicep(item, indent + "  ", compactThreshold)
        )
        .join("\n") +
      "\n" +
      indent.slice(0, Math.max(0, indent.length - 0)) +
      "]"
    );
  }
  if (typeof obj === "object" && obj !== null) {
    const entries = Object.entries(obj);
    if (entries.length === 0) return "{}";
    const quoteKey = (k) => {
      if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(k)) return k;
      return "'" + String(k).replace(/'/g, "\\'") + "'";
    };
    if (entries.length === 1 && isSimple(entries[0][1]))
      return `{ ${quoteKey(entries[0][0])}: ${jsObjToBicep(
        entries[0][1],
        "",
        compactThreshold
      )} }`;
    return (
      "{\n" +
      entries
        .map(
          ([k, v]) =>
            indent +
            quoteKey(k) +
            ": " +
            jsObjToBicep(v, indent + "  ", compactThreshold)
        )
        .join("\n") +
      "\n" +
      indent.slice(0, Math.max(0, indent.length - 0)) +
      "}"
    );
  }
  return typeof obj === "string" ? obj : String(obj);
}

function ensurePermissionsActions(obj) {
  if (Array.isArray(obj)) {
    obj.forEach(ensurePermissionsActions);
    return;
  }
  if (obj && typeof obj === "object") {
    if (Array.isArray(obj.permissions)) {
      obj.permissions = obj.permissions.map((p) => {
        if (p && typeof p === "object") {
          if (!("actions" in p)) p.actions = [];
          if (!("notActions" in p)) p.notActions = [];
          if (!("dataActions" in p)) p.dataActions = [];
          if (!("notDataActions" in p)) p.notDataActions = [];
        }
        return p;
      });
    }
    Object.values(obj).forEach(ensurePermissionsActions);
  }
}

function buildConditions(services, eventTypes, regions) {
  const conditions = [
    {
      field: serviceHealthQuote("category"),
      equals: serviceHealthQuote("ServiceHealth"),
    },
  ];
  if (Array.isArray(services) && services.length > 1) {
    conditions.push({
      anyOf: services.map((svc) => ({
        field: serviceHealthQuote(
          "properties.impactedServices[*].ServiceName"
        ),
        equals: serviceHealthQuote(svc),
      })),
    });
  } else if (Array.isArray(services) && services.length === 1) {
    conditions.push({
      field: serviceHealthQuote(
        "properties.impactedServices[*].ServiceName"
      ),
      equals: serviceHealthQuote(services[0]),
    });
  }
  if (Array.isArray(eventTypes) && eventTypes.length > 0) {
    conditions.push({
      anyOf: eventTypes.map((et) => ({
        field: serviceHealthQuote("properties.incidentType"),
        equals: serviceHealthQuote(et),
      })),
    });
  }
  if (regions && regions.length > 0) {
    conditions.push({
      anyOf: regions.map((r) => ({
        field: serviceHealthQuote(
          "properties.impactedServices[*].ImpactedRegions[*].RegionName"
        ),
        equals: serviceHealthQuote(r),
      })),
    });
  }
  return conditions;
}

function setActionInputsVisibility() {
  const checked = document.querySelector(
    'input[name="actionMode"]:checked'
  );
  const mode = checked ? checked.value : "existing";
  const existingDiv = document.getElementById("existingActionGroupInputs");
  const quickDiv = document.getElementById("quickActionInputs");
  if (existingDiv)
    existingDiv.classList.toggle("hidden", mode !== "existing");
  if (quickDiv) quickDiv.classList.toggle("hidden", mode !== "quick");
}

function sanitizeTagKey(k) {
  if (!k) return "";
  let s = String(k).trim();
  s = s.replace(/[^A-Za-z0-9_.-]/g, "-");
  if (/^[0-9]/.test(s)) s = "t-" + s;
  return s;
}

function addTagRow(key = "", value = "") {
  const container = document.getElementById("tagsContainer");
  if (!container) return;
  const row = document.createElement("div");
  row.style.display = "flex";
  row.style.gap = "8px";
  row.style.marginBottom = "8px";
  const keyInput = document.createElement("input");
  keyInput.type = "text";
  keyInput.placeholder = "key";
  keyInput.className = "tagKey";
  keyInput.value = key || "";
  const valInput = document.createElement("input");
  valInput.type = "text";
  valInput.placeholder = "value";
  valInput.className = "tagVal";
  valInput.value = value || "";
  row.appendChild(keyInput);
  row.appendChild(valInput);
  container.appendChild(row);
  return row;
}

function readTags() {
  const container = document.getElementById("tagsContainer");
  const tags = {};
  if (!container) return tags;
  const rows = Array.from(container.children);
  rows.forEach((row) => {
    const keyEl = row.querySelector(".tagKey");
    const valEl = row.querySelector(".tagVal");
    if (keyEl && valEl) {
      const rawKey = keyEl.value || "";
      const k = sanitizeTagKey(rawKey);
      if (!k) return;
      tags[k] = serviceHealthQuote(String(valEl.value || ""));
    }
  });
  return tags;
}

// Load all data from JSON files using the generic loader
async function loadAllSelectData() {
  await loadMultipleSelects([
    { selectId: 'service', jsonPath: 'data/services.json' },
    { selectId: 'eventType', jsonPath: 'data/eventTypes.json' },
    { selectId: 'region', jsonPath: 'data/regions.json' },
    { selectId: 'severity', jsonPath: 'data/severity.json' }
  ]);
}

// Initialize UI on page load
document.addEventListener("DOMContentLoaded", function () {
  // Setup dark mode toggle
  const darkModeToggle = document.getElementById("darkModeToggle");
  const isDarkMode = localStorage.getItem("darkMode") === "true";
  
  if (isDarkMode) {
    document.body.classList.add("dark-mode");
    darkModeToggle.textContent = "☀️";
  }
  
  darkModeToggle.addEventListener("click", function () {
    document.body.classList.toggle("dark-mode");
    const isNowDark = document.body.classList.contains("dark-mode");
    localStorage.setItem("darkMode", isNowDark);
    darkModeToggle.textContent = isNowDark ? "☀️" : "🌙";
  });

  // Load all select data dynamically
  loadAllSelectData();

  // Setup action mode toggle
  document
    .querySelectorAll('input[name="actionMode"]')
    .forEach((r) =>
      r.addEventListener("change", setActionInputsVisibility)
    );
  setActionInputsVisibility();

  // Ensure the 'Copied!' indicator is hidden on initial load
  const copiedMsgEl = document.getElementById("copiedMsg");
  if (copiedMsgEl) copiedMsgEl.style.display = "none";

  // Setup quick short name synchronization
  const nameInput = document.getElementById("quickActionGroupName");
  const shortInput = document.getElementById("quickShortName");
  if (nameInput && shortInput) {
    shortInput.value = makeShortName(nameInput.value || "");
    nameInput.addEventListener("input", function () {
      shortInput.value = makeShortName(this.value || "");
    });
    document.querySelectorAll('input[name="actionMode"]').forEach((r) =>
      r.addEventListener("change", function () {
        if (
          document.querySelector('input[name="actionMode"]:checked').value ===
          "quick"
        )
          shortInput.value = makeShortName(nameInput.value || "");
      })
    );
  }

  // Setup tag button
  const addTagBtn = document.getElementById("addTagBtn");
  if (addTagBtn) {
    addTagBtn.addEventListener("click", function () {
      addTagRow("", "");
    });
  }
  // Add initial empty tag row
  addTagRow("", "");

  // Setup form submission
  const form = document.getElementById("bicepForm");
  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      handleFormSubmit();
    });
  }

  // Setup copy button
  const copyBtn = document.getElementById("copyBtn");
  if (copyBtn) {
    copyBtn.addEventListener("click", function () {
      handleCopyClick();
    });
  }

  // Setup clear button
  const clearBtn = document.getElementById("clearBtn");
  if (clearBtn) {
    clearBtn.addEventListener("click", function (e) {
      e.preventDefault();
      handleClearForm();
    });
  }
});

function handleFormSubmit() {
  // Validate form before processing
  if (!validateForm()) {
    return;
  }

  const subscriptionId = document
    .getElementById("subscriptionId")
    .value.trim();
  const alertName = document.getElementById("alertName").value.trim();
  const services = getSelectedOptions(document.getElementById("service"));
  const eventTypes = getSelectedOptions(document.getElementById("eventType"));

  if (!eventTypes || eventTypes.length === 0) {
    alert("Please select at least one Event Type.");
    document.getElementById("eventType").focus();
    return;
  }

  const regions = getSelectedOptions(document.getElementById("region"));
  const severities = getSelectedOptions(document.getElementById("severity"));
  const actionMode = document.querySelector(
    'input[name="actionMode"]:checked'
  ).value;

  let actionsArray = [];
  let extraBicepResources = "";

  if (actionMode === "existing") {
    const actionGroupName = document
      .getElementById("actionGroupName")
      .value.trim();
    const actionGroupRg = document
      .getElementById("actionGroupRg")
      .value.trim();
    if (!actionGroupName || !actionGroupRg) {
      alert(
        "Please provide both Action Group Name and Resource Group (or choose Quick action)."
      );
      return;
    }
    const actionGroupId = `/subscriptions/${subscriptionId}/resourceGroups/${actionGroupRg}/providers/microsoft.insights/actionGroups/${actionGroupName}`;
    actionsArray = [
      { actionGroupId: serviceHealthQuote(actionGroupId) },
    ];
  } else {
    const quickActionGroupName = document
      .getElementById("quickActionGroupName")
      .value.trim();
    const quickEmail = document.getElementById("quickEmail").value.trim();
    if (!quickActionGroupName || !quickEmail) {
      alert(
        "Please provide Action Group Name and Email for quick action."
      );
      return;
    }
    const quickShortInput =
      (document.getElementById("quickShortName") &&
        document.getElementById("quickShortName").value.trim()) ||
      "";
    const agShort = makeShortName(quickShortInput || quickActionGroupName);
    extraBicepResources = `resource quickAG 'Microsoft.Insights/actionGroups@2019-06-01' = {\n  name: '${quickActionGroupName}'\n  location: 'global'\n  properties: {\n    groupShortName: ${serviceHealthQuote(
      agShort
    )}\n    enabled: true\n    emailReceivers: [\n      {\n        name: 'default'\n        emailAddress: ${serviceHealthQuote(
      quickEmail
    )}\n      }\n    ]\n  }\n}\n`;
    actionsArray = [{ actionGroupId: "quickAG.id" }];
  }

  const condition = {
    allOf: buildConditions(services, eventTypes, regions),
  };
  const desc =
    `Service Health alert for ${
      Array.isArray(services) ? services.join(", ") : services
    } (${eventTypes.length ? eventTypes.join(", ") : ""})` +
    (regions.length ? ` in ${regions.join(",")}` : "");

  const propertiesObj = {
    enabled: true,
    scopes: [serviceHealthQuote(`/subscriptions/${subscriptionId}`)],
    condition: condition,
    actions: { actionGroups: actionsArray },
    description: serviceHealthQuote(desc),
  };
  ensurePermissionsActions(propertiesObj);

  const tagsObj = readTags();
  const tagsBlock = Object.keys(tagsObj || {}).length
    ? `\n  tags: ${jsObjToBicep(tagsObj, "    ")}`
    : "";

  const bicepTemplate = `resource serviceHealthAlert 'Microsoft.Insights/activityLogAlerts@2023-01-01-preview' = {\n  name: '${alertName}'\n  location: 'global'${tagsBlock}\n    properties: ${jsObjToBicep(
    propertiesObj,
    "    "
  )}\n}\n`;

  const outputDiv = document.getElementById("output");
  const bicepCodeElement = document.getElementById("bicepCode");
  const fullTemplate = (extraBicepResources || "") + bicepTemplate;
  bicepCodeElement.textContent = fullTemplate;
  
  outputDiv.style.display = "block";
  
  // Trigger syntax highlighting - use text language as fallback for Bicep
  if (window.hljs) {
    bicepCodeElement.classList.add('language-bicep');
    // Highlight as generic language since Bicep is similar to ARM templates
    window.hljs.highlightElement(bicepCodeElement);
  }
  
  document.getElementById("copyBtn").disabled = false;
  document.getElementById("toast").classList.remove("show");
}

function showToast(message) {
  const toast = document.getElementById("toast");
  const toastMessage = document.getElementById("toastMessage");
  toastMessage.textContent = message;
  toast.classList.add("show");
  setTimeout(() => {
    toast.classList.remove("show");
  }, 2000);
}

function handleCopyClick() {
  const bicepCodeElement = document.getElementById("bicepCode");
  const bicepCode = bicepCodeElement.textContent;
  if (navigator && navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(bicepCode).then(() => {
      showToast("Template copied to clipboard!");
    });
  }
}

function handleClearForm() {
  // Reset form fields
  document.getElementById('bicepForm').reset();
  
  // Clear all validation errors
  const inputs = document.querySelectorAll('input, select');
  inputs.forEach(input => clearValidationError(input));
  
  // Reset tag container
  const tagsContainer = document.getElementById('tagsContainer');
  tagsContainer.innerHTML = '';
  addTagRow('', '');
  
  // Hide output and copy button
  document.getElementById('output').style.display = 'none';
  document.getElementById('copyBtn').disabled = true;
  document.getElementById('toast').classList.remove('show');
  
  // Reset action mode visibility
  setActionInputsVisibility();
  
  // Focus on first field for better UX
  document.getElementById('subscriptionId').focus();
}
