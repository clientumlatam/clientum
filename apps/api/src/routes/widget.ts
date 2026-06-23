import { Router, type IRouter, type Request, type Response } from "express";
import crypto from "crypto";
import { db, chatbotConfigsTable, conversationsTable, messagesTable, subscriptionsTable } from "@workspace/db";
import { eq, and, or, desc } from "drizzle-orm";
import { chatCompletion, modelForPlan } from "../lib/openrouter";

const router: IRouter = Router();

function setCors(res: Response) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function buildWidgetJS(opts: { token: string; apiBase: string; name: string; color: string; welcome: string }): string {
  const { token, apiBase, name, color, welcome } = opts;
  const e = (s: string) => s.replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/\n/g, "\\n");
  const uid = token.slice(0, 8);

  return `(function(){
if(window.__clm_${uid})return;window.__clm_${uid}=true;
var _cs=document.currentScript;
var T='${e(token)}',A='${e(apiBase)}',C='${e(color)}',N='${e(name)}',W='${e(welcome)}';
var k='clm_s_'+T,sid=localStorage.getItem(k);
if(!sid){sid=Date.now().toString(36)+Math.random().toString(36).slice(2);localStorage.setItem(k,sid);}
var isOpen=false,busy=false;
var st=document.createElement('style');
st.textContent=[
  '#clm-btn-${uid}{position:fixed;bottom:24px;right:24px;width:56px;height:56px;border-radius:50%;background:'+C+';border:none;cursor:pointer;box-shadow:0 4px 20px rgba(0,0,0,.28);display:flex;align-items:center;justify-content:center;z-index:2147483647;transition:transform .2s,box-shadow .2s;padding:0;}',
  '#clm-btn-${uid}:hover{transform:scale(1.09);box-shadow:0 6px 24px rgba(0,0,0,.35);}',
  '#clm-panel-${uid}{position:fixed;bottom:92px;right:24px;width:360px;background:#fff;border-radius:20px;box-shadow:0 8px 40px rgba(0,0,0,.18);z-index:2147483646;display:flex;flex-direction:column;overflow:hidden;transform:scale(.92) translateY(16px);opacity:0;pointer-events:none;transition:transform .22s cubic-bezier(.34,1.56,.64,1),opacity .18s;}',
  '#clm-panel-${uid}.open{transform:scale(1) translateY(0);opacity:1;pointer-events:all;}',
  '#clm-hd-${uid}{background:'+C+';padding:14px 16px;display:flex;align-items:center;gap:10px;flex-shrink:0;}',
  '#clm-hd-${uid} .av{width:38px;height:38px;border-radius:50%;background:rgba(255,255,255,.2);display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0;}',
  '#clm-hd-${uid} .nm{flex:1;color:#fff;font-weight:700;font-size:15px;font-family:-apple-system,BlinkMacSystemFont,sans-serif;line-height:1.2;}',
  '#clm-hd-${uid} .st{font-size:11px;color:rgba(255,255,255,.75);font-family:-apple-system,BlinkMacSystemFont,sans-serif;display:flex;align-items:center;gap:4px;margin-top:2px;}',
  '#clm-hd-${uid} .dot{width:7px;height:7px;border-radius:50%;background:#4ade80;display:inline-block;}',
  '#clm-hd-${uid} .cl{background:none;border:none;cursor:pointer;color:rgba(255,255,255,.7);font-size:19px;padding:4px;line-height:1;}',
  '#clm-msgs-${uid}{overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:10px;min-height:260px;max-height:360px;background:#f8fafc;}',
  '#clm-msgs-${uid}::-webkit-scrollbar{width:4px;}',
  '#clm-msgs-${uid}::-webkit-scrollbar-thumb{background:#cbd5e1;border-radius:4px;}',
  '.clm-m-${uid}{max-width:82%;padding:10px 14px;border-radius:18px;font-size:14px;line-height:1.55;font-family:-apple-system,BlinkMacSystemFont,sans-serif;word-break:break-word;}',
  '.clm-u-${uid}{align-self:flex-end;background:'+C+';color:#fff;border-bottom-right-radius:4px;}',
  '.clm-a-${uid}{align-self:flex-start;background:#fff;color:#1a1a2e;border-bottom-left-radius:4px;box-shadow:0 1px 4px rgba(0,0,0,.08);}',
  '.clm-ty-${uid}{align-self:flex-start;background:#fff;border-radius:18px;border-bottom-left-radius:4px;padding:12px 16px;display:flex;gap:5px;box-shadow:0 1px 4px rgba(0,0,0,.08);}',
  '.clm-ty-${uid} span{width:7px;height:7px;background:#94a3b8;border-radius:50%;animation:clmb-${uid} .9s infinite;}',
  '.clm-ty-${uid} span:nth-child(2){animation-delay:.15s;}',
  '.clm-ty-${uid} span:nth-child(3){animation-delay:.3s;}',
  '@keyframes clmb-${uid}{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-6px)}}',
  '#clm-inp-${uid}{padding:10px 12px;background:#fff;border-top:1px solid #e8eef5;display:flex;gap:8px;flex-shrink:0;}',
  '#clm-inp-${uid} input{flex:1;border:1.5px solid #e2e8f0;border-radius:12px;padding:9px 14px;font-size:14px;font-family:-apple-system,BlinkMacSystemFont,sans-serif;outline:none;color:#1a1a2e;background:#f8fafc;}',
  '#clm-inp-${uid} input:focus{border-color:'+C+';background:#fff;}',
  '#clm-inp-${uid} .sb{background:'+C+';border:none;border-radius:12px;width:42px;height:42px;cursor:pointer;color:#fff;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:opacity .15s;}',
  '#clm-inp-${uid} .sb:disabled{opacity:.45;cursor:default;}',
  '#clm-pw-${uid}{padding:6px 14px 10px;text-align:center;font-size:11px;color:#94a3b8;font-family:-apple-system,BlinkMacSystemFont,sans-serif;flex-shrink:0;}',
  '#clm-pw-${uid} a{color:'+C+';text-decoration:none;font-weight:600;}',
  '#clm-panel-${uid}.dm{background:#0f172a;box-shadow:0 8px 40px rgba(0,0,0,.5);}',
  '#clm-panel-${uid}.dm #clm-msgs-${uid}{background:#1e293b;}',
  '#clm-panel-${uid}.dm #clm-msgs-${uid}::-webkit-scrollbar-thumb{background:#475569;}',
  '#clm-panel-${uid}.dm .clm-a-${uid}{background:#334155;color:#e2e8f0;box-shadow:none;}',
  '#clm-panel-${uid}.dm .clm-ty-${uid}{background:#334155;box-shadow:none;}',
  '#clm-panel-${uid}.dm .clm-ty-${uid} span{background:#64748b;}',
  '#clm-panel-${uid}.dm #clm-inp-${uid}{background:#0f172a;border-top:1px solid #1e293b;}',
  '#clm-panel-${uid}.dm #clm-inp-${uid} input{background:#1e293b;border-color:#334155;color:#e2e8f0;}',
  '#clm-panel-${uid}.dm #clm-inp-${uid} input:focus{border-color:'+C+';background:#1e293b;}',
  '#clm-panel-${uid}.dm #clm-pw-${uid}{color:#475569;}',
].join('');
document.head.appendChild(st);
var btn=document.createElement('button');
btn.id='clm-btn-${uid}';
btn.title=N;
btn.setAttribute('aria-label','Abrir chat');
btn.innerHTML='<svg width="26" height="26" viewBox="0 0 24 24" fill="none"><path d="M12 2C6.477 2 2 6.18 2 11c0 2.728 1.3 5.163 3.35 6.84L4 22l4.75-1.55A10.86 10.86 0 0 0 12 21c5.523 0 10-4.03 10-9s-4.477-9-10-9z" fill="white"/></svg>';
var panel=document.createElement('div');
panel.id='clm-panel-${uid}';
panel.innerHTML=[
  '<div id="clm-hd-${uid}">',
    '<div class="av">🤖</div>',
    '<div style="flex:1">',
      '<div class="nm">'+N+'</div>',
      '<div class="st"><span class="dot"></span>En línea · responde al instante</div>',
    '</div>',
    '<button class="cl" id="clm-cl-${uid}" title="Cerrar">✕</button>',
  '</div>',
  '<div id="clm-msgs-${uid}"></div>',
  '<div id="clm-inp-${uid}">',
    '<input id="clm-in-${uid}" type="text" placeholder="Escribí tu mensaje..." autocomplete="off" maxlength="500"/>',
    '<button class="sb" id="clm-sb-${uid}" title="Enviar">',
      '<svg width="17" height="17" viewBox="0 0 24 24" fill="none"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" fill="white"/></svg>',
    '</button>',
  '</div>',
  '<div id="clm-pw-${uid}">Powered by <a href="https://clientum.com.ar" target="_blank" rel="noopener">Clientum IA</a></div>',
].join('');
document.body.appendChild(btn);
document.body.appendChild(panel);
var msgsEl=document.getElementById('clm-msgs-${uid}');
var inputEl=document.getElementById('clm-in-${uid}');
var sendEl=document.getElementById('clm-sb-${uid}');
var closeEl=document.getElementById('clm-cl-${uid}');
var _dt=(_cs&&_cs.getAttribute('data-theme'))||'auto';
function isDark(){if(_dt==='dark')return true;if(_dt==='light')return false;var cl=document.documentElement.classList;if(cl.contains('dark'))return true;if(cl.contains('light'))return false;return !!(window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches);}
function syncDark(){panel.classList.toggle('dm',isDark());}
syncDark();
if(_dt==='auto'){var obs=new MutationObserver(syncDark);obs.observe(document.documentElement,{attributes:true,attributeFilter:['class']});if(window.matchMedia){try{window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change',syncDark);}catch(e){window.matchMedia('(prefers-color-scheme: dark)').addListener(syncDark);}}}
function addMsg(r,t){var d=document.createElement('div');d.className='clm-m-${uid} '+(r==='u'?'clm-u-${uid}':'clm-a-${uid}');d.textContent=t;msgsEl.appendChild(d);msgsEl.scrollTop=99999;}
function showTyping(){var d=document.createElement('div');d.className='clm-ty-${uid}';d.id='clm-t-${uid}';d.innerHTML='<span></span><span></span><span></span>';msgsEl.appendChild(d);msgsEl.scrollTop=99999;}
function hideTyping(){var t=document.getElementById('clm-t-${uid}');if(t)t.remove();}
function toggle(){isOpen=!isOpen;panel.classList.toggle('open',isOpen);if(isOpen){if(!msgsEl.hasChildNodes())addMsg('a',W);setTimeout(function(){inputEl.focus();},220);}}
function closePanel(){isOpen=false;panel.classList.remove('open');}
function send(){var txt=(inputEl.value||'').trim();if(!txt||busy)return;busy=true;inputEl.value='';sendEl.disabled=true;addMsg('u',txt);showTyping();fetch(A+'/api/widget/'+T+'/message',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:txt,sessionId:sid})}).then(function(r){return r.json();}).then(function(d){hideTyping();addMsg('a',d.reply||'No pude procesar tu mensaje. Intentá de nuevo.');}).catch(function(){hideTyping();addMsg('a','Error de conexión. Por favor, intentá de nuevo en unos segundos.');}).finally(function(){busy=false;sendEl.disabled=false;inputEl.focus();});}
btn.onclick=toggle;
closeEl.onclick=closePanel;
sendEl.onclick=send;
inputEl.addEventListener('keydown',function(e){if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send();}});
})();`;
}

router.get("/widget/:token/widget.js", async (req: Request, res: Response) => {
  setCors(res);
  const token = String(req.params.token);

  const [config] = await db.select()
    .from(chatbotConfigsTable)
    .where(eq(chatbotConfigsTable.widgetToken, token))
    .limit(1);

  res.setHeader("Content-Type", "application/javascript; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=300");

  if (!config) {
    res.send("/* Clientum Widget: token inválido o widget no configurado */");
    return;
  }

  const rawHost = (req.headers["x-forwarded-host"] as string) || (req.headers["host"] as string) || "";
  const isLocalhost = rawHost.startsWith("localhost") || rawHost.startsWith("127.");
  const host = isLocalhost ? (process.env.REPLIT_DEV_DOMAIN ?? rawHost) : rawHost;
  const proto = (req.headers["x-forwarded-proto"] as string) || (isLocalhost ? "http" : "https");
  const apiBase = `${proto}://${host}`;

  res.send(buildWidgetJS({
    token,
    apiBase,
    name: config.widgetName || "Asistente",
    color: config.widgetColor || "#1A3A80",
    welcome: config.widgetWelcome || "¡Hola! ¿En qué te puedo ayudar hoy? 👋",
  }));
});

router.options("/widget/:token/message", (_req: Request, res: Response) => {
  setCors(res);
  res.status(204).end();
});

router.post("/widget/:token/message", async (req: Request, res: Response) => {
  setCors(res);
  const token = String(req.params.token);
  const { message, sessionId } = req.body as { message?: string; sessionId?: string };

  if (!message?.trim() || !sessionId) {
    res.status(400).json({ error: "message y sessionId son requeridos" });
    return;
  }

  const [config] = await db.select()
    .from(chatbotConfigsTable)
    .where(eq(chatbotConfigsTable.widgetToken, token))
    .limit(1);

  if (!config) {
    res.status(404).json({ error: "Widget no encontrado" });
    return;
  }

  const [sub] = await db.select({ plan: subscriptionsTable.plan })
    .from(subscriptionsTable)
    .where(and(
      eq(subscriptionsTable.userId, config.userId),
      or(eq(subscriptionsTable.status, "active"), eq(subscriptionsTable.status, "trialing")),
    ))
    .limit(1);

  const plan = sub?.plan ?? "free";
  const model = modelForPlan(plan);
  const phoneNumber = `web_${sessionId}`;

  let [conv] = await db.select()
    .from(conversationsTable)
    .where(and(
      eq(conversationsTable.userId, config.userId),
      eq(conversationsTable.phoneNumber, phoneNumber),
    ))
    .limit(1);

  if (!conv) {
    const [inserted] = await db.insert(conversationsTable).values({
      id: crypto.randomUUID(),
      userId: config.userId,
      phoneNumber,
      contactName: "Visitante Web",
      channel: "web",
      lastMessageAt: new Date(),
      leadStatus: "new",
      leadNotes: "",
    }).returning();
    conv = inserted;
  } else {
    await db.update(conversationsTable)
      .set({ lastMessageAt: new Date() })
      .where(eq(conversationsTable.id, conv.id));
  }

  await db.insert(messagesTable).values({
    id: crypto.randomUUID(),
    conversationId: conv.id,
    role: "user",
    content: message.trim(),
  });

  const history = await db.select()
    .from(messagesTable)
    .where(eq(messagesTable.conversationId, conv.id))
    .orderBy(desc(messagesTable.createdAt))
    .limit((config.maxHistory ?? 20) + 1);

  const ctxMessages = history.reverse().slice(0, -1).map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));

  const systemPrompt = config.systemPrompt || "Sos un asistente de atención al cliente amable y profesional. Respondé siempre en español argentino, de forma clara y concisa.";
  const systemApiKey = process.env.OPENROUTER_API_KEY ?? "";
  const userKey = config.openrouterApiKey || undefined;

  try {
    const reply = await chatCompletion({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        ...ctxMessages,
        { role: "user", content: message.trim() },
      ],
      apiKey: userKey ?? systemApiKey,
      provider: (config.apiProvider as "openrouter" | "openai") ?? "openrouter",
      openaiApiKey: config.openaiApiKey || undefined,
      plan,
    });

    await db.insert(messagesTable).values({
      id: crypto.randomUUID(),
      conversationId: conv.id,
      role: "assistant",
      content: reply,
    });

    res.json({ reply });
  } catch {
    res.status(503).json({ reply: "Lo siento, la IA no está disponible en este momento. Intentá de nuevo en unos segundos." });
  }
});

export default router;
