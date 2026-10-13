# Sunnmørsposten Værgrafikk & Overlay

Sanntids værgrafikk og HTML5-overlay for sendinger (Schibsted Stream CDN / OBS Studio / vMix).
Kildestørrelse: 1920 × 1080 (transparent bakgrunn).

---

## 📦 Hvordan laste opp koden til GitHub

1. Klikk på den grønne knappen **«Last ned kode (ZIP)»** i appens kontrollpanel for å laste ned prosjektfilene.
2. Pakk ut ZIP-filen på din datamaskin.
3. Gå til [github.com/new](https://github.com/new) og lag et nytt, tomt repo (f.eks. `smp-vaergrafikk`).
4. **Metode A (Uten terminal):** Klikk på lenken *"uploading an existing file"* på den nye GitHub-siden, og dra de utpakkede filene rett inn i nettleseren.
5. **Metode B (Med terminal):**
   ```bash
   git init
   git add .
   git commit -m "SMP Værgrafikk og Overlay"
   git branch -M main
   git remote add origin https://github.com/<ditt-brukernavn>/smp-vaergrafikk.git
   git push -u origin main
   ```

---

## 🚀 Utrulling (Deployment) uten innlogging

For at Schibsted Stream CDN skal kunne hente overlayet uten å bli stoppet av Googles påloggingsskjerm, må appen hostes på en åpen URL.

### Alternativ 1: Render.com (Enklest og gratis)
1. Eksporter/last opp koden til GitHub.
2. Logg inn på [render.com](https://render.com).
3. Klikk **New +** -> **Web Service** og velg GitHub-repoet ditt.
4. Innstillinger:
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
5. Klikk **Deploy Web Service**.
6. Du får en URL som f.eks.: `https://smp-grafikk.onrender.com/overlay`

---

### Alternativ 2: Google Cloud Run (med åpen tilgang)
1. Gå til [Google Cloud Console -> Cloud Run](https://console.cloud.google.com/run).
2. Klikk **Create Service**.
3. Velg **Continuously deploy from a repository** (koble til GitHub) eller last opp Docker-image.
4. **Viktig innstilling under "Authentication":**
   - Huk av for **«Allow unauthenticated invocations»** (Tillat uautentiserte forespørsler).  
     *(Dette er innstillingen som slår av Google IAP / påloggingsskjermen).*
5. Klikk **Create**.
6. Du får en URL som: `https://smp-grafikk-xxxx.run.app/overlay`

---

### Alternativ 3: Railway.app
1. Gå til [railway.app](https://railway.app).
2. Klikk **New Project** -> **Deploy from GitHub repo**.
3. Under prosjektinnstillinger -> **Networking**, klikk **Generate Domain**.
4. Ferdig!

---

### Alternativ 4: Egen server / Docker (Schibsted/SMP IT)
```bash
docker build -t smp-grafikk .
docker run -d -p 3000:3000 smp-grafikk
```
Sett opp en reverse proxy (f.eks. Nginx eller Caddy) med HTTPS mot port 3000.
