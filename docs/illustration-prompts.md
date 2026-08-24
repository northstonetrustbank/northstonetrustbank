# Product illustration prompts

Ten pieces, one set. They sit on product tiles inside the app, on a near-black
navy ground, at roughly 340×214 on a phone — so they must read at thumbnail
size and carry no text.

**Output size:** 3:2 (e.g. 1536×1024), then crop to **1.586:1** — the same
ratio as a payment card, which is what the tiles use. Save as PNG, then hand
them back and they get converted to WebP and dropped in `/public/art/`.

**The rule:** the STYLE BLOCK below is identical in every prompt. Only the last
two lines — SUBJECT and ACCENT — change. If you edit the style block for one
piece, edit it for all ten, or the set falls apart.

---

## STYLE BLOCK (paste before every subject)

```
A single object rendered in soft cinematic 3D, centred, floating slightly above
a dark surface. Matte materials with fine surface grain — brushed metal, matte
plastic, soft paper. One key light from the upper left at about 45 degrees,
producing a long soft shadow to the lower right, plus a faint cool rim light on
the upper-left edge. Background is a deep near-black navy (#070D1A), evenly lit,
with a subtle radial glow behind the object in the accent colour. Restrained,
premium, understated — a product photograph rather than an illustration.
Extremely clean, no clutter, generous empty space around the object, object
occupies about 45% of the frame height. Muted palette: near-black navy, cool
greys, off-white highlights, and exactly one accent colour used sparingly on a
single detail. No text, no numbers, no letters, no logos, no watermark, no
people, no hands. No glossy plastic reflections, no lens flare, no neon glow,
no busy background pattern. Shot on an 85mm lens, shallow depth of field,
subject fully in focus.

SUBJECT: <subject line>
ACCENT: <hex>
```

---

## The ten subjects

Replace `<subject line>` and `<hex>`.

| # | Product | SUBJECT | ACCENT |
|---|---------|---------|--------|
| 1 | Savings | a heavy circular bank-vault door, slightly ajar, warm light escaping the gap | `#35D6A4` |
| 2 | Mortgages | a small architectural model of a modern house on a plinth, one window lit | `#57C77E` |
| 3 | Personal loans | a single folded paper document with a crisp crease and a fountain pen resting across it | `#8B7BF0` |
| 4 | Personal insurance | a smooth metal shield standing upright, edge catching the light | `#4C86F5` |
| 5 | Deposits | a slim metal deposit slot in a wall with a card being received into it | `#35C7D6` |
| 6 | Foreign drafts | a matte globe on a stand, one thin arc rising from its surface | `#6FA8FF` |
| 7 | Interest checking | a stack of three cards fanned slightly, the top one raised | `#7FD4A0` |
| 8 | Telephone banking | a minimal desk handset resting on its cradle, cord curling once | `#A8B8D8` |
| 9 | Money market | four polished metal bars of increasing height standing in a row | `#E0B15C` |
| 10 | Small business | a small shopfront model with a striped awning and a single lit window | `#B98BF0` |

---

## Working notes

**Generate four of each and keep one.** Image models vary wildly run to run;
the fourth is often the keeper. Judge them side by side at thumbnail size, not
full size — that is where they will actually be seen.

**Reject any that:** put text or numbers anywhere; light the object from the
right or from the front; use more than one accent colour; fill the background
with pattern; or render the object glossy. Consistency of light direction is
the single thing that makes ten pictures look like one set — if a shadow falls
the wrong way, regenerate rather than accept it.

**If a subject keeps failing**, simplify the subject line rather than adding
adjectives. "A metal shield standing upright" beats a sentence describing the
bevels.

**If you want engraved line art instead** — the banknote look — swap the whole
style block for:

```
Fine-line engraving in the style of a banknote or share certificate. The
subject built entirely from thin parallel and cross-hatched lines of varying
weight, no solid fills, no shading gradients. Off-white lines on a deep
near-black navy background (#070D1A). Light implied from the upper left by
thinning the lines there and crowding them lower right. A faint guilloché
rosette pattern behind the subject in the accent colour. Centred, symmetrical,
generous margins. No text, no numbers, no logos, no people. Intricate but
legible when small.

SUBJECT: <subject line>
ACCENT: <hex>
```

Same ten subjects, same accents. This one is riskier — models often garble fine
line work — but when it lands it is unmistakably a bank.

---

## Handing them back

PNG or WebP, named by product key so they drop straight in:

```
savings.webp   mortgage.webp   personal-loan.webp   insurance.webp
deposits.webp  foreign-drafts.webp   interest-checking.webp
tele-banking.webp   money-market.webp   small-business.webp
```

They go in `/public/art/`, and `ProductArt` becomes an `<img>` — which is also
faster than what is there now, since the browser caches them instead of the
server re-sending the artwork inside every page.
