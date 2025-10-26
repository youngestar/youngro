/* eslint-env node */
/* eslint-disable no-undef */
import axios from "axios";

const API_KEY = "sk-76e3175935dd4bb689a5ce06a9912d3a";
const BASE_URL = "https://api.deepseek.com";

async function main() {
  try {
    const url = `${BASE_URL.replace(/\/$/, "")}/chat/completions`;
    const payload = {
      model: "deepseek-chat",
      messages: [
        { role: "system", content: "You are a helpful assistant." },
        {
          role: "user",
          content: "Hello from direct test! 简要介绍一下你自己（30字）。",
        },
      ],
      stream: false,
    };

    const { data } = await axios.post(url, payload, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_KEY}`,
      },
      timeout: 60000,
    });

    const content = data?.choices?.[0]?.message?.content || "";
    console.log("OK direct deepseek content:", String(content).slice(0, 120));
  } catch (err) {
    if (axios.isAxiosError(err)) {
      console.error("HTTP", err.response?.status);
      console.error(err.response?.data || err.message);
    } else {
      console.error("ERR", err?.message || err);
    }
    process.exit(1);
  }
}

main();
