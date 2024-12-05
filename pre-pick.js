import { delay, htmlToElement } from "./utils";

// Initialize the PrePick Mode combo box
const initStateComboBoxPrePick = () => {
  const comboBox = document.getElementById("prePickModeComboBox");
  const savedMode = DataStore.get("prePickMode") || "Disabled";
  comboBox.value = savedMode;

  comboBox.addEventListener("change", () => {
    DataStore.set("prePickMode", comboBox.value);
  });
};

// Handle champion selection and priority ordering
const handleSelect = (id) => {
  const champs = DataStore.get("champions");
  let pool = DataStore.get("champPool") || [];
  const selected = champs.findIndex((c) => c.id === id);

  if (selected !== -1) {
    champs[selected].checked = !champs[selected].checked;
    DataStore.set("champions", champs);

    const champion = document.getElementById(id + "-prepick-champ");

    if (champs[selected].checked) {
      champion.classList.add("active-item");
      pool.push(champs[selected]);
    } else {
      champion.classList.remove("active-item");
      pool = pool.filter((z) => z.id !== champs[selected].id);
    }

    saveAndRenderListOrder(pool);
  }
};

// Save the updated pool and render the champion list with priority order
const saveAndRenderListOrder = (pool) => {
  DataStore.set("champPool", pool);
  renderListOrder();
  renderListChampions();
};

// Render the priority-ordered list of selected champions in a 1-column layout
const renderListOrder = () => {
  const orderList = document.getElementById("ken-order-list");
  const pool = DataStore.get("champPool") || [];
  orderList.innerHTML = "";
  orderList.style.display = "grid";
  orderList.style.gridTemplateColumns = "1fr"; // 1-column grid

  pool.forEach((champ, index) => {
    const item = document.createElement("div");
    item.className = "ken-order-item";
    item.style.display = "flex";
    item.style.alignItems = "center";
    item.style.justifyContent = "space-between";
    item.draggable = true;
    item.dataset.index = index;

    // Champion image and name
    const championDetails = document.createElement("div");
    championDetails.style.display = "flex";
    championDetails.style.alignItems = "center";

    const avatar = document.createElement("img");
    avatar.src = champ.squarePortraitPath;
    avatar.style.width = "30px"; // Smaller image for grid
    avatar.style.height = "30px";
    avatar.style.marginRight = "5px";

    const name = document.createElement("span");
    name.textContent = champ.name;

    championDetails.appendChild(avatar);
    championDetails.appendChild(name);

    // Remove (X) button
    const removeBtn = document.createElement("button");
    removeBtn.textContent = "X";
    removeBtn.style.marginLeft = "10px";
    removeBtn.addEventListener("click", () => {
      pool.splice(index, 1);
      saveAndRenderListOrder(pool);
    });

    item.appendChild(championDetails);
    item.appendChild(removeBtn);

    // Drag-and-drop event handlers
    item.addEventListener("dragstart", (e) => {
      e.dataTransfer.setData("text/plain", index);
      item.classList.add("dragging");
    });

    item.addEventListener("dragend", () => {
      item.classList.remove("dragging");
    });

    item.addEventListener("dragover", (e) => {
      e.preventDefault();
      const afterElement = getDragAfterElement(orderList, e.clientY);
      const draggingItem = document.querySelector(".dragging");
      if (afterElement == null) {
        orderList.appendChild(draggingItem);
      } else {
        orderList.insertBefore(draggingItem, afterElement);
      }
    });

    item.addEventListener("drop", (e) => {
      e.preventDefault();
      const fromIndex = parseInt(e.dataTransfer.getData("text/plain"), 10);
      const toIndex = getDragAfterElementIndex(orderList, e.clientY, fromIndex);

      if (fromIndex !== toIndex) {
        const movedItem = pool.splice(fromIndex, 1)[0];
        pool.splice(toIndex, 0, movedItem);
        saveAndRenderListOrder(pool);
      }
    });

    orderList.appendChild(item);
  });
};

// Determine the correct drop location and return the index
const getDragAfterElementIndex = (container, y) => {
  const draggableElements = [...container.querySelectorAll(".ken-order-item:not(.dragging)")];

  let closestIndex = draggableElements.length;
  draggableElements.some((child, index) => {
    const box = child.getBoundingClientRect();
    const offset = y - box.top - box.height / 2;

    if (offset < 0) {
      closestIndex = index;
      return true; // Break the loop once the correct position is found
    }
    return false;
  });

  return closestIndex;
};

// Determine the element to drop before
const getDragAfterElement = (container, y) => {
  const draggableElements = [...container.querySelectorAll(".ken-order-item:not(.dragging)")];

  return draggableElements.reduce(
    (closest, child) => {
      const box = child.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;
      if (offset < 0 && offset > closest.offset) {
        return { offset: offset, element: child };
      } else {
        return closest;
      }
    },
    { offset: Number.NEGATIVE_INFINITY }
  ).element;
};

// Filter the champion list based on the search input and the "Show Selected" filter
const filterChampions = (searchTerm, showSelected) => {
  const pool = DataStore.get("champPool") || [];
  const champs = DataStore.get("champions") || [];

  // Filter and sort champions by name, putting selected ones first
  let filteredChamps = champs.filter((champ) =>
    champ.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!showSelected) {
    filteredChamps = filteredChamps.filter((champ) => !pool.some((p) => p.id === champ.id));
  }

  filteredChamps.sort((a, b) => {
    if (pool.some((p) => p.id === a.id) && !pool.some((p) => p.id === b.id)) return -1;
    if (!pool.some((p) => p.id === a.id) && pool.some((p) => p.id === b.id)) return 1;
    return a.name.localeCompare(b.name);
  });

  const listChamp = document.getElementById("ken-champion-list");
  const wrapper = document.createElement("div");
  wrapper.className = "ken-champion-list";

  filteredChamps.forEach((c) => {
    const champion = document.createElement("div");
    const avatar = document.createElement("img");
    avatar.src = c.squarePortraitPath;

    champion.className = pool.some((p) => p.id === c.id) ? "ken-champion-item active-item" : "ken-champion-item";
    champion.id = `${c.id}-prepick-champ`;
    champion.textContent = c.name;
    champion.appendChild(avatar);

    champion.addEventListener("click", () => handleSelect(c.id));

    wrapper.appendChild(champion);
  });

  listChamp.replaceChildren(wrapper);
};

// Render the full champion list based on the saved priority order
const renderListChampions = () => {
  const searchBox = document.getElementById("champion-search-box");
  const showSelectedCheckbox = document.getElementById("show-selected-checkbox");
  const searchTerm = searchBox ? searchBox.value : "";
  const showSelected = showSelectedCheckbox ? showSelectedCheckbox.checked : true;
  filterChampions(searchTerm, showSelected);
};

// Initialize the clear, save, and reload buttons
const initButtons = () => {
  const clearBtn = document.getElementById("clear-pool");
  clearBtn.addEventListener("click", () => {
    DataStore.set("champPool", []);
    const champs = DataStore.get("champions");
    DataStore.set("champions", champs.map((v) => ({ ...v, checked: false })));
    renderListChampions();
    renderListOrder();
  });

  const saveBtn = document.getElementById("save-pool");
  saveBtn.addEventListener("click", () => {
    const pool = DataStore.get("champPool");
    DataStore.set("savedChampPool", pool);
    alert("Champion list saved!");
  });

  const reloadBtn = document.getElementById("reload-pool");
  reloadBtn.addEventListener("click", () => {
    const savedPool = DataStore.get("savedChampPool") || [];
    DataStore.set("champPool", savedPool);
    renderListChampions();
    renderListOrder();
    alert("Champion list reloaded!");
  });
};

// Toggle visibility of elements by their IDs and hide margins
const toggleVisibility = (elementId, arrowId, relatedIds = []) => {
  const element = document.getElementById(elementId);
  const arrow = document.getElementById(arrowId);
  const isVisible = element.style.display !== "none";
  element.style.display = isVisible ? "none" : "block";
  arrow.textContent = isVisible ? "▶" : "▼";

  // Toggle related elements like buttons or search box
  relatedIds.forEach((relatedId) => {
    const relatedElement = document.getElementById(relatedId);
    if (relatedElement) {
      relatedElement.style.display = isVisible ? "none" : "block";
    }
  });
};

// Function to initialize the UI
export function prePickChampionsUI() {
  const listMenu = document.querySelector(
    "div.lol-social-lower-pane-container > lol-social-roster > lol-uikit-scrollable > div.list-content"
  );

  // Ensure the parent container exists
  if (!listMenu) {
    console.error("Parent container not found.");
    return;
  }

  // Remove existing UI elements to prevent duplication
  const existingUI = document.getElementById("ken-auto-swap-ui");
  if (existingUI) {
    existingUI.remove();
  }

  // Main header with collapsible functionality
  const mainHeader = document.createElement("div");
  mainHeader.className = "ken-main-header";
  mainHeader.style.fontSize = "1.2em";
  mainHeader.style.fontWeight = "bold";
  mainHeader.style.cursor = "pointer";
  mainHeader.style.display = "flex";
  mainHeader.style.alignItems = "center";

  const mainArrow = document.createElement("span");
  mainArrow.id = "main-arrow";
  mainArrow.textContent = "▼";
  mainArrow.style.marginRight = "5px";

  mainHeader.appendChild(mainArrow);
  mainHeader.appendChild(document.createTextNode("ARAM Auto Swap"));
  mainHeader.addEventListener("click", () => toggleVisibility("ken-auto-swap-ui", "main-arrow"));

  listMenu.appendChild(mainHeader);

  const selectChampUI = document.createElement("div");
  selectChampUI.id = "ken-auto-swap-ui";
  selectChampUI.className = "ken-modal-champions";

  // Combo Box for Auto Pick Mode (now at the top)
  const comboBox = htmlToElement(`
  <div class="pre-pick-mode" style="margin-bottom:10px; text-align: center;">
    <label for="prePickModeComboBox" style="font-size: 1.1em; font-weight: bold; color: white;">Pre Pick Mode:</label>
    <select id="prePickModeComboBox" name="prePickModeComboBox" style="font-size: 1.1em;">
      <option value="Disabled">Disabled</option>
      <option value="Swap Once">Swap Once</option>
      <option value="Always Swap">Always Swap</option>
    </select>
  </div>`);
  selectChampUI.appendChild(comboBox);

  // Header for priority list with collapsible functionality
  const orderListHeader = document.createElement("div");
  orderListHeader.className = "ken-order-header";
  orderListHeader.style.fontSize = "1.2em";
  orderListHeader.style.fontWeight = "bold";
  orderListHeader.style.cursor = "pointer";
  orderListHeader.style.display = "flex";
  orderListHeader.style.alignItems = "center";

  const orderArrow = document.createElement("span");
  orderArrow.id = "order-arrow";
  orderArrow.textContent = "▼";
  orderArrow.style.marginRight = "5px";

  orderListHeader.appendChild(orderArrow);
  orderListHeader.appendChild(document.createTextNode("Priority List"));
  orderListHeader.addEventListener("click", () => toggleVisibility("ken-order-list", "order-arrow", ["save-pool", "reload-pool", "clear-pool"]));

  selectChampUI.appendChild(orderListHeader);

  const orderList = document.createElement("div");
  orderList.id = "ken-order-list";
  orderList.style.marginLeft = "10px";
  selectChampUI.appendChild(orderList);

  // Wrapper for the buttons
  const buttonContainer = document.createElement("div");
  buttonContainer.id = "button-container";
  buttonContainer.style.display = "flex";
  buttonContainer.style.justifyContent = "space-between";
  buttonContainer.style.marginTop = "10px";

  const saveBtn = htmlToElement(`
    <lol-uikit-flat-button-secondary id="save-pool" class="lol-settings-reset-button">
    Save List
    </lol-uikit-flat-button-secondary>
  `);

  const reloadBtn = htmlToElement(`
    <lol-uikit-flat-button-secondary id="reload-pool" class="lol-settings-reset-button">
    Reload List
    </lol-uikit-flat-button-secondary>
  `);

  const clearBtn = htmlToElement(`
    <lol-uikit-flat-button-secondary id="clear-pool" class="lol-settings-reset-button">
    Clear
    </lol-uikit-flat-button-secondary>
  `);

  // Append buttons to the button container
  buttonContainer.appendChild(saveBtn);
  buttonContainer.appendChild(reloadBtn);
  buttonContainer.appendChild(clearBtn);

  // Attach button container to the bottom of the priority list
  orderList.appendChild(buttonContainer);

  const champListHeader = document.createElement("div");
  champListHeader.className = "ken-champion-header";
  champListHeader.style.fontSize = "1.2em";
  champListHeader.style.fontWeight = "bold";
  champListHeader.style.cursor = "pointer";
  champListHeader.style.display = "flex";
  champListHeader.style.alignItems = "center";

  const champArrow = document.createElement("span");
  champArrow.id = "champ-arrow";
  champArrow.textContent = "▼";
  champArrow.style.marginRight = "5px";

  champListHeader.appendChild(champArrow);
  champListHeader.appendChild(document.createTextNode("Champion List"));
  champListHeader.addEventListener("click", () => toggleVisibility("ken-champion-list", "champ-arrow", ["champion-search-box", "show-selected-container"]));

  selectChampUI.appendChild(champListHeader);

  const searchBox = document.createElement("input");
  searchBox.id = "champion-search-box";
  searchBox.type = "text";
  searchBox.placeholder = "Search Champions...";
  searchBox.addEventListener("input", () => renderListChampions());

  const showSelectedCheckbox = document.createElement("input");
  showSelectedCheckbox.id = "show-selected-checkbox";
  showSelectedCheckbox.type = "checkbox";
  showSelectedCheckbox.checked = true;
  showSelectedCheckbox.addEventListener("change", () => renderListChampions());

  const showSelectedLabel = document.createElement("label");
  showSelectedLabel.textContent = "Show Selected";
  showSelectedLabel.style.marginLeft = "5px";

  const showSelectedContainer = document.createElement("div");
  showSelectedContainer.id = "show-selected-container";
  showSelectedContainer.style.display = "flex";
  showSelectedContainer.style.alignItems = "center";
  showSelectedContainer.appendChild(showSelectedCheckbox);
  showSelectedContainer.appendChild(showSelectedLabel);

  selectChampUI.appendChild(searchBox);
  selectChampUI.appendChild(showSelectedContainer);

  const listChamp = document.createElement("div");
  listChamp.id = "ken-champion-list";
  listChamp.style.textAlign = "left";
  selectChampUI.appendChild(listChamp);

  listMenu.appendChild(selectChampUI);

  // Initial rendering and state setup
  initStateComboBoxPrePick();
  initButtons();

  const savedPool = DataStore.get("savedChampPool") || [];
  DataStore.set("champPool", savedPool);
  renderListChampions();
  renderListOrder();
}

// Use MutationObserver to detect DOM changes and reinitialize UI if necessary
const observeDOMChanges = () => {
  const targetNode = document.querySelector("div.lol-social-lower-pane-container");
  if (!targetNode) return;

  const config = { childList: true, subtree: true };

  const callback = (mutationsList) => {
    for (const mutation of mutationsList) {
      if (mutation.type === 'childList' && mutation.addedNodes.length) {
        // Reinitialize UI if relevant nodes are added
        prePickChampionsUI();
      }
    }
  };

  const observer = new MutationObserver(callback);
  observer.observe(targetNode, config);
};

// Function to fetch the list of pickable champions
const fetchPickableChampions = () => {
  return fetch('/lol-champ-select/v1/pickable-champion-ids', {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  })
    .then(response => response.json())
    .catch(error => {
      console.error('Error fetching pickable-champion-ids:', error);
      return []; // Return an empty list in case of an error
    });
};

// Handle the champion pre-pick event with new swap logic
export async function prePickChampionEvent(match) {
  try {
    const res = await fetch("/lol-gameflow/v1/gameflow-phase");
    const status = await res.json();
    if (status !== "ChampSelect") return;

    // Fetch the list of pickable champions
    const pickableChampions = await fetchPickableChampions();

    const pool = DataStore.get("champPool") || [];
    const currentChampId = match.myTeam.find(z => z.cellId === match.localPlayerCellId).championId;
    const currentChampIndex = pool.findIndex(z => z.id === currentChampId);

    let finalChampId = currentChampId;
    let finalChampIndex = currentChampIndex;

    if (currentChampIndex === -1) {
      console.log("Your current champion is not in the pool", currentChampId);
    } else {
      console.log("Your current champion is in the pool", pool[currentChampIndex]?.name);
    }

    const prePickMode = DataStore.get("prePickMode") || "Disabled";

    if (prePickMode === "Always Swap") {
      match.benchChampions.forEach(champ => {
        const poolIndex = pool.findIndex(v => v.id === champ.championId);
        if (poolIndex !== -1 && (finalChampIndex === -1 || poolIndex < finalChampIndex) && pickableChampions.includes(champ.championId)) {
          finalChampId = pool[poolIndex]?.id;
          finalChampIndex = poolIndex;
        }
      });
    }

    if (prePickMode !== "Disabled" && finalChampId !== currentChampId) {
      const update = await fetch(`/lol-champ-select/v1/session/bench/swap/${finalChampId}`, { method: "POST" });
      console.log("Champion swapped successfully", await update.json());
    }
  } catch (error) {
    console.error("Error during pre-pick:", error);
  }
}

// Initialize UI for PrePick Mode in Champion Select screen
export async function initUIPrePickInChampSelect() {
  const timeContainer = () => document.getElementsByClassName("timer-status")?.[0];
  while (!timeContainer()) await delay(500);

  const comboBox = htmlToElement(`
  <div class="pre-pick-mode" style="margin-bottom:10px; text-align: center;">
    <label for="prePickModeComboBox" style="font-size: 1.1em; font-weight: bold; color: white;">Pre Pick Mode:</label>
    <select id="prePickModeComboBox" name="prePickModeComboBox" style="font-size: 1.1em;">
      <option value="Disabled">Disabled</option>
      <option value="Swap Once">Swap Once</option>
      <option value="Always Swap">Always Swap</option>
    </select>
  </div>`);

  const container = document.getElementsByClassName("loadouts-edit-wrapper")?.[0];
  container.prepend(comboBox);

  initStateComboBoxPrePick();
  const savedPool = DataStore.get("savedChampPool") || [];
  DataStore.set("champPool", savedPool);
  renderListChampions();
  renderListOrder();
  observeDOMChanges();
}
