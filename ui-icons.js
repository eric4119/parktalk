/* Small, original line icons for the web app. Color follows currentColor. */
(() => {
  const paths = {
    home: '<path d="M3.5 10.3 12 3.5l8.5 6.8v9.2a1 1 0 0 1-1 1h-15a1 1 0 0 1-1-1z"/><path d="M9 20.5v-6h6v6"/>',
    board: '<rect x="4" y="3.5" width="16" height="17" rx="2.5"/><path d="M8 8h8M8 12h8M8 16h5"/>',
    tag: '<path d="M20 12.5 12.5 20a2 2 0 0 1-2.8 0L4 14.3V4h10.3L20 9.7a2 2 0 0 1 0 2.8Z"/><circle cx="8.5" cy="8.5" r="1.2"/>',
    grid: '<rect x="3.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.5"/>',
    personAdd: '<circle cx="9" cy="8" r="3"/><path d="M3.5 20v-2a5.5 5.5 0 0 1 11 0v2M18 8v8M14 12h8"/>',
    messages: '<path stroke-width="2.1" d="M20.8 11.9c0 4.8-3.9 8.7-8.7 8.7-1.4 0-2.8-.3-4-.9L3.6 21l1.3-4.5A8.7 8.7 0 1 1 20.8 11.9Z"/><circle cx="8" cy="12" r="1.15" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.15" fill="currentColor" stroke="none"/><circle cx="16" cy="12" r="1.15" fill="currentColor" stroke="none"/>',
    people: '<circle cx="9" cy="8" r="3"/><path d="M3 20v-1.6a6 6 0 0 1 12 0V20M17 5.5a3 3 0 0 1 0 5.6M18 14.2a5 5 0 0 1 3 4.6V20"/>',
    food: '<path d="M4 3v7a3 3 0 0 0 6 0V3M7 3v18M15 3c-2 2-3 5-3 9h5V3M17 3v18"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18M8 14h3M8 17h6"/>',
    map: '<path d="m3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2zM9 3v16M15 5v16"/>',
    bag: '<rect x="4" y="7" width="16" height="14" rx="2"/><path d="M9 9V6a3 3 0 0 1 6 0v3"/>',
    sparkles: '<path d="m12 2 1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8zM20 17l.6 1.4L22 19l-1.4.6L20 21l-.6-1.4L18 19l1.4-.6z"/>',
    search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 5 5"/>',

    user: '<circle cx="12" cy="8" r="3.5"/><path d="M4.5 20.5a7.5 7.5 0 0 1 15 0"/>',
    pin: '<path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 0 1 14 0Z"/><circle cx="12" cy="10" r="2.3"/>',
    shield: '<path d="m12 2 8 3v6c0 5-3 9-8 11-5-2-8-6-8-11V5z"/><path d="m9 12 2 2 4-4"/>',
    arrow: '<path d="M5 12h14m-6-6 6 6-6 6"/>',
    back: '<path d="M19 12H5m6 6-6-6 6-6"/>',
    link: '<path d="M10 13a5 5 0 0 0 7 .2l3-3a5 5 0 0 0-7-7l-1.7 1.7M14 11a5 5 0 0 0-7-.2l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>',
    dice: '<rect x="3.5" y="3.5" width="17" height="17" rx="4"/><circle cx="8" cy="8" r=".8"/><circle cx="16" cy="8" r=".8"/><circle cx="12" cy="12" r=".8"/><circle cx="8" cy="16" r=".8"/><circle cx="16" cy="16" r=".8"/>',
    coffee: '<path d="M4 8h12v7a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5zM16 9h2a3 3 0 0 1 0 6h-2M8 3v2M12 3v2"/>',
    car: '<path d="m5 10 2-5h10l2 5M4 10h16v8H4zM6 18v2M18 18v2M7 14h2M15 14h2"/>',
    store: '<path d="M4 10h16v11H4zM3 10l2-6h14l2 6M9 21v-7h6v7M3 10a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0"/>',
    paw: '<path d="M12 19c-2.2 0-3.5 1.7-5.4 1.1-1.9-.6-2.1-2.6-.9-4.1 1-1.2 2.3-1.9 3.7-3.3 1.1-1.1 1.9-2.3 3.6-2.3s2.5 1.2 3.6 2.3c1.4 1.4 2.7 2.1 3.7 3.3 1.2 1.5 1 3.5-.9 4.1-1.9.6-3.2-1.1-5.4-1.1Z"/><circle cx="5.5" cy="9" r="1.5"/><circle cx="9.5" cy="6.5" r="1.5"/><circle cx="14.5" cy="6.5" r="1.5"/><circle cx="18.5" cy="9" r="1.5"/>',
    heart: '<path d="M20.5 8.5c0 4.4-8.5 10-8.5 10s-8.5-5.6-8.5-10a4.8 4.8 0 0 1 8.5-3 4.8 4.8 0 0 1 8.5 3Z"/>',
    child: '<circle cx="12" cy="6.5" r="2.5"/><path d="M7 20h10l-1.5-9h-7zM7 13l-3 3M17 13l3 3"/>',
    found: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 5 5M8 10.5h5"/>',
    hotdog: '<path d="M5 17c2-8 12-8 14 0M4 17h16M7 13c2-5 8-5 10 0"/>',
    churros: '<path d="M4 19c4-3 9-9 14-14M7 21c4-3 9-9 14-14M4 19l3 2M18 5l3 2M9 14l2 2M13 10l2 2"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    close: '<path d="M5 5 19 19M19 5 5 19"/>',
    plus: '<path d="M12 4v16M4 12h16"/>',
    compose: '<path d="M11 4H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4"/><path d="m17.5 2.5 2 2L11 13l-3 1 1-3z"/>',
    swap: '<path d="M17 8A6.5 6.5 0 0 0 7 8"/><path d="M5 6l2 2-2 2"/><path d="M7 16A6.5 6.5 0 0 0 17 16"/><path d="M19 14l-2 2 2 2"/>',
  };
  const gear = '<path d="M13 2h6l.7 3.3 2.2.9 2.8-1.8 4.2 4.2-1.8 2.8.9 2.2 3.3.7v6l-3.3.7-.9 2.2 1.8 2.8-4.2 4.2-2.8-1.8-2.2.9-.7 3.3h-6l-.7-3.3-2.2-.9-2.8 1.8-4.2-4.2 1.8-2.8-.9-2.2L.7 19v-6l3.3-.7.9-2.2-1.8-2.8 4.2-4.2 2.8 1.8 2.2-.9z"/><circle cx="16" cy="16" r="5"/>';
  window.ParkIcons = (name, className = "ui-icon") => {
    if (name === "settings") {
      return `<svg class="${className}" viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${gear}</svg>`;
    }
    if (name === "meal") {
      return `<svg class="${className}" viewBox="0 0 708 439" fill="none" aria-hidden="true" focusable="false">
        <path fill="currentColor" d="M42 58h28v122h24V58h31v122h23V58h30v131c0 29-17 50-46 59v129H87V248c-29-9-45-30-45-59V58Z"/>
        <circle cx="367" cy="227" r="180" fill="currentColor"/>
        <circle cx="367" cy="227" r="129" stroke="#fff" stroke-width="10"/>
        <path fill="currentColor" d="M655 58v319h-46V250h-44v-60c0-72 30-126 90-132Z"/>
      </svg>`;
    }
    return `<svg class="${className}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${paths[name] || paths.sparkles}</svg>`;
  };
})();
