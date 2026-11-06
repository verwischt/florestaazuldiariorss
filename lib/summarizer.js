'use strict';

const DEFAULT_PROMPT = `Você é um assistente especialista em leitura e análise de Diários Oficiais de municípios brasileiros.
Sua tarefa é ler o Diário Oficial anexo e produzir um resumo claro, conciso e objetivo em tópicos (bullet points com hífen "-").

Destaque principalmente:
- Decretos e Leis municipais relevantes (número e assunto central)
- Portarias importantes (nomeações, exonerações, comissões)
- Licitações, Editais e Avisos de Dispensa/Inexigibilidade (objeto e datas)
- Contratos e Extratos (objeto, empresa contratada e valor total, se informado)

Regras:
1. Seja direto e objetivo, sem enrolação.
2. Não faça introduções como "Este documento apresenta..." ou "No Diário Oficial de hoje...". Comece direto nos tópicos.
3. Se houver valores em dinheiro (R$), mencione-os.
4. Mantenha o resumo em português do Brasil, com no máximo 5 a 10 tópicos.
5. Se o diário for muito curto (apenas 1 ato), resuma esse ato em 1 ou 2 tópicos.`;

async function downloadPdfBuffer(pdfUrl, timeoutMs = 30000) {
  const res = await fetch(pdfUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; DiarioOficialRssBot/1.0)'
    },
    signal: AbortSignal.timeout(timeoutMs)
  });

  if (!res.ok) {
    throw new Error(`Falha ao baixar PDF (${res.status} ${res.statusText}) de ${pdfUrl}`);
  }

  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

async function summarizePdf(pdfUrl, options = {}) {
  const apiKey = options.apiKey || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }

  if (!pdfUrl) {
    return null;
  }

  try {
    const buffer = options.buffer || (await downloadPdfBuffer(pdfUrl, options.downloadTimeoutMs || 30000));
    
    // Evita enviar PDFs gigantescos via inlineData (limite de segurança: 18MB)
    const MAX_BYTES = 18 * 1024 * 1024;
    if (buffer.length > MAX_BYTES) {
      console.warn(`[IA] PDF muito grande para resumo inline (${(buffer.length / (1024 * 1024)).toFixed(1)}MB): ${pdfUrl}`);
      return null;
    }

    const model = options.model || process.env.GEMINI_MODEL || 'gemini-1.5-flash';
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

    const requestBody = {
      contents: [
        {
          parts: [
            {
              inlineData: {
                mimeType: 'application/pdf',
                data: buffer.toString('base64')
              }
            },
            {
              text: options.prompt || DEFAULT_PROMPT
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 1000
      }
    };

    const aiRes = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(options.apiTimeoutMs || 60000)
    });

    if (!aiRes.ok) {
      const errorBody = await aiRes.text().catch(() => '');
      console.warn(`[IA] Erro na API Gemini (${aiRes.status}): ${errorBody.slice(0, 300)}`);
      return null;
    }

    const json = await aiRes.json();
    const candidate = json?.candidates?.[0];
    const text = candidate?.content?.parts?.map((p) => p.text).join('')?.trim();

    return text || null;
  } catch (err) {
    console.warn(`[IA] Exceção ao resumir ${pdfUrl}: ${err.message}`);
    return null;
  }
}

module.exports = {
  DEFAULT_PROMPT,
  downloadPdfBuffer,
  summarizePdf
};

