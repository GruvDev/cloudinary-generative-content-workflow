# Kiln Studio

**A generative campaign-asset pipeline built on Cloudinary.**

Describe a campaign once. Kiln generates image variations through Cloudinary's
Image Generation API with a choice of AI model family, tags every result with AI
Vision, and derives every channel size from the winner as a pure Cloudinary
transformation — then serves the lot from the CDN.

- **Track:** PS-02 · Track 2 — Generative Content Workflows
- **Live demo:** _add your Vercel URL here_
- **Stack:** Next.js 15 (App Router) · TypeScript · Cloudinary · deployed on Vercel

---

## 1. The problem

A small brand launching a product needs the same hero visual in five different
shapes — square for Instagram, 9:16 for Stories, 1.91:1 for a link card, a wide
email banner, a video thumbnail — plus alt text for every one of them.

Today that is a designer, a day of cropping, and a folder of near-duplicate
files that nobody can search a month later. The usual "AI image generator" does
not fix it: it hands you a PNG and stops. The work after the image is generated
is the actual work.

Kiln makes the generated image the **start** of a pipeline instead of the end of
one.

## 2. What it does

| Step | Screen | What happens |
|---|---|---|
| 01 | **Brief** | Write the brief, pick a model family and tier, optionally drop in a product shot. The source is uploaded to Cloudinary with quality analysis. |
| 02 | **Variations** | N variations are generated in parallel, each saved as a managed Cloudinary asset. AI Vision captions and tags each one as it lands. |
| 03 | **Channel kit** | Pick a winner. Every channel size is derived from that single asset by URL transformation — smart crop, headline text layer, scrim, format and quality negotiation. Change the headline and all five rebuild instantly, with nothing regenerated. |
| — | **Library** | Every asset ever made, searched through the Cloudinary Search API against the AI Vision captions and tags. |
| — | **Runs** | Pipeline history, reconstructed from context metadata on the assets themselves. |

A live pipeline rail down the right-hand side shows each Cloudinary call as it
fires, with timings and the raw response JSON.

## 3. How Cloudinary is used

Cloudinary is the engine, the datastore and the CDN. **There is no database in
this project** — every piece of state the app shows is read back out of
Cloudinary.

| Capability | Where | Code |
|---|---|---|
| **AI image generation** | Step 02 — text-to-image from the brief | `lib/imagegen.ts` |
| **Generative variations** | N variations per run, plus per-card re-roll with a new seed | `lib/prompt.ts`, `app/api/generate/route.ts` |
| **Model choice** | Flux · Ideogram · Recraft · Nano Banana · GPT Image, standard or premium tier, selected per request | `lib/types.ts`, `lib/imagegen.ts` |
| **Generative transformations** | Fallback path — `e_gen_background_replace` re-stages an uploaded product shot from the prompt | `lib/imagegen.ts` |
| **AI Vision** | Caption + tags for every generated asset, written back onto the asset | `lib/vision.ts` |
| **Upload API** | Signed server-side upload of the source shot, with `quality_analysis` | `app/api/upload/route.ts` |
| **Image transformations** | The whole channel kit: `c_fill,g_auto`, `e_gradient_fade`, `l_text` headline, `l_<logo>` image layer | `lib/transforms.ts` |
| **Named transformations** | The kit is registered as `t_kiln_social_kit` so stored URLs can be re-tuned centrally | `lib/transforms.ts` |
| **Search API** | The entire Library screen | `app/api/library/route.ts` |
| **Context metadata** | Run history on the Runs screen | `lib/runs.ts` |
| **Delivery / optimisation** | `f_auto`, `q_auto`, `dpr_auto` on every derivative, served from the CDN | `lib/transforms.ts` |

### The line that matters

```ts
target: {
  target_type: "managed_asset",
  public_id: args.publicId,
  tags: args.tags,
}
```

That is what makes this a pipeline rather than a wrapper. The generated image is
not a temporary output to download — it becomes a first-class Cloudinary asset
that is immediately transformable, searchable and deliverable.

## 4. Running it locally

```bash
git clone <your-repo-url>
cd kiln-studio
npm install
cp .env.example .env.local     # then fill in your three Cloudinary values
npm run verify                 # proves the pipeline against your account
npm run dev                    # http://localhost:3000
```

### `npm run verify`

Runs the whole pipeline once against your own Cloudinary account and prints a
pass/fail report — credentials, upload, metadata, generation, AI Vision,
transformation, forced download, named transformation and search. It creates a
few assets under `kiln/_verify` and deletes them again (`--keep` to retain them).

Run it before recording a demo. It answers the only question that matters in
about a minute: is this really talking to Cloudinary, or falling back to
sample assets?

### Cloudinary setup

1. Create a free account at [cloudinary.com](https://cloudinary.com).
2. In the Console, enable two add-ons under **Settings → Add-ons**:
   - **Cloudinary Image Generation** (for the primary generation path)
   - **Cloudinary AI Vision** (for captions and tags)
3. Copy your **cloud name**, **API key** and **API secret** from
   **Settings → API Keys** into `.env.local`.

**It runs without any of that.** With no credentials, or with
`KILN_DEMO_MODE=true`, the app serves Cloudinary's public `demo` cloud instead
and shows a banner across the top saying so. Every URL is still a real
Cloudinary delivery URL with a real transformation chain, so the pipeline on
screen is genuine — only the generation step is pre-baked, which is why the
sample images will not match your brief.

Do not record a demo video in this mode.

**If the Image Generation add-on is not available on your plan**, upload a
product shot on the Brief screen. Kiln falls back to generative transformations
(`e_gen_background_replace`) on that asset, which is a standard Cloudinary
capability and needs no add-on. Same pipeline, same outputs.

## 5. How to test it

1. **Open the app.** The Brief screen is prefilled with a working example.
2. Click **Generate 4 variations**. Watch the pipeline rail on the right: the
   steps light up in order and the response JSON updates with each call.
3. Variations appear **independently** as each finishes, each with an AI Vision
   caption and tags underneath.
4. Click **Pick** on one, then **Build channel kit**.
5. **Type in the Headline box.** Every derivative rebuilds live. Nothing is
   regenerated — open the transformation string under any card and you will see
   the text layer appear in the chain.
6. Drop a transparent PNG into the **Logo** slot. An `l_<logo>` layer joins the
   chain and appears on all five derivatives at once.
7. Toggle `f_auto` or `g_auto` off and watch the chain change.
8. Open **Library**. Search `studio`, `product`, or any word from a caption. That
   query goes to the Cloudinary Search API, not a database.
9. Open **Runs** to see the history rebuilt from asset metadata.
10. Open **Connection → Test connection** to see exactly which parts of the
   pipeline are live on your account.

### API routes

| Route | Method | Purpose |
|---|---|---|
| `/api/generate` | POST | Generate **one** variation |
| `/api/vision` | POST | Re-run AI Vision on an asset |
| `/api/upload` | POST | Signed upload of the source shot |
| `/api/kit` | POST | Build the channel-kit transformation chains |
| `/api/library` | GET | Cloudinary Search |
| `/api/runs` | GET | Run history from context metadata |
| `/api/health` | GET | Credential and add-on status |

### Scripts

| Command | Does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run verify` | End-to-end Cloudinary account check |
| `npm run typecheck` | `tsc --noEmit` |

## 6. Deploying to Vercel

1. Push the repo to GitHub.
2. Import it at [vercel.com/new](https://vercel.com/new). Framework detection
   handles the build — no overrides needed.
3. Add the three `CLOUDINARY_*` variables under
   **Settings → Environment Variables**, for all environments.
4. Deploy.

### One design decision worth knowing

`/api/generate` generates **one image per request**, and the browser fires N
requests in parallel.

A single serverless invocation that generated six images in sequence would take
two to four minutes and hit Vercel's function timeout every time. One image per
invocation keeps each call short, lets variations stream into the UI as they
finish, and means a single slow model does not take the run down with it. Each
route sets `maxDuration = 60` and runs on the Node runtime, which the Cloudinary
SDK requires.

## 7. Project structure

```
app/
  page.tsx            Studio shell
  layout.tsx
  ds.css              Modernist design-system tokens
  app.css
  api/                7 route handlers
components/
  Studio.tsx          State, parallel generation, pipeline tracking
  BriefScreen.tsx     Step 01
  VariantsScreen.tsx  Step 02
  KitScreen.tsx       Step 03
  LibraryScreen.tsx   Cloudinary Search
  RunsScreen.tsx      History
  PipelineRail.tsx    Live call trace
  SettingsDialog.tsx  Connection + health
lib/
  cloudinary.ts       SDK config, delivery URL builder
  imagegen.ts         Image Generation API + generative-transform fallback
  transforms.ts       Channel kit, named transformation, code snippets
  vision.ts           AI Vision with graceful degradation
  prompt.ts           Brief → prompt
  runs.ts             History from context metadata
  demo.ts             Sample-asset fallback
  client.ts           Browser API helpers
  types.ts            Shared contract
```

## 8. Notes and limitations

- The Image Generation API is an early-access add-on. The base URL is read from
  `CLOUDINARY_IMAGEGEN_BASE` so it can be corrected in one place if the
  reference page in your console shows a different host, and the response is
  parsed defensively.
- Generation is credit-based. Budget your free credits before a live demo, and
  keep `KILN_DEMO_MODE` in your back pocket.
- The headline text layer uses **Roboto**, a Cloudinary built-in font. Google
  Fonts also work via an `@google` suffix, but not together with the `bold`
  weight keyword: Cloudinary forwards the weight to the Google Fonts API, which
  only accepts numeric weights, so `Archivo@google_64_bold` builds the invalid
  request `family=Archivo:wght@bold` and every derivative returns HTTP 400. Set
  `KILN_TEXT_FONT` and `KILN_TEXT_WEIGHT` together; `npm run verify` probes the
  working combinations on your account.
- Uploads are capped at 4 MB. Vercel rejects a serverless request body above
  roughly 4.5 MB at the platform edge, before the route runs, so a larger limit
  would only produce an opaque error.
- Asset tags and context are written with `add_tag` / `add_context`, never
  `uploader.explicit`. Passing `tags` to `explicit` replaces the whole set, which
  would erase the `kiln` tag and the `run_id` and empty the Library and Runs
  screens.
- `vercel.json` deliberately sets no `regions`. Pinning a region is a paid-plan
  feature and fails a Hobby deployment. Function timeouts come from
  `export const maxDuration` in each route instead.
- Logos are uploaded to `kiln/logos/` and overlaid as an image layer. A
  transparent PNG gives the best result; the preview pads rather than crops so
  the aspect ratio survives.

## 9. Credits

Design system: **Modernist** (`app/ds.css`), from the original Kiln Studio design.
Built for the Cloudinary hackathon, Track 2 — Generative Content Workflows.
