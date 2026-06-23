import { db, wcAiConversationsTable } from "@workspace/db";

export interface TenantConfig {
  tenantId:             string;
  wcBaseUrl:            string;
  wcKey:                string;
  wcSecret:             string;
  openrouterKey:        string;
  openrouterModel?:     string;
  groqKey?:             string;
  openaiKey?:           string;
  storeName:            string;
  storeLanguage?:       string;
  systemPromptOverride?: string | null;
}

export interface CustomerContext {
  customerId:         number;
  email?:             string;
  totalSpent:         number;
  orderCount:         number;
  favoriteCategories: string[];
}

type QueryIntent = "order_status" | "refund_request" | "product_inquiry" | "place_order" | "recommendation" | "general";
type Sentiment   = "positive" | "negative" | "neutral";

export class WooCommerceAIAgent {
  private config: TenantConfig;
  private model:  string;

  constructor(config: TenantConfig) {
    this.config = config;
    this.model  = config.openrouterModel ?? "deepseek/deepseek-r1:free";
  }

  async handleCustomerQuery(userMessage: string, customerId: number, sessionId: string): Promise<string> {
    const intent    = this.classifyIntent(userMessage);
    const sentiment = this.analyzeSentiment(userMessage);
    const context   = await this.getCustomerContext(customerId);
    const systemPrompt = this.buildSystemPrompt(context, sentiment);

    let response: string;
    switch (intent) {
      case "order_status":   response = await this.handleOrderStatus(userMessage, customerId, systemPrompt); break;
      case "refund_request": response = await this.handleRefundRequest(systemPrompt); break;
      case "place_order":    response = await this.handlePlaceOrder(userMessage, systemPrompt); break;
      case "recommendation": response = await this.handleRecommendations(customerId, systemPrompt); break;
      default:               response = await this.generateAIResponse(systemPrompt, userMessage);
    }

    await this.logConversation({ tenantId: this.config.tenantId, customerId, sessionId, userMessage, aiResponse: response, intent, sentiment });
    return response;
  }

  private classifyIntent(message: string): QueryIntent {
    const m = message.toLowerCase();
    if (/\b(pedido|orden|order|estado|seguimiento|track)\b/.test(m))             return "order_status";
    if (/\b(devoluci[oó]n|reembolso|refund|cancelar|cancel)\b/.test(m))          return "refund_request";
    if (/\b(comprar|agregar|carrito|checkout|quiero|necesito)\b/.test(m))         return "place_order";
    if (/\b(recomendar|sugerir|qu[eé] me recomiendas|opciones)\b/.test(m))        return "recommendation";
    if (/\b(producto|precio|stock|disponible|descripci[oó]n)\b/.test(m))          return "product_inquiry";
    return "general";
  }

  private analyzeSentiment(message: string): Sentiment {
    const m   = message.toLowerCase();
    const pos = ["gracias","excelente","perfecto","genial","bien","bueno","feliz"].filter(w => m.includes(w)).length;
    const neg = ["mal","problema","error","enojado","molesto","terrible","horrible","pésimo"].filter(w => m.includes(w)).length;
    return pos > neg ? "positive" : neg > pos ? "negative" : "neutral";
  }

  private wcAuth(): string {
    return `Basic ${Buffer.from(`${this.config.wcKey}:${this.config.wcSecret}`).toString("base64")}`;
  }

  private async wcGet<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
    const url = new URL(`${this.config.wcBaseUrl}/${endpoint}`);
    if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    const res = await fetch(url.toString(), { headers: { Authorization: this.wcAuth() } });
    if (!res.ok) throw new Error(`WC API ${res.status}: ${endpoint}`);
    return res.json() as Promise<T>;
  }

  private async getCustomerContext(customerId: number): Promise<CustomerContext> {
    try {
      const [customer, orders] = await Promise.all([
        this.wcGet<any>(`customers/${customerId}`),
        this.wcGet<any[]>("orders", { customer: String(customerId), per_page: "20" }),
      ]);
      const totalSpent = parseFloat(customer.total_spent ?? "0");
      const orderCount = customer.orders_count ?? 0;
      const catCount: Record<string, number> = {};
      for (const order of orders) {
        for (const item of order.line_items ?? []) {
          for (const meta of item.meta_data ?? []) {
            if (meta.key === "category") catCount[meta.value] = (catCount[meta.value] ?? 0) + 1;
          }
        }
      }
      const favoriteCategories = Object.entries(catCount).sort((a,b) => b[1]-a[1]).slice(0,3).map(([c]) => c);
      return { customerId, email: customer.email, totalSpent, orderCount, favoriteCategories };
    } catch {
      return { customerId, totalSpent: 0, orderCount: 0, favoriteCategories: [] };
    }
  }

  private buildSystemPrompt(context: CustomerContext, sentiment: Sentiment): string {
    if (this.config.systemPromptOverride?.trim()) {
      return this.config.systemPromptOverride
        .replace("{storeName}", this.config.storeName)
        .replace("{language}", this.config.storeLanguage ?? "es-AR")
        .replace("{orderCount}", String(context.orderCount))
        .replace("{totalSpent}", context.totalSpent.toFixed(2))
        .replace("{favoriteCategories}", context.favoriteCategories.join(", ") || "sin historial")
        .replace("{customerEmail}", context.email ?? "desconocido");
    }
    const tone = sentiment === "negative" ? "Sé empático y priorizá la solución rápida."
               : sentiment === "positive" ? "Mantené el tono positivo y entusiasta."
               : "Sé profesional y directo.";
    return `Sos el asistente de atención al cliente de ${this.config.storeName}.
Idioma: ${this.config.storeLanguage ?? "es-AR"}. ${tone}

Contexto del cliente:
- Pedidos realizados: ${context.orderCount}
- Total gastado: $${context.totalSpent.toFixed(2)}
- Categorías favoritas: ${context.favoriteCategories.join(", ") || "sin historial"}

Reglas:
1. Nunca inventes información de pedidos — consultá la base de datos.
2. Para devoluciones, siempre escalá a un agente humano.
3. Respondé en menos de 3 oraciones cuando sea posible.
4. Usá lenguaje informal argentino (vos, -ás).`;
  }

  private async handleOrderStatus(message: string, customerId: number, systemPrompt: string): Promise<string> {
    try {
      const match = message.match(/\b#?(\d{4,})\b/);
      const orders: any[] = match
        ? [await this.wcGet<any>(`orders/${match[1]}`)]
        : await this.wcGet<any[]>("orders", { customer: String(customerId), per_page: "3", orderby: "date", order: "desc" });
      if (!orders.length) return "No encontré pedidos asociados a tu cuenta.";
      const summary = orders.map(o => `Pedido #${o.id}: ${o.status} — $${o.total} (${new Date(o.date_created).toLocaleDateString("es-AR")})`).join("\n");
      return this.generateAIResponse(systemPrompt, `Dados estos pedidos, respondé:\n${summary}\nConsulta: "${message}"`);
    } catch { return "No pude consultar tu pedido ahora. Escribinos y te ayudamos en minutos."; }
  }

  private async handleRefundRequest(systemPrompt: string): Promise<string> {
    return this.generateAIResponse(systemPrompt, "El cliente quiere una devolución. Explicale el proceso y que un agente lo contactará.");
  }

  private async handlePlaceOrder(message: string, systemPrompt: string): Promise<string> {
    try {
      const match = message.match(/(?:comprar|quiero|agregar)\s+(?:\d+\s+)?(.+?)(?:\s+al carrito|$)/i);
      if (!match) return "No pude identificar el producto. ¿Podés decirme exactamente qué querés comprar?";
      const products = await this.wcGet<any[]>("products", { search: match[1], per_page: "3" });
      if (!products.length) return `No encontré "${match[1]}" en el catálogo.`;
      const top = products[0];
      if (top.stock_status !== "instock") return `El producto *${top.name}* está sin stock por ahora.`;
      const checkoutUrl = `${this.config.wcBaseUrl.replace("/wp-json/wc/v3", "")}/?add-to-cart=${top.id}`;
      return this.generateAIResponse(systemPrompt, `Producto: ${top.name} — $${top.price}. Stock OK. URL: ${checkoutUrl}\nAyudá al cliente a completar la compra.`);
    } catch { return "Hubo un problema al procesar tu compra. Intentá de nuevo o contactanos."; }
  }

  private async handleRecommendations(customerId: number, systemPrompt: string): Promise<string> {
    try {
      const context = await this.getCustomerContext(customerId);
      const params: Record<string, string> = { per_page: "5", orderby: "popularity" };
      if (context.favoriteCategories.length) {
        const cats = await this.wcGet<any[]>("products/categories", { search: context.favoriteCategories[0] });
        if (cats.length) params.category = String(cats[0].id);
      }
      const products = await this.wcGet<any[]>("products", params);
      const list = products.map(p => `- ${p.name}: $${p.price} (⭐ ${p.average_rating ?? "N/A"})`).join("\n");
      return this.generateAIResponse(systemPrompt, `Recomendá estos productos de forma natural:\n${list}`);
    } catch { return "No pude responder ahora mismo. ¿Podés reformular la pregunta?"; }
  }

  async generateAIResponse(systemPrompt: string, userMessage: string): Promise<string> {
    const response =
      await this.openrouterResponse(systemPrompt, userMessage) ??
      (this.config.groqKey   ? await this.groqResponse(systemPrompt, userMessage)   : null) ??
      (this.config.openaiKey ? await this.openaiResponse(systemPrompt, userMessage) : null);
    return response ?? "No pude responder ahora mismo. ¿Podés reformular la pregunta?";
  }

  private async openrouterResponse(system: string, user: string): Promise<string | null> {
    try {
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${this.config.openrouterKey}`, "Content-Type": "application/json", "HTTP-Referer": "https://clientum.com.ar", "X-Title": "Clientum WC Agent" },
        body: JSON.stringify({ model: this.model, messages: [{ role: "system", content: system }, { role: "user", content: user }], max_tokens: 500, temperature: 0.7 }),
      });
      const data: any = await res.json();
      const choice = data.choices?.[0]?.message;
      return choice?.content || choice?.reasoning_content || null;
    } catch { return null; }
  }

  private async groqResponse(system: string, user: string): Promise<string | null> {
    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${this.config.groqKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: "llama3-8b-8192", messages: [{ role: "system", content: system }, { role: "user", content: user }], max_tokens: 500 }),
      });
      const data: any = await res.json();
      return data.choices?.[0]?.message?.content ?? null;
    } catch { return null; }
  }

  private async openaiResponse(system: string, user: string): Promise<string | null> {
    try {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${this.config.openaiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: "gpt-4o-mini", messages: [{ role: "system", content: system }, { role: "user", content: user }], max_tokens: 500 }),
      });
      const data: any = await res.json();
      return data.choices?.[0]?.message?.content ?? null;
    } catch { return null; }
  }

  private async logConversation(data: { tenantId: string; customerId: number; sessionId: string; userMessage: string; aiResponse: string; intent: string; sentiment: string }): Promise<void> {
    try {
      await db.insert(wcAiConversationsTable).values({ ...data, provider: "openrouter", model: this.model, metadata: {} });
    } catch (err) { console.error("[WCAgent] Log error:", err); }
  }
}
