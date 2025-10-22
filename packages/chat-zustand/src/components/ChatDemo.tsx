import React, { useState, useEffect } from "react";
import useChatStore from "../stores/useChatStore";

export function ChatDemo(): JSX.Element {
  const messages = useChatStore((s) => s.messages);
  const streamingMessage = useChatStore((s) => s.streamingMessage);
  const sending = useChatStore((s) => s.sending);
  const send = useChatStore((s) => s.send);
  const cancel = useChatStore((s) => s.cancel);

  const [text, setText] = useState("");

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: 16 }}>
      <h2>Chat Demo (Zustand)</h2>
      <div
        style={{
          border: "1px solid #eee",
          borderRadius: 8,
          padding: 12,
          minHeight: 200,
        }}
      >
        {messages.map((m) => (
          <div key={m.id} style={{ marginBottom: 8 }}>
            <strong>{m.role}:</strong>{" "}
            {typeof m.content === "string"
              ? m.content
              : JSON.stringify(m.content)}
          </div>
        ))}
        {sending && streamingMessage && (
          <div style={{ marginTop: 8 }}>
            <strong>assistant (streaming):</strong> {streamingMessage.content}
          </div>
        )}
      </div>

      <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          style={{ flex: 1 }}
        />
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <button onClick={() => send(text)}>Send</button>
          <button onClick={() => cancel()}>Cancel</button>
          <button onClick={() => setText("Hello from demo")}>Fill</button>
        </div>
      </div>
    </div>
  );
}

export default ChatDemo;
