import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createClient } from "@supabase/supabase-js";

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
    "鑾峰彇鍐夊唹鏈?鏂扮殑鍋ュ悍鏁版嵁锛屽寘鎷鏁般?佸績鐜囥?佺潯鐪犳椂闀?",
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
          content: [{ type: "text", text: `鏌ヨ澶辫触: ${error.message}` }],
        };
      }

      const text = `鍐夊唹鏈?鏂板仴搴锋暟鎹紙${data.created_at}锛夛細
- 姝ユ暟锛?${data.steps ?? "鏆傛棤"} 姝?
- 蹇冪巼锛?${data.heart_rate ?? "鏆傛棤"} 娆?/鍒?
- 鐫＄湢鏃堕暱锛?${data.sleep_duration ?? "鏆傛棤"} 灏忔椂`;

      return {
        content: [{ type: "text", text }],
      };
    }
  );

  return server;
}

export default async function handler(req, res) {
  if (req.method === "GET") {
    res.status(200).json({ status: "ok", message: "health-mcp-server is running" });
    return;
  }

  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });

  res.on("close", () => transport.close());
  const server = createServer();
  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
}
