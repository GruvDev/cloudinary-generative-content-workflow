# Submission — Kiln Studio

**Track:** PS-02 · Track 2 — Generative Content Workflows
**Live demo:** _<add Vercel URL>_
**Repository:** _<add GitHub URL>_
**Demo video:** _<add video URL>_

---

## Requirement checklist

| # | Requirement | How Kiln meets it | Where to look |
|---|---|---|---|
| 1 | Cloudinary is an active part of the product, not static hosting | Cloudinary generates the images, captions them, transforms them, stores the run history and serves everything. **The project has no database** — all state is read back out of Cloudinary. | `lib/imagegen.ts`, `lib/runs.ts` |
| 2 | Upload, manage, transform, optimise, search, generate or deliver media | All seven. Upload (`/api/upload`), manage (tags + context metadata), transform (channel kit), optimise (`f_auto,q_auto,dpr_auto`), search (Library screen), generate (Image Generation API), deliver (CDN URLs). | `README.md` §3 |
| 3 | Live working demo | Deployed on Vercel. | URL above |
| 4 | Public GitHub repository with setup instructions | Public repo, MIT licensed, `.env.example` included, plus `npm run verify` which tests a fresh account end to end in one command. | `README.md` §4 |
| 5 | README explaining track, problem, Cloudinary use and how to test | `README.md` sections 1–5, in that order. | `README.md` |
| 6 | 2–4 minute demo video | See URL above. | — |
| 7 | Cloudinary feedback survey | Completed at `cld.media/hackathon-survey`. | — |

---

## Cloudinary capabilities used

The track asked for AI image generation inside an existing pipeline, with variations and model choice.

| Capability | Used for |
|---|---|
| Image Generation API | Text-to-image and image-to-image from the campaign brief |
| Model choice | Flux · Ideogram · Recraft · Nano Banana · GPT Image, standard or premium tier, chosen per request |
| Generative variations | N variations per run, plus per-card re-roll on a new seed |
| Generative transformations | `e_gen_background_replace` — the fallback path when the add-on is unavailable |
| AI Vision | Caption and tags for every generated asset, written back onto the asset |
| Upload API | Signed server-side upload of the source shot and the logo, with `quality_analysis` |
| Image transformations | `c_fill,g_auto` smart crop, `l_text` headline layer, `l_<logo>` image layer, `fl_attachment` |
| Named transformations | The kit is registered as `t_kiln_social_kit` |
| Search API | The entire Library screen |
| Context metadata | Run history on the Runs screen |
| Optimisation and delivery | `f_auto`, `q_auto`, `dpr_auto`, CDN |

---

## The one-line summary for judges

> Most AI image tools hand you a PNG and stop. Kiln treats the generated image as
> the **first** step of a Cloudinary pipeline — one brief becomes a set of model
> variations, and the winner becomes every channel size as a pure URL
> transformation, with nothing regenerated and no database anywhere in the stack.

---

## Honest notes

Worth stating plainly rather than being found out in judging:

- **The Image Generation add-on is early access.** Its base URL lives in one
  constant (`CLOUDINARY_IMAGEGEN_BASE`) and the response is parsed defensively.
  If the add-on is not enabled, the app falls back to generative transformations
  on an uploaded source — still real Cloudinary AI, no add-on needed.
- **Demo mode exists and says so.** With no credentials, the app serves
  Cloudinary's public `demo` cloud and shows a banner saying exactly that. It is
  a graceful-degradation path, not a disguise.
- **`npm run verify`** proves the pipeline against a real account in about a
  minute. Run it before judging.
