"use client";

import styles from "./page.module.css";
import AiChatMessage from "../../src/components/AIChatMessage";

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
      <div className=" bg-primary-100 text-primary-500">Test</div>
      <div>
        <h1 className={styles.title}>Welcome to Youngro</h1>
      </div>
    </>
  );
}
