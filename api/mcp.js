import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

function createServer() {
  const server = new McpServer({
    name: "health-mcp-server",
    version: "1.0.0",
  });

  server.tool(
    "get_health_data",
    "获取冉冉最新的健康数据，包括步数、心率、睡眠时长",
    {},
    async () => {
      const { data, error } = await supabase
        .from("health_snapshot")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (error) {
        return {
          content: [{ type: "text", text: `查询失败: ${error.message}` }],
        };
      }

      const text = `冉冉最新健康数据（${data.created_at}）：
- 步数：${data.steps ?? "暂无"} 步
- 心率：${data.heart_rate ?? "暂无"} 次/分
- 睡眠时长：${data.sleep_duration ?? "暂无"} 小时`;

      return {
        content: [{ type: "text", text }],
      };
    }
  );

  return server;
}

export default async function handler(req, res) {
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });
  res.on("close", () => transport.close());
  const server = createServer();
  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
}
