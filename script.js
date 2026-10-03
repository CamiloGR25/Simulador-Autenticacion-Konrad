(() => {
  "use strict";

  const missionOrder = ["m1","m2","m3","m4","m5","m6"];
  const labels = {
    intro: "Introducción",
    m1: "Misión 1 de 6",
    m2: "Misión 2 de 6",
    m3: "Misión 3 de 6",
    m4: "Misión 4 de 6",
    m5: "Misión 5 de 6",
    m6: "Misión 6 de 6",
    final: "Integración final"
  };

  const hints = {
    intro: [
      "El simulador tiene seis misiones encadenadas. Cada una aborda una parte del flujo de autenticación y control de acceso.",
      "No necesitas resolver todo de una vez. Ejecuta cada reto y usa el resultado para ajustar tu solución.",
      "Pulsa «Iniciar misión» para desbloquear el primer incidente."
    ],
    m1: [
      "Revisa dos frentes: cómo se protege la contraseña y qué ocurre cuando alguien intenta autenticarse repetidamente.",
      "Las credenciales predeterminadas, el texto plano y los intentos ilimitados son señales de riesgo.",
      "Selecciona: contraseña robusta, hash adecuado, MFA y limitación o retraso progresivo de intentos."
    ],
    m2: [
      "Un JWT se compone de encabezado, carga útil y firma, separados por puntos.",
      "Modificar el payload cambia los datos, pero no vuelve válida automáticamente la firma.",
      "Genera el token, pulsa «Alterar rol» y luego «Verificar firma»."
    ],
    m3: [
      "El servidor espera la credencial en un encabezado HTTP, no en el cuerpo de la solicitud.",
      "El esquema utilizado para JWT en este ejercicio es Bearer.",
      "Agrega una línea con: Authorization: Bearer <token>. Puedes usar el botón «Insertar token generado»."
    ],
    m4: [
      "El guard debe comprobar dos condiciones, no una.",
      "Primero verifica si el usuario está autenticado; después comprueba que posea el rol admin.",
      "Incluye en tu solución llamadas equivalentes a isAuthenticated() y hasRole('admin'), y devuelve true solo cuando ambas condiciones se cumplen."
    ],
    m5: [
      "Cerrar sesión no debería limitarse a cambiar de pantalla.",
      "Piensa en invalidación, eliminación de credenciales locales y límites de expiración o inactividad.",
      "Selecciona invalidar sesión/token, eliminar credenciales del cliente y aplicar expiración/inactividad."
    ],
    m6: [
      "La solicitud utiliza credenciales. Ese detalle cambia qué valores son válidos para el origen permitido.",
      "Con credenciales, Access-Control-Allow-Origin no debe usar el comodín *. Además, la solicitud real necesita Authorization.",
      "Usa http://localhost:4200 como origen concreto, incluye GET y OPTIONS en métodos, y permite Content-Type y Authorization."
    ],
    final: [
      "La pantalla final resume el flujo completo. Si falta algún control, vuelve a la misión correspondiente.",
      "Cada tarjeta se marca cuando la misión asociada está aprobada.",
      "Al completar las seis misiones verás el cierre del simulador."
    ]
  };

  const state = {
    current: "intro",
    unlocked: new Set(["intro"]),
    completed: new Set(),
    jwt: "",
    jwtOriginal: "",
    jwtTampered: "",
    hintIndex: {}
  };

  const $ = (id) => document.getElementById(id);
  const $$ = (sel) => [...document.querySelectorAll(sel)];

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({
      "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
    }[c]));
  }

  function showScreen(id) {
    if (!state.unlocked.has(id) && id !== "final") return;
    state.current = id;
    $$(".screen").forEach(el => el.classList.toggle("active", el.id === id));
    $$(".nav-item").forEach(btn => btn.classList.toggle("active", btn.dataset.screen === id));
    updateProgress();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function unlock(id) {
    state.unlocked.add(id);
    const nav = document.querySelector(`.nav-item[data-screen="${id}"]`);
    if (nav) nav.classList.remove("locked");
  }

  function completeMission(id) {
    state.completed.add(id);
    const n = missionOrder.indexOf(id);
    if (n >= 0 && n < missionOrder.length - 1) unlock(missionOrder[n + 1]);
    if (state.completed.size === missionOrder.length) unlock("final");
    const nav = document.querySelector(`.nav-item[data-screen="${id}"]`);
    nav?.classList.add("completed");
    const missionState = $(`${id}State`);
    if (missionState) {
      missionState.textContent = "Completada";
      missionState.classList.add("done");
    }
    updateProgress();
    updateFinal();
  }

  function updateProgress() {
    const done = state.completed.size;
    const pct = Math.round((done / missionOrder.length) * 100);
    $("progressFill").style.width = `${pct}%`;
    $("progressLabel").textContent = labels[state.current] || "";
    $("scoreChip").textContent = `${done} / 6 misiones`;
  }

  function setOutput(id, html, type="") {
    const el = $(id);
    el.innerHTML = html;
    el.classList.remove("ok","bad");
    if (type) el.classList.add(type);
  }

  function getChecked(containerId) {
    return [...document.querySelectorAll(`#${containerId} input[type="checkbox"]:checked`)].map(x => x.value);
  }

  // --- Pure JavaScript SHA-256 / HMAC-SHA256 for didactic offline JWT generation ---
  function utf8Bytes(str) {
    return new TextEncoder().encode(str);
  }
  function rotr(n, x) { return (x >>> n) | (x << (32 - n)); }
  function sha256Bytes(messageBytes) {
    const K = new Uint32Array([
      0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,
      0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,
      0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,
      0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,
      0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,
      0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,
      0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,
      0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2
    ]);
    const H = new Uint32Array([0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19]);

    const l = messageBytes.length;
    const bitLen = l * 8;
    const withOne = l + 1;
    const padLen = (64 - ((withOne + 8) % 64)) % 64;
    const total = withOne + padLen + 8;
    const data = new Uint8Array(total);
    data.set(messageBytes);
    data[l] = 0x80;
    const view = new DataView(data.buffer);
    view.setUint32(total - 8, Math.floor(bitLen / 0x100000000), false);
    view.setUint32(total - 4, bitLen >>> 0, false);

    const w = new Uint32Array(64);
    for (let off = 0; off < total; off += 64) {
      for (let i = 0; i < 16; i++) w[i] = view.getUint32(off + i*4, false);
      for (let i = 16; i < 64; i++) {
        const s0 = rotr(7,w[i-15]) ^ rotr(18,w[i-15]) ^ (w[i-15] >>> 3);
        const s1 = rotr(17,w[i-2]) ^ rotr(19,w[i-2]) ^ (w[i-2] >>> 10);
        w[i] = (w[i-16] + s0 + w[i-7] + s1) >>> 0;
      }
      let [a,b,c,d,e,f,g,h] = H;
      for (let i = 0; i < 64; i++) {
        const S1 = rotr(6,e) ^ rotr(11,e) ^ rotr(25,e);
        const ch = (e & f) ^ ((~e) & g);
        const t1 = (h + S1 + ch + K[i] + w[i]) >>> 0;
        const S0 = rotr(2,a) ^ rotr(13,a) ^ rotr(22,a);
        const maj = (a & b) ^ (a & c) ^ (b & c);
        const t2 = (S0 + maj) >>> 0;
        h=g; g=f; f=e; e=(d+t1)>>>0; d=c; c=b; b=a; a=(t1+t2)>>>0;
      }
      H[0]=(H[0]+a)>>>0; H[1]=(H[1]+b)>>>0; H[2]=(H[2]+c)>>>0; H[3]=(H[3]+d)>>>0;
      H[4]=(H[4]+e)>>>0; H[5]=(H[5]+f)>>>0; H[6]=(H[6]+g)>>>0; H[7]=(H[7]+h)>>>0;
    }
    const out = new Uint8Array(32);
    const outView = new DataView(out.buffer);
    H.forEach((v,i)=>outView.setUint32(i*4,v,false));
    return out;
  }
  function concatBytes(...arrays) {
    const len = arrays.reduce((a,b)=>a+b.length,0);
    const out = new Uint8Array(len);
    let pos = 0;
    arrays.forEach(a => { out.set(a,pos); pos += a.length; });
    return out;
  }
  function hmacSha256(key, message) {
    let k = utf8Bytes(key);
    if (k.length > 64) k = sha256Bytes(k);
    const block = new Uint8Array(64);
    block.set(k);
    const o = new Uint8Array(64), i = new Uint8Array(64);
    for (let n=0;n<64;n++) { o[n]=block[n]^0x5c; i[n]=block[n]^0x36; }
    const inner = sha256Bytes(concatBytes(i, utf8Bytes(message)));
    return sha256Bytes(concatBytes(o, inner));
  }
  function base64UrlBytes(bytes) {
    let bin = "";
    bytes.forEach(b => bin += String.fromCharCode(b));
    return btoa(bin).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
  }
  function base64UrlText(text) { return base64UrlBytes(utf8Bytes(text)); }
  const JWT_SECRET = "LAB-KEY-2026";
  function signJwt(input) { return base64UrlBytes(hmacSha256(JWT_SECRET, input)); }
  function renderJwt(token) {
    const p = token.split(".");
    $("jwtVisual").innerHTML = `<span class="segment jwt-header">${escapeHtml(p[0]||"")}</span><span class="jwt-sep">.</span><span class="segment jwt-payload">${escapeHtml(p[1]||"")}</span><span class="jwt-sep">.</span><span class="segment jwt-signature">${escapeHtml(p[2]||"")}</span>`;
  }

  // Navigation
  $$(".nav-item").forEach(btn => btn.addEventListener("click", () => {
    const id = btn.dataset.screen;
    if (state.unlocked.has(id)) showScreen(id);
  }));
  $("startBtn").addEventListener("click", () => { unlock("m1"); showScreen("m1"); });

  // M1
  $("m1Run").addEventListener("click", () => {
    const picked = new Set(getChecked("m1Choices"));
    const required = ["strong","hash","mfa","limit"];
    const forbidden = ["plaintext","unlimited","keep"];
    const ok = required.every(x=>picked.has(x)) && forbidden.every(x=>!picked.has(x));
    if (ok) {
      setOutput("m1Output","✓ Credenciales fortalecidas<br>✓ Almacenamiento seguro planteado<br>✓ MFA considerado<br>✓ Intentos automatizados controlados","ok");
      completeMission("m1");
      unlock("m2");
    } else {
      const missing = required.filter(x=>!picked.has(x)).length;
      const unsafe = forbidden.filter(x=>picked.has(x)).length;
      setOutput("m1Output",`La auditoría aún encuentra riesgos. Faltan <strong>${missing}</strong> controles recomendados y seleccionaste <strong>${unsafe}</strong> opciones inseguras. Ajusta la configuración y vuelve a ejecutar.`,"bad");
    }
  });

  // M2
  $("generateJwt").addEventListener("click", () => {
    try {
      const headerObj = JSON.parse($("jwtHeader").value);
      const payloadObj = JSON.parse($("jwtPayload").value);
      if (headerObj.alg !== "HS256" || headerObj.typ !== "JWT") throw new Error("El header debe usar alg HS256 y typ JWT para este laboratorio.");
      const h = base64UrlText(JSON.stringify(headerObj));
      const p = base64UrlText(JSON.stringify(payloadObj));
      const sig = signJwt(`${h}.${p}`);
      state.jwtOriginal = `${h}.${p}.${sig}`;
      state.jwt = state.jwtOriginal;
      state.jwtTampered = "";
      renderJwt(state.jwt);
      $("tamperJwt").disabled = false;
      $("verifyJwt").disabled = false;
      setOutput("m2Output","Token generado. Observa los tres segmentos separados por puntos. Ahora altera el rol para comprobar el efecto sobre la firma.","ok");
    } catch (e) {
      setOutput("m2Output",`No se pudo generar el token: ${escapeHtml(e.message)}`,"bad");
    }
  });

  $("tamperJwt").addEventListener("click", () => {
    if (!state.jwtOriginal) return;
    try {
      const headerObj = JSON.parse($("jwtHeader").value);
      const payloadObj = JSON.parse($("jwtPayload").value);
      payloadObj.role = payloadObj.role === "admin" ? "user" : "admin";
      $("jwtPayload").value = JSON.stringify(payloadObj,null,2);
      const h = base64UrlText(JSON.stringify(headerObj));
      const p = base64UrlText(JSON.stringify(payloadObj));
      const originalSignature = state.jwtOriginal.split(".")[2];
      state.jwtTampered = `${h}.${p}.${originalSignature}`;
      state.jwt = state.jwtTampered;
      renderJwt(state.jwt);
      setOutput("m2Output","Payload modificado, pero la firma original se mantuvo. Verifica el token para comprobar si sigue siendo válido.","bad");
    } catch (e) {
      setOutput("m2Output",`No fue posible alterar el payload: ${escapeHtml(e.message)}`,"bad");
    }
  });

  $("verifyJwt").addEventListener("click", () => {
    if (!state.jwt) return;
    const [h,p,s] = state.jwt.split(".");
    const expected = signJwt(`${h}.${p}`);
    if (s === expected && state.jwt === state.jwtOriginal) {
      setOutput("m2Output","✓ Firma válida. El encabezado y la carga útil coinciden con la firma.","ok");
    } else if (s !== expected) {
      setOutput("m2Output","✕ Firma inválida. El contenido fue alterado sin generar una nueva firma válida. El servidor debe rechazar este token.","ok");
      // Restore original valid token for next mission.
      state.jwt = state.jwtOriginal;
      completeMission("m2");
      unlock("m3");
    } else {
      setOutput("m2Output","La firma es válida. Para completar la misión, utiliza «Alterar rol» y vuelve a verificar.","bad");
    }
  });

  // M3
  $("insertTokenBtn").addEventListener("click", () => {
    if (!state.jwtOriginal) {
      setOutput("m3Output","Primero genera un JWT válido en la misión anterior.","bad");
      return;
    }
    $("httpRequest").value = `GET /api/profile HTTP/1.1
Host: api.app.edu
Content-Type: application/json
Authorization: Bearer ${state.jwtOriginal}`;
  });

  $("m3Run").addEventListener("click", () => {
    const req = $("httpRequest").value;
    const hasBearer = /Authorization\s*:\s*Bearer\s+([A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)/i.exec(req);
    if (!hasBearer) {
      $("m3Response").innerHTML = "<code>HTTP/1.1 401 Unauthorized\n\n{\n  \"error\": \"missing_credentials\"\n}</code>";
      setOutput("m3Output","La API no recibió una credencial Bearer válida en el encabezado Authorization.","bad");
      return;
    }
    const token = hasBearer[1];
    if (token !== state.jwtOriginal) {
      $("m3Response").innerHTML = "<code>HTTP/1.1 401 Unauthorized\n\n{\n  \"error\": \"invalid_token\"\n}</code>";
      setOutput("m3Output","El encabezado existe, pero el token no coincide con el JWT válido generado en la misión anterior.","bad");
      return;
    }
    $("m3Response").innerHTML = "<code>HTTP/1.1 200 OK\n\n{\n  \"id\": 204,\n  \"name\": \"Laura\",\n  \"role\": \"admin\"\n}</code>";
    setOutput("m3Output","✓ El JWT viajó en el encabezado Authorization usando el esquema Bearer.","ok");
    completeMission("m3");
    unlock("m4");
  });

  // M4
  $("m4Run").addEventListener("click", () => {
    const code = $("guardCode").value;
    const hasAuth = /isAuthenticated\s*\(\s*\)/.test(code);
    const hasRole = /hasRole\s*\(\s*['"]admin['"]\s*\)/.test(code);
    const hasReturn = /return\s+true|&&/.test(code);
    const tests = $$("#guardTests .test-item");
    tests.forEach(t => { t.classList.remove("pass","fail"); t.classList.add("pending"); t.querySelector("span").textContent="○"; });
    if (hasAuth && hasRole && hasReturn) {
      tests.forEach(t => { t.classList.remove("pending"); t.classList.add("pass"); t.querySelector("span").textContent="✓"; });
      setOutput("m4Output","✓ Las tres pruebas pasan: el guard comprueba autenticación y rol antes de permitir /admin.","ok");
      completeMission("m4");
      unlock("m5");
    } else {
      tests[0].classList.remove("pending"); tests[0].classList.add(hasAuth ? "pass":"fail"); tests[0].querySelector("span").textContent = hasAuth ? "✓":"✕";
      tests[1].classList.remove("pending"); tests[1].classList.add(hasRole ? "pass":"fail"); tests[1].querySelector("span").textContent = hasRole ? "✓":"✕";
      tests[2].classList.remove("pending"); tests[2].classList.add((hasAuth&&hasRole&&hasReturn) ? "pass":"fail"); tests[2].querySelector("span").textContent = (hasAuth&&hasRole&&hasReturn) ? "✓":"✕";
      setOutput("m4Output","El guard aún no representa las dos condiciones necesarias. Revisa autenticación, rol y valor de retorno.","bad");
    }
  });

  // M5
  $("m5Run").addEventListener("click", () => {
    const picked = new Set(getChecked("m5Choices"));
    const ok = ["invalidate","remove","expiry"].every(x=>picked.has(x)) && !picked.has("keep");
    if (ok) {
      $("m5Terminal").innerHTML = "<code>GET /api/admin\nAuthorization: Bearer TOKEN-A\n\n→ 401 Unauthorized\n→ session_invalidated</code>";
      setOutput("m5Output","✓ La sesión fue invalidada y el token anterior ya no concede acceso.","ok");
      completeMission("m5");
      unlock("m6");
    } else {
      $("m5Terminal").innerHTML = "<code>GET /api/admin\nAuthorization: Bearer TOKEN-A\n\n→ 200 OK\n→ WARNING: stale_session</code>";
      setOutput("m5Output","El token antiguo todavía puede reutilizarse. Revisa invalidación, eliminación local y expiración/inactividad.","bad");
    }
  });

  // M6
  $("m6Run").addEventListener("click", () => {
    const origin = $("corsOrigin").value.trim();
    const methods = $("corsMethods").value.toUpperCase();
    const headers = $("corsHeaders").value.toLowerCase();
    const creds = $("corsCreds").checked;
    const exactOrigin = origin === "http://localhost:4200";
    const methodsOk = methods.includes("GET") && methods.includes("OPTIONS");
    const headersOk = headers.includes("authorization") && headers.includes("content-type");
    const wildcardWithCreds = creds && origin === "*";

    if (exactOrigin && methodsOk && headersOk && creds && !wildcardWithCreds) {
      $("corsConsole").innerHTML = "<code>OPTIONS /profile → 204 No Content\nAccess-Control-Allow-Origin: http://localhost:4200\nAccess-Control-Allow-Methods: GET, OPTIONS\nAccess-Control-Allow-Headers: Content-Type, Authorization\nAccess-Control-Allow-Credentials: true\n\nGET /profile → 200 OK</code>";
      setOutput("m6Output","✓ El preflight fue aceptado y el navegador puede enviar la solicitud real con credenciales.","ok");
      completeMission("m6");
      unlock("final");
      setTimeout(()=>showScreen("final"), 650);
    } else {
      let issues = [];
      if (wildcardWithCreds) issues.push("con credenciales no debes usar * como origen");
      if (!exactOrigin) issues.push("debes permitir el origen concreto del frontend");
      if (!methodsOk) issues.push("incluye GET y OPTIONS");
      if (!headersOk) issues.push("incluye Content-Type y Authorization");
      if (!creds) issues.push("este escenario requiere permitir credenciales");
      $("corsConsole").innerHTML = `<code>OPTIONS /profile → CORS ERROR\n\n${escapeHtml(issues.join("\n"))}</code>`;
      setOutput("m6Output","La política aún bloquea la solicitud. Corrige los puntos indicados y ejecuta nuevamente.","bad");
    }
  });

  function updateFinal() {
    const cards = {
      m1: "finalAuth", m2:"finalJwt", m3:"finalHttp", m4:"finalGuard", m5:"finalSession", m6:"finalCors"
    };
    Object.entries(cards).forEach(([m,id]) => {
      const card = $(id);
      const done = state.completed.has(m);
      card.classList.toggle("done", done);
      card.querySelector("span").textContent = done ? "✓" : "○";
    });
    if (state.completed.size === 6) {
      $("completionBox").classList.add("success");
      $("completionBox").innerHTML = `<h3>✓ MISIÓN COMPLETADA</h3>
        <p>Has configurado correctamente el flujo de autenticación y control de acceso de la aplicación.</p>
        <p><strong>Idea clave:</strong> autenticarse es solo una parte del proceso. También debes proteger credenciales, controlar la navegación, gestionar la sesión y configurar adecuadamente la comunicación con la API.</p>`;
    }
  }

  // Help modal
  function openHelp() {
    const key = state.current;
    if (state.hintIndex[key] == null) state.hintIndex[key] = 0;
    renderHint();
    $("helpModal").classList.remove("hidden");
  }
  function renderHint() {
    const key = state.current;
    const idx = Math.min(state.hintIndex[key] || 0, hints[key].length - 1);
    $("helpLevel").textContent = `PISTA ${idx + 1} DE ${hints[key].length}`;
    $("helpContent").innerHTML = `<p>${escapeHtml(hints[key][idx])}</p>`;
    $("nextHint").disabled = idx >= hints[key].length - 1;
  }
  $("helpBtn").addEventListener("click", openHelp);
  $("nextHint").addEventListener("click", () => {
    const key = state.current;
    state.hintIndex[key] = Math.min((state.hintIndex[key]||0)+1, hints[key].length-1);
    renderHint();
  });
  ["closeHelp","closeHelp2"].forEach(id => $(id).addEventListener("click", ()=>$("helpModal").classList.add("hidden")));

  // How modal
  $("howBtn").addEventListener("click", ()=>$("howModal").classList.remove("hidden"));
  ["closeHow","closeHow2"].forEach(id => $(id).addEventListener("click", ()=>$("howModal").classList.add("hidden")));

  // Reset
  $("resetAllBtn").addEventListener("click", () => {
    if (!confirm("¿Quieres reiniciar todo el simulador? Se perderá el progreso actual.")) return;
    location.reload();
  });

  // Close modal with ESC / backdrop click
  document.addEventListener("keydown", e => {
    if (e.key === "Escape") {
      $("helpModal").classList.add("hidden");
      $("howModal").classList.add("hidden");
    }
  });
  ["helpModal","howModal"].forEach(id => {
    $(id).addEventListener("click", e => {
      if (e.target.id === id) $(id).classList.add("hidden");
    });
  });

  updateProgress();
  updateFinal();
})();
