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

      return json({ error: "Not found" }, 404);
    } catch (err) {
      return json({ error: String(err) }, 500);
    }
  },
};
