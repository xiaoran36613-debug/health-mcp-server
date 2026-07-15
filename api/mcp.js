import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

async function getHealthData() {
  const { data, error } = await supabase
    .from("health_snapshot")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (error) return `查询失败: ${error.message}`;

  return `冉冉最新健康数据（${data.created_at}）：\n- 步数：${data.steps ?? "暂无"} 步\n- 心率：${data.heart_rate ?? "暂无"} 次/分\n- 睡眠时长：${data.sleep_duration ?? "暂无"} 小时`;
}

function sendSSE(res, data) {
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "*");

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  const accept = req.headers["accept"] || "";
  const wantsSSE = accept.includes("text/event-stream");

  const body = req.body || {};
  const { method, id, params } = body;

  let result;

  if (!method || method === "initialize") {
    result = {
      protocolVersion: "2024-11-05",
      capabilities: { tools: {} },
      serverInfo: { name: "health-mcp-server", version: "1.0.0" },
    };
  } else if (method === "tools/list") {
    result = {
      tools: [
        {
          name: "get_health_data",
          description: "获取冉冉最新的健康数据，包括步数、心率、睡眠时长",
          inputSchema: { type: "object", properties: {} },
        },
      ],
    };
  } else if (method === "tools/call" && params?.name === "get_health_data") {
    const text = await getHealthData();
    result = { content: [{ type: "text", text }] };
  } else {
    const response = { jsonrpc: "2.0", error: { code: -32601, message: "Method not found" }, id: id ?? null };
    if (wantsSSE) {
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.status(200);
      sendSSE(res, response);
      res.end();
    } else {
      res.status(200).json(response);
    }
    return;
  }

  const response = { jsonrpc: "2.0", result, id: id ?? null };

  if (wantsSSE) {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.status(200);
    sendSSE(res, response);
    res.end();
  } else {
    res.status(200).json(response);
  }
}
