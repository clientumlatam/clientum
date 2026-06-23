export type GoalType = "lead_capture" | "close" | "appointment";

export interface AgentConfig {
  name: string;
  persona: string;
  greeting: string;
  tone: string;
  businessName: string;
  businessIndustry: string;
  businessDescription: string;
  goalType: GoalType;
  goalInstructions: string;
}

export interface CatalogItem {
  id: string;
  name: string;
  price: string;
  description: string;
  usp: string;
}

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

export interface Message {
  id: string;
  role: "user" | "model";
  text: string;
  timestamp: string;
}

export type LeadStatus = "Interested" | "Deal Closed" | "Call Booked";

export interface Lead {
  id: string;
  name: string;
  contactInfo: string;
  status: LeadStatus;
  value: number;
  summary: string;
  chatSessionId: string;
  timestamp: string;
  details?: string;
}

export interface ChatSession {
  id: string;
  messages: Message[];
  agentConfig: AgentConfig;
  catalog: CatalogItem[];
  faqs: FaqItem[];
  leadExtracted: boolean;
  status: "active" | "lead_captured" | "closed";
}

export const DEFAULT_AGENT: AgentConfig = {
  name: "Elena",
  persona: "Consultora de Automatización IA",
  greeting:
    "¡Hola! Soy Elena de Clientum. ¿En qué proceso de tu negocio puedo ayudarte a ahorrar tiempo hoy? 🚀",
  tone: "Consultivo, amigable y orientado a valor",
  businessName: "Clientum",
  businessIndustry: "SaaS / Automatización para PyMEs",
  businessDescription:
    "Plataforma de automatización IA para PyMEs argentinas: WhatsApp bot 24/7, facturación AFIP, CRM y ERP con Frappe.",
  goalType: "appointment",
  goalInstructions:
    "Mostrá el valor de automatizar WhatsApp con IA. Invitá al cliente a agendar un diagnóstico gratuito de 15 minutos. Pedí su email y horario disponible.",
};

export const DEFAULT_CATALOG: CatalogItem[] = [
  {
    id: "plan-starter",
    name: "Plan Starter",
    price: "USD 49/mes",
    description: "Bot WhatsApp IA, hasta 500 conversaciones/mes, RAG básico.",
    usp: "Ideal para negocios que recién automatizan.",
  },
  {
    id: "plan-pro",
    name: "Plan Pro",
    price: "USD 149/mes",
    description:
      "Bot ilimitado, Kit Frappe ERPNext, facturación AFIP, CRM pipeline.",
    usp: "Todo el stack completo. Incluye onboarding y soporte prioritario.",
  },
];

export const DEFAULT_FAQS: FaqItem[] = [
  {
    id: "faq-1",
    question: "¿Funciona con WhatsApp Business oficial?",
    answer:
      "Sí, usamos la API oficial de WhatsApp vía Evolution API. Tu número queda verificado y no hay riesgo de ban.",
  },
  {
    id: "faq-2",
    question: "¿Puedo probar antes de pagar?",
    answer:
      "Sí, ofrecemos un diagnóstico gratuito de 15 minutos y acceso demo al dashboard sin tarjeta de crédito.",
  },
];
