// Auto-deploy vía Cloudflare Workers Builds (directorio raíz: worker)
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const { pathname, searchParams } = url;

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: CORS_HEADERS });
    }

    try {
      if (pathname === "/api/health") {
        return json({ ok: true });
      }

      if (pathname === "/api/logs" && request.method === "GET") {
        const date = searchParams.get("date");
        const exercise = searchParams.get("exercise");
        if (date) {
          const { results } = await env.DB.prepare(
            "SELECT * FROM logs WHERE date = ? ORDER BY exercise, set_number"
          )
            .bind(date)
            .all();
          return json(results);
        }
        if (exercise) {
          const limit = Number(searchParams.get("limit") || 200);
          const { results } = await env.DB.prepare(
            "SELECT * FROM logs WHERE exercise = ? ORDER BY date DESC, set_number LIMIT ?"
          )
            .bind(exercise, limit)
            .all();
          return json(results);
        }
        return json({ error: "Falta date o exercise" }, 400);
      }

      if (pathname === "/api/last-session" && request.method === "GET") {
        const { results } = await env.DB.prepare(
          `SELECT date, session FROM logs ORDER BY date DESC, created_at DESC LIMIT 1`
        ).all();
        return json(results[0] || null);
      }

      if (pathname === "/api/last" && request.method === "GET") {
        const exercise = searchParams.get("exercise");
        if (!exercise) return json({ error: "Falta exercise" }, 400);
        const { results } = await env.DB.prepare(
          `SELECT set_number, weight, reps, rir, date FROM logs
           WHERE exercise = ? AND date = (
             SELECT MAX(date) FROM logs WHERE exercise = ?
           )
           ORDER BY set_number`
        )
          .bind(exercise, exercise)
          .all();
        return json(results);
      }

      if (pathname === "/api/logs" && request.method === "POST") {
        const body = await request.json();
        const entries = Array.isArray(body) ? body : [body];
        const stmt = env.DB.prepare(
          `INSERT INTO logs (date, session, exercise, set_number, weight, reps, rir)
           VALUES (?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(date, exercise, set_number) DO UPDATE SET
             weight = excluded.weight,
             reps = excluded.reps,
             rir = excluded.rir`
        );
        const batch = entries.map((e) =>
          stmt.bind(
            e.date,
            e.session,
            e.exercise,
            e.set_number,
            e.weight ?? null,
            e.reps ?? null,
            e.rir ?? null
          )
        );
        await env.DB.batch(batch);
        return json({ ok: true, count: batch.length });
      }

      if (pathname.startsWith("/api/logs/") && request.method === "DELETE") {
        const id = pathname.split("/").pop();
        await env.DB.prepare("DELETE FROM logs WHERE id = ?").bind(id).run();
        return json({ ok: true });
      }

      if (pathname === "/api/profile" && request.method === "GET") {
        const row = await env.DB.prepare("SELECT * FROM profile WHERE id = 1").first();
        return json(row || null);
      }

      if (pathname === "/api/profile" && request.method === "POST") {
        const p = await request.json();
        await env.DB.prepare(
          `INSERT INTO profile (id, sexo, peso, altura, edad, actividad, objetivo, updated_at)
           VALUES (1, ?, ?, ?, ?, ?, ?, datetime('now'))
           ON CONFLICT(id) DO UPDATE SET
             sexo = excluded.sexo, peso = excluded.peso, altura = excluded.altura,
             edad = excluded.edad, actividad = excluded.actividad, objetivo = excluded.objetivo,
             updated_at = excluded.updated_at`
        )
          .bind(p.sexo, p.peso, p.altura, p.edad, p.actividad, p.objetivo)
          .run();
        return json({ ok: true });
      }

      if (pathname === "/api/food-logs" && request.method === "GET") {
        const date = searchParams.get("date");
        if (!date) return json({ error: "Falta date" }, 400);
        const { results } = await env.DB.prepare(
          "SELECT * FROM food_logs WHERE date = ? ORDER BY created_at"
        )
          .bind(date)
          .all();
        return json(results);
      }

      if (pathname === "/api/food-logs" && request.method === "POST") {
        const f = await request.json();
        const res = await env.DB.prepare(
          `INSERT INTO food_logs (date, meal, name, grams, kcal, protein, carbs, fat, source)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
          .bind(
            f.date, f.meal, f.name, f.grams,
            f.kcal, f.protein, f.carbs, f.fat,
            f.source || "manual"
          )
          .run();
        return json({ ok: true, id: res.meta.last_row_id });
      }

      if (pathname.startsWith("/api/food-logs/") && request.method === "DELETE") {
        const id = pathname.split("/").pop();
        await env.DB.prepare("DELETE FROM food_logs WHERE id = ?").bind(id).run();
        return json({ ok: true });
      }

      if (pathname === "/api/food-search" && request.method === "GET") {
        const q = searchParams.get("q");
        if (!q) return json({ error: "Falta q" }, 400);
        const offUrl =
          "https://world.openfoodfacts.org/cgi/search.pl?search_terms=" +
          encodeURIComponent(q) +
          "&search_simple=1&action=process&json=1&page_size=15&fields=product_name,nutriments";
        const offRes = await fetch(offUrl, {
          headers: { "User-Agent": "FullBodyEdwin/1.0 (uso personal)" },
        });
        if (!offRes.ok) return json([]);
        const data = await offRes.json();
        const results = (data.products || [])
          .filter((p) => p.product_name && p.nutriments && p.nutriments["energy-kcal_100g"])
          .slice(0, 15)
          .map((p) => ({
            name: p.product_name,
            kcal: Math.round(p.nutriments["energy-kcal_100g"] || 0),
            protein: Math.round((p.nutriments["proteins_100g"] || 0) * 10) / 10,
            carbs: Math.round((p.nutriments["carbohydrates_100g"] || 0) * 10) / 10,
            fat: Math.round((p.nutriments["fat_100g"] || 0) * 10) / 10,
            source: "off",
          }));
        return json(results);
      }

      if (pathname === "/api/food-photo" && request.method === "POST") {
        if (!env.GEMINI_API_KEY) {
          return json({ error: "Falta configurar GEMINI_API_KEY en el Worker" }, 500);
        }
        const body = await request.json();
        if (!body.image) return json({ error: "Falta image" }, 400);

        const prompt =
          "Analiza la imagen. Puede ser (A) un plato de comida preparada, o (B) el " +
          "envase/etiqueta de un producto con una tabla de información nutricional " +
          "impresa (ej: 'Información Nutricional', 'Nutrition Facts'). " +
          "Si es (A): identifica el plato y estima sus macronutrientes TOTALES para " +
          "toda la porción visible. " +
          "Si es (B): lee los valores EXACTOS impresos en la tabla, usando la columna " +
          "'por 100g' o 'por 100ml' si existe; si la tabla solo trae una columna de " +
          "'1 porción', usa esos valores y asume que porcion_g es el tamaño en gramos " +
          "de esa porción (ej: si dice 'Porción: 1 sobre (12g)', porcion_g=12). " +
          "Responde SOLO con un JSON válido, sin texto adicional ni explicación, con " +
          "este formato exacto: " +
          '{"tipo":"plato" o "etiqueta","alimento":"nombre corto","porcion_g":numero,' +
          '"kcal":numero,"protein":numero,"carbs":numero,"fat":numero}. ' +
          'Para "plato", kcal/protein/carbs/fat son el TOTAL de la porción visible. ' +
          'Para "etiqueta", son los valores POR 100g/100ml de la tabla (no multipliques ' +
          "por la porción), y porcion_g es el tamaño de la porción declarada en el " +
          "envase, solo como referencia de cuánto se suele comer de una vez.";

        const geminiUrl =
          "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=" +
          env.GEMINI_API_KEY;
        const geminiBody = JSON.stringify({
          contents: [
            {
              parts: [
                {
                  inline_data: {
                    mime_type: body.mediaType || "image/jpeg",
                    data: body.image,
                  },
                },
                { text: prompt },
              ],
            },
          ],
        });

        let aiRes = await fetch(geminiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: geminiBody,
        });

        // El tier gratis de Gemini a veces devuelve 503 por alta demanda
        // momentánea: un solo reintento tras una breve espera resuelve la
        // mayoría de esos casos sin molestar al usuario.
        if (aiRes.status === 503) {
          await new Promise((r) => setTimeout(r, 1500));
          aiRes = await fetch(geminiUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: geminiBody,
          });
        }

        if (!aiRes.ok) {
          const errText = await aiRes.text();
          const friendly =
            aiRes.status === 503
              ? "El modelo de IA está saturado por alta demanda en este momento. Intenta de nuevo en un minuto, o agrégalo manualmente."
              : "Error de la IA: " + errText;
          return json({ error: friendly }, 502);
        }
        const aiData = await aiRes.json();
        const text = aiData.candidates?.[0]?.content?.parts?.[0]?.text || "";
        const match = text.match(/\{[\s\S]*\}/);
        if (!match) return json({ error: "No se pudo interpretar la respuesta de la IA" }, 502);

        let parsed;
        try {
          parsed = JSON.parse(match[0]);
        } catch (e) {
          return json({ error: "JSON inválido de la IA" }, 502);
        }

        return json({
          tipo: parsed.tipo === "etiqueta" ? "etiqueta" : "plato",
          name: parsed.alimento || "Alimento (foto)",
          grams: parsed.porcion_g || 100,
          kcal: parsed.kcal || 0,
          protein: parsed.protein || 0,
          carbs: parsed.carbs || 0,
          fat: parsed.fat || 0,
          source: "foto-ia",
        });
      }

      return json({ error: "Not found" }, 404);
    } catch (err) {
      return json({ error: String(err) }, 500);
    }
  },
};
