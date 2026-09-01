/**
 * @param {HTMLElement} root
 * @param {{ defaultTab?: string }} [options]
 * @returns {{ selectTab: (id: string) => void }}
 */
export function initTabs(root, { defaultTab } = {}) {
  const panelsWrap = root.querySelector(".tabs__panels");
  const panels = [...root.querySelectorAll("[data-tab-panel]")];
  if (!panelsWrap || panels.length === 0) {
    return { selectTab: () => {} };
  }

  const tablist = document.createElement("div");
  tablist.className = "tabs__list";
  tablist.setAttribute("role", "tablist");

  let activeId = defaultTab ?? panels[0].dataset.tabPanel ?? "";

  for (const panel of panels) {
    const id = panel.dataset.tabPanel ?? "";
    const label = panel.dataset.tabLabel ?? id;

    panel.classList.add("tabs__panel");
    panel.id = `tab-panel-${id}`;
    panel.setAttribute("role", "tabpanel");
    panel.setAttribute("aria-labelledby", `tab-${id}`);
    panel.hidden = id !== activeId;

    const tab = document.createElement("button");
    tab.type = "button";
    tab.className = "tabs__tab";
    tab.id = `tab-${id}`;
    tab.textContent = label;
    tab.setAttribute("role", "tab");
    tab.setAttribute("aria-controls", panel.id);
    tab.setAttribute("aria-selected", String(id === activeId));
    tab.tabIndex = id === activeId ? 0 : -1;
    tab.addEventListener("click", () => selectTab(id));
    tablist.appendChild(tab);
  }

  root.insertBefore(tablist, panelsWrap);

  function selectTab(id) {
    activeId = id;
    for (const panel of panels) {
      const isActive = panel.dataset.tabPanel === id;
      panel.hidden = !isActive;
      const tab = tablist.querySelector(`#tab-${panel.dataset.tabPanel}`);
      if (!tab) continue;
      tab.setAttribute("aria-selected", String(isActive));
      tab.tabIndex = isActive ? 0 : -1;
    }
  }

  return { selectTab };
}
