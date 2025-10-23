import Image, { type ImageProps } from "next/image";
import { Button, Card } from "@repo/ui";
import styles from "./page.module.css";
import AiChatMessage from "../../src/components/ai-chat-message";

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
      <AiChatMessage name="123" chatContent="123"></AiChatMessage>
      <div>
        <h1 className={styles.title}>Welcome to Youngro</h1>
      </div>
    </>
  );
}
