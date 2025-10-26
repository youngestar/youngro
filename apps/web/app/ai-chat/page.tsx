"use client";

import styles from "./page.module.css";
import InteractiveArea from "../../src/components/InteractiveArea";

export default function Home() {
  return (
    <div className="p-4">
      <h1 className={styles.title}>Youngro AI Chat</h1>
      <InteractiveArea />
    </div>
  );
}
