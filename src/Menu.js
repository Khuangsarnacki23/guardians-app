// src/Menu.js
import React, { useState } from "react";

function Menu({ title, renderOpener, renderContent }) {
  const [open, setOpen] = useState(false);

  const toggle = () => setOpen((prev) => !prev);
  const close = () => setOpen(false);

  return (
    <>
      {renderOpener({ open, toggle })}

      {open && (
        <>
          <div className="menu-overlay" onClick={close} />

          <div className="menu-popover">
            <div className="menu-header">
              <span className="menu-title">{title}</span>
              <button
                type="button"
                className="menu-close-btn"
                onClick={close}
                aria-label="Close menu"
              >
                ×
              </button>
            </div>

            <div className="menu-body">
              {renderContent({ close })}
            </div>
          </div>
        </>
      )}
    </>
  );
}

export default Menu;
