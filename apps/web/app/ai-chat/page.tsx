"use client";

import Image, { type ImageProps } from "next/image";
import { Button, Card } from "@repo/ui";
import styles from "./page.module.css";
import AiChatMessage from "../../src/components/AIChatMessage";

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

export default function Home() {
  return (
    <>
      <AiChatMessage
        name="123"
        content="12333333333333333333333333333333asssssssssssssssssssssssssssssss"
        role="user"
      ></AiChatMessage>
      <AiChatMessage
        name="123"
        content="12333333333333333333333333333333asssssssssssssssssssssssssssssss"
        role="error"
      ></AiChatMessage>
      <AiChatMessage
        name="123"
        content="12333333333333333333333333333333asssssssssssssssssssssssssssssss"
        role="assistant"
      ></AiChatMessage>
      <div>
        <h1 className={styles.title}>Welcome to Youngro</h1>
      </div>
    </>
  );
}
