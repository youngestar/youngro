"use client";

import { useTurnToPage } from "../src/hooks/useTurnToPage";
import { Button } from "@repo/ui";
import styles from "./page.module.css";

// useTurnToPage imported from src/hooks

export default function Home() {
  const turnToPage = useTurnToPage();
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <Button onClick={() => turnToPage("/ai-chat")}>开始聊天!</Button>
      </main>
    </div>
  );
}
