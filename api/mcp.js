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

  return `冉冉最新健康数据（${data.created_at}）：
- 步数：${data.steps ?? "暂无"} 步
- 心率：${data.heart_rate ?? "暂无"} 次/分
- 睡眠时长：${data.sleep_duration ?? "暂无"} 小时`;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "*");

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  if (req.method === "GET") {
    res.status(200).json({
      jsonrpc: "2.0",
      result: {
        protocolVersion: "2024-11-05",
        capabilities: { tools: {} },
        serverInfo: { name: "health-mcp-server", version: "1.0.0" },
      },
      id: null,
    });
    return;
  }

  const body = req.body;
  const { method, id, params } = body || {};

  if (method === "initialize") {
    res.status(200).json({
      jsonrpc: "2.0",
      result: {
        protocolVersion: "2024-11-05",
        capabilities: { tools: {} },
        serverInfo: { name: "health-mcp-server", version: "1.0.0" },
      },
      id,
    });
    return;
  }

  if (method === "tools/list") {
    res.status(200).json({
      jsonrpc: "2.0",
      result: {
        tools: [
          {
            name: "get_health_data",
            description: "获取冉冉最新的健康数据，包括步数、心率、睡眠时长",
            inputSchema: { type: "object", properties: {} },
          },
        ],
      },
      id,
    });
    return;
  }

  if (method === "tools/call" && params?.name === "get_health_data") {
    const text = await getHealthData();
    res.status(200).json({
      jsonrpc: "2.0",
      result: { content: [{ type: "text", text }] },
      id,
    });
    return;
  }

  res.status(200).json({
    jsonrpc: "2.0",
    error: { code: -32601, message: "Method not found" },
    id: id ?? null,
  });
}
