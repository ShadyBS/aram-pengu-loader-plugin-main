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

// Render the priority-ordered list of selected champions
const renderListOrder = () => {
  const orderList = document.getElementById("ken-order-list");
  const pool = DataStore.get("champPool") || [];
  orderList.innerHTML = "";

  pool.forEach((champ, index) => {
    const item = document.createElement("div");
    item.className = "ken-order-item";
    item.textContent = champ.name;
    item.style.fontSize = "1.1em"; // Slightly larger font for priority items
    item.draggable = true;
    item.dataset.index = index;

    item.addEventListener("dragstart", (e) => {
      e.dataTransfer.setData("text/plain", index);
      item.classList.add("dragging");
    });

    item.addEventListener("dragend", (e) => {
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
const getDragAfterElementIndex = (container, y, fromIndex) => {
  const draggableElements = [...container.querySelectorAll(".ken-order-item:not(.dragging)")];

  let closestIndex = draggableElements.length;
  draggableElements.some((child, index) => {
    const box = child.getBoundingClientRect();
    const offset = y - box.top - box.height / 2;

    if (offset < 0) {
      closestIndex = index;
      return true; // Breaks the loop
    }
    return false;
  });

  return closestIndex;
};

// Determine the correct drop location
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

// Filter the champion list based on the search input
const filterChampions = (searchTerm) => {
  const pool = DataStore.get("champPool") || [];
  const champs = DataStore.get("champions") || [];

  // Filter champions by search term
  const filteredChamps = champs.filter((champ) =>
    champ.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const listChamp = document.getElementById("ken-champion-list");
  const wrapper = document.createElement("div");
  wrapper.className = "ken-champion-list";

  // Sort filtered champions based on the priority order in the pool
  const sortedChamps = filteredChamps.map((champ) => {
    const poolIndex = pool.findIndex((p) => p.id === champ.id);
    return { ...champ, priority: poolIndex !== -1 ? poolIndex : Infinity };
  }).sort((a, b) => a.priority - b.priority);

  sortedChamps.forEach((c) => {
    const champion = document.createElement("div");
    const avatar = document.createElement("img");
    avatar.src = c.squarePortraitPath;

    champion.className = c.checked ? "ken-champion-item active-item" : "ken-champion-item";
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
  const searchTerm = searchBox ? searchBox.value : "";
  filterChampions(searchTerm);
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

// Toggle visibility of elements by their IDs
const toggleVisibility = (elementId, relatedIds = []) => {
  const element = document.getElementById(elementId);
  const isVisible = element.style.display !== "none";
  element.style.display = isVisible ? "none" : "block";

  // Toggle related elements like buttons or search box
  relatedIds.forEach((relatedId) => {
    const relatedElement = document.getElementById(relatedId);
    if (relatedElement) {
      relatedElement.style.display = isVisible ? "none" : "block";
    }
  });

  // Remove extra space when collapsing
  if (!isVisible) {
    element.style.marginBottom = "0";
  } else {
    element.style.marginBottom = "";
  }
};

// PrePick Champions UI Initialization
export function prePickChampionsUI() {
  const listMenu = document.querySelector(
    "div.lol-social-lower-pane-container > lol-social-roster > lol-uikit-scrollable > div.list-content"
  );

  const selectChampUI = document.createElement("div");
  const listChamp = document.createElement("div");
  listChamp.id = "ken-champion-list";
  listChamp.style.textAlign = "left"; // Align the text to the left
  selectChampUI.className = "ken-modal-champions";
  selectChampUI.id = "ken-modal-champions";

  // Collapsible header for champion list
  const champListHeader = document.createElement("div");
  champListHeader.className = "ken-champion-header";
  champListHeader.textContent = "Champion List";
  champListHeader.style.cursor = "pointer";
  champListHeader.style.fontSize = "1.2em"; // Larger font for the title
  champListHeader.style.fontWeight = "bold"; // Make the title bold
  champListHeader.addEventListener("click", () => toggleVisibility("ken-champion-list", ["champion-search-box"]));

  // Search box for filtering champions
  const searchBox = document.createElement("input");
  searchBox.id = "champion-search-box";
  searchBox.type = "text";
  searchBox.placeholder = "Search Champions...";
  searchBox.addEventListener("input", () => renderListChampions());

  selectChampUI.appendChild(champListHeader);
  selectChampUI.appendChild(searchBox);
  selectChampUI.appendChild(listChamp);

  // Combo Box for Auto Pick Mode
  const comboBox = htmlToElement(`
  <div class="pre-pick-mode" style="margin-bottom:10px;">
    <label for="prePickModeComboBox" style="font-size: 1.1em; font-weight: bold;">Pre Pick Mode:</label>
    <select id="prePickModeComboBox" name="prePickModeComboBox" style="font-size: 1.1em;">
      <option value="Disabled">Disabled</option>
      <option value="Swap Once">Swap Once</option>
      <option value="Always Swap">Always Swap</option>
    </select>
  </div>`);

  selectChampUI.appendChild(comboBox);
  listMenu.appendChild(comboBox);

  const orderList = document.createElement("div");
  orderList.id = "ken-order-list";
  orderList.style.marginLeft = "10px";

  // Collapsible header for priority list, including buttons
  const orderListHeader = document.createElement("div");
  orderListHeader.className = "ken-order-header";
  orderListHeader.textContent = "Priority List";
  orderListHeader.style.cursor = "pointer";
  orderListHeader.style.fontSize = "1.2em"; // Larger font for the title
  orderListHeader.style.fontWeight = "bold"; // Make the title bold
  orderListHeader.addEventListener("click", () => toggleVisibility("ken-order-list", ["save-pool", "reload-pool", "clear-pool"]));

  listMenu.appendChild(orderListHeader);
  listMenu.appendChild(orderList);

  // Add Save and Reload buttons
  const saveBtn = htmlToElement(`
  <div style="position:relative;width:100%;height:38px;">
    <lol-uikit-flat-button-secondary id="save-pool" style="padding:10px;position:absolute;right:0;left:0;top:0;" class="lol-settings-reset-button">
    Save List
    </lol-uikit-flat-button-secondary>
  </div>`);

  const reloadBtn = htmlToElement(`
  <div style="position:relative;width:100%;height:38px;">
    <lol-uikit-flat-button-secondary id="reload-pool" style="padding:10px;position:absolute;right:0;left:0;top:0;" class="lol-settings-reset-button">
    Reload List
    </lol-uikit-flat-button-secondary>
  </div>`);

  listMenu.appendChild(saveBtn);
  listMenu.appendChild(reloadBtn);

  // Clear button
  const clearBtn = htmlToElement(`
  <div style="position:relative;width:100%;height:38px;">
    <lol-uikit-flat-button-secondary id="clear-pool" style="padding:10px;position:absolute;right:0;left:0;top:0;" class="lol-settings-reset-button">
    Clear
    </lol-uikit-flat-button-secondary>
  </div>`);

  listMenu.appendChild(clearBtn);

  selectChampUI.appendChild(listChamp);
  listMenu.appendChild(selectChampUI);

  // Initial rendering and state setup
  initStateComboBoxPrePick();
  initButtons();

  const savedPool = DataStore.get("savedChampPool") || []; // Ensure pool is loaded before rendering
  DataStore.set("champPool", savedPool);
  renderListChampions();
  renderListOrder();
}

// Handle the champion pre-pick event with new swap logic
export async function prePickChampionEvent(match) {
  try {
    const res = await fetch("/lol-gameflow/v1/gameflow-phase");
    const status = await res.json();
    if (status !== "ChampSelect") return;

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
        if (poolIndex !== -1 && (finalChampIndex === -1 || poolIndex < finalChampIndex)) {
          finalChampId = pool[poolIndex]?.id;
          finalChampIndex = poolIndex;
        }
      });
    }

    if (prePickMode !== "Disabled" && finalChampId !== currentChampId) {
      const update = await fetch(`/lol-champ-select/v1/session/bench/swap/${finalChampId}`, { method: "POST" });
      console.log("Champion swapped successfully", update.json());
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
  <div class="pre-pick-mode" style="margin-bottom:10px;">
    <label for="prePickModeComboBox" style="font-size: 1.1em; font-weight: bold;">Pre Pick Mode:</label>
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
}
