"use client";

import { useTurnToPage } from "../src/hooks/useTurnToPage";
import { Button, BrandLogo } from "@repo/ui";
import styles from "./page.module.css";

// useTurnToPage imported from src/hooks

export default function Home() {
  const turnToPage = useTurnToPage();

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <BrandLogo
          className={styles.logo}
          srcLight="turborepo-dark.svg"
          srcDark="turborepo-light.svg"
          alt="Turborepo logo"
          width={180}
          height={38}
        />
        <Button>Open alert</Button>
        <Button onClick={() => turnToPage("/ai-chat")}>
          TurnToPage button
        </Button>
      </main>
    </div>
  );
}
