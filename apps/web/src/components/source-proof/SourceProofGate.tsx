"use client";

import { useMemo, useState } from "react";
import styles from "./SourceProofGate.module.css";
import { buttonRegistry, routeRegistry } from "./source-proof-registry";

export default function SourceProofGate() {
  const [open, setOpen] = useState(true);
  const [activeRoute, setActiveRoute] = useState("/studio");
  const [activeButton, setActiveButton] = useState("Generate");

  const route = useMemo(
    () => routeRegistry.find((item) => item.route === activeRoute) || routeRegistry[0],
    [activeRoute],
  );

  const button = useMemo(
    () => buttonRegistry.find((item) => item.button === activeButton) || buttonRegistry[0],
    [activeButton],
  );

  const pathProven = Boolean(route?.route && route?.files?.length && button?.api?.length);

  const proofText = [
    "Path proven:",
    `Route: ${route.route}`,
    `Files: ${route.files.join(" -> ")}`,
    `Button: ${button.button}`,
    `Handler: ${button.handler}`,
    `API: ${button.api.join(" -> ")}`,
    `Backend: ${button.backend.join(" -> ")}`,
    `Data: ${button.data.join(" / ")}`,
    `Proof: ${button.proof}`,
  ].join("\n");

  const copyProof = async () => {
    await navigator.clipboard.writeText(proofText);
  };

  return (
    <aside className={`${styles.sourceProofGate} ${open ? styles.isOpen : ""}`}>
      <button className={styles.sourceProofTab} type="button" onClick={() => setOpen((value) => !value)}>
        PROOF
      </button>

      {open ? (
        <div className={styles.sourceProofBody}>
          <div className={styles.sourceProofTop}>
            <span>NO-GUESS BUILD MODE</span>
            <strong>{pathProven ? "PATH PROVEN" : "PATH MISSING"}</strong>
          </div>

          <label>
            Active route/page
            <select value={activeRoute} onChange={(event) => setActiveRoute(event.target.value)}>
              {routeRegistry.map((item) => (
                <option key={item.route} value={item.route}>
                  {item.route}
                </option>
              ))}
            </select>
          </label>

          <label>
            Visible button/action
            <select value={activeButton} onChange={(event) => setActiveButton(event.target.value)}>
              {buttonRegistry.map((item) => (
                <option key={item.button} value={item.button}>
                  {item.button}
                </option>
              ))}
            </select>
          </label>

          <div className={styles.sourceProofSection}>
            <b>Route files</b>
            {route.files.map((file) => (
              <code key={file}>{file}</code>
            ))}
          </div>

          <div className={styles.sourceProofSection}>
            <b>Button → API → Backend</b>
            <code>Button: {button.button}</code>
            <code>Handler: {button.handler}</code>
            {button.api.map((api) => (
              <code key={api}>API: {api}</code>
            ))}
            {button.backend.map((file) => (
              <code key={file}>Backend: {file}</code>
            ))}
          </div>

          <div className={styles.sourceProofSection}>
            <b>Data / provider proof</b>
            {button.data.map((item) => (
              <code key={item}>{item}</code>
            ))}
            <code>{button.proof}</code>
          </div>

          <button className={styles.copyProof} type="button" onClick={copyProof}>
            Copy proven path
          </button>

          <p className={styles.sourceProofRule}>
            AI cannot patch until route, file, button, handler, API, backend, data path, and proof command are identified.
          </p>
        </div>
      ) : null}
    </aside>
  );
}
