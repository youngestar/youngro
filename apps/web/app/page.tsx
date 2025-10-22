"use client";

import Image, { type ImageProps } from "next/image";
import { useTurnToPage } from "../src/hooks/useTurnToPage";
import { Button } from "@repo/ui";
import styles from "./page.module.css";

type Props = Omit<ImageProps, "src"> & {
  srcLight: string;
  srcDark: string;
};

const ThemeImage = (props: Props) => {
  const { srcLight, srcDark, ...rest } = props;

  return (
    <>
      <Image {...rest} src={srcLight} className="imgLight" />
      <Image {...rest} src={srcDark} className="imgDark" />
    </>
  );
};

// useTurnToPage imported from src/hooks

export default function Home() {
  const turnToPage = useTurnToPage();

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <ThemeImage
          className={styles.logo}
          srcLight="turborepo-dark.svg"
          srcDark="turborepo-light.svg"
          alt="Turborepo logo"
          width={180}
          height={38}
          priority
        />
        <Button>Open alert</Button>
        <Button onClick={() => turnToPage("/ai-chat")}>
          TurnToPage button
        </Button>
      </main>
    </div>
  );
}
