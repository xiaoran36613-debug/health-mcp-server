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

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS, DELETE");
  res.setHeader("Access-Control-Allow-Headers", "*");
  res.setHeader("Access-Control-Expose-Headers", "mcp-session-id");

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  if (req.method === "GET") {
    res.setHeader("Content-Type", "application/json");
    res.status(200).json({ status: "ok" });
    return;
  }

  if (req.method === "DELETE") {
    res.status(200).end();
    return;
  }

  const body = req.body || {};
  const { method, id, params } = body;

  // 固定session id，Vercel无状态所以用固定值
  const SESSION_ID = "kelivo-health-session";

  const reply = (data) => {
    res.setHeader("Content-Type", "application/json");
    res.setHeader("mcp-session-id", SESSION_ID);
    res.status(200).json(data);
  };

  if (method === "initialize") {
    reply({
      jsonrpc: "2.0",
      result: {
        protocolVersion: "2024-11-05",
        capabilities: { tools: {} },
        serverInfo: { name: "health-mcp-server", version: "1.0.0" },
      },
      id: id ?? null,
    });
    return;
  }

  if (method === "notifications/initialized") {
    res.setHeader("mcp-session-id", SESSION_ID);
    res.status(202).end();
    return;
  }

  if (method === "tools/list") {
    reply({
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
      id: id ?? null,
    });
    return;
  }

  if (method === "tools/call" && params?.name === "get_health_data") {
    const text = await getHealthData();
    reply({
      jsonrpc: "2.0",
      result: { content: [{ type: "text", text }] },
      id: id ?? null,
    });
    return;
  }

  reply({
    jsonrpc: "2.0",
    error: { code: -32601, message: "Method not found" },
    id: id ?? null,
  });
}
