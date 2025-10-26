/* eslint-env node */
/* eslint-disable no-undef */
(async () => {
  try {
    const res = await fetch("http://localhost:3011/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        messages: [
          { role: "user", content: "你好，简单自我介绍一下，50字以内。" },
        ],
        model: "deepseek-chat",
        stream: false,
      }),
    });
    if (!res.ok) {
      console.error("HTTP", res.status);
      const t = await res.text();
      console.error(t);
      process.exit(1);
    }
    const json = await res.json();
    console.log("keys:", Object.keys(json).slice(0, 5));
    const content = json?.choices?.[0]?.message?.content || "";
    console.log("content:", String(content).slice(0, 120));
  } catch (err) {
    console.error("ERR", err?.message || err);
    process.exit(1);
  }
  process.exit(0);
})();
