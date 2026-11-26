# Proposal: Animated world map video

- **Status:** Proposed
- **Date:** 26 November 2026
- **Owner:** Szilard

## Context

The world map (PR #53) is a signed-in feature on `/create` and `/account`. Each visited country is filled with its flat Noto flag, or shaded by days spent, and there's a Story or Feed image export. The map export's preview has no "Make it a video" offer, because there is no map video yet.

Paid videos (`docs/06-paid-videos.md`) are Remotion compositions: `year`, `stats` and `month`. The same components play in the export dialog's preview and render on Vercel Sandbox. They're sold as packs for a period at $2.99: the **year pack** is the year and stats videos, and the **month pack** is the month video, each in dark and light.

This proposes a fourth composition, `map`, and how to sell it.

## The video

1080×1920, 30 fps, about 10–13 seconds, the same length as the other videos ("up to 14 seconds" on `/videos`). Built from the same year data as the year video (`YearVideoData`), so it needs no new stored data.

| Time        | What happens                                                                                                                                                                                                                                                                                                                |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0–2.4 s     | Hook, as in the year video: "Where did 2026 take you?" The empty grey world fades in below it                                                                                                                                                                                                                               |
| 2.4 s–~7 s  | Countries fill in **in the order you first went there** (`YearVideoData.countries` already has that order). Each flag grows out of the country's centre over about 10 frames, with a short outline glow. Countries too small to see pop in as flag dots. A counter ticks up: "8 countries · 4% of the world · 3 continents" |
| ~7 s–~9.5 s | The camera eases in on the part of the world you visited (the same fit as the continent zoom), unless that's most of the world                                                                                                                                                                                              |
| last ~2 s   | End card, as in the other videos                                                                                                                                                                                                                                                                                            |

The fill time scales with the number of countries, about 8 frames each, kept between 1 and 5 seconds, like `fillLength` does for days.

## Which trips

**One year only.** A pack is for a period, and its updates are checked against the first video's days (the 80% rule), so an all-time video doesn't fit packs, updates or the price. The all-time map stays an image. A month map isn't worth a video: most months have one to three countries.

## How it's sold

| Option                                                                     | For                                                                                                                                                      | Against                                                                                                                                                                                                                                                                  |
| -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **A. Add it to the year pack, same $2.99** (year, stats and map; six MP4s) | Nothing new to choose at checkout. The pack gets better without a price change. The map preview can offer the year pack, which people already understand | Changes what the year pack contains, so the terms, `/videos`, the dialog, `/account`, the Polar product description and possibly the launch email need new copy. Packs bought before it ships have no map video (see below). Six sandboxes per year pack instead of four |
| **B. A separate map pack, $2.99** (map video, dark and light)              | Existing packs and their copy stay as they are                                                                                                           | A third product to choose between, a new Polar product, and many people will expect the map in the year pack. Two purchases for one year's videos                                                                                                                        |

**Recommendation: A.** It's the simpler offer, and the map is part of "your year".

### Packs bought before the map video

Packs from launch (paid and free) would have the year and stats videos only. Options:

1. **On request (recommended):** the pack on `/account` and in the dialog shows **Add your map video**. It renders only the map, from the same trips as the pack's newest version, adds it to that version, and doesn't use one of the 3 updates. Only people who come back pay the render cost.
2. **All at once:** a one-off admin run renders the map for every ready year pack. Everyone gets it, but it costs a render per pack, and has to be paced to stay under Sandbox's rate limit.
3. **Nothing:** they get the map with their next update. The simplest, but an update with no trip changes is refused (`unchanged`), so someone with no new trips can't get it.

## Building it

- **Composition:** `MapVideo` in `src/components/video/`, registered as `map` in `src/video-render/Root.tsx`. Add `'map'` to `VIDEO_KINDS` and to `VIDEO_PACKS.year`. `Root.test.tsx` already checks that the server's durations match the preview's.
- **Map drawing:** reuse #53's `getMapScene` (zoom box, dots for tiny countries) and the flat flags. Draw it as SVG like the map card, with each country's flag in a `<pattern>` and a growing circle clip per country.
- **Outlines:** the 50m world-atlas file (~750 KB) goes into the Remotion bundle, loaded once per render inside a `delayRender`. In the browser preview it's the same lazy chunk the map card uses.
- **Flags must be loaded before a frame is captured.** Remotion waits for its own `<Img>`, but not for images inside SVG patterns. So the composition decodes the visited countries' flat flags inside a `delayRender` before its first frame. The preview already fetches the waved flags ahead with Remotion's `prefetch` (`usePrefetchVideoImages`), and should do the same for the flat ones. `npm run video:bundle` already copies `public/emoji`, flat flags included.
- **Theme:** dark and light from `PALETTES`, with the land, outline and stroke colours from `MAP_COLOURS`.
- **Preview:** the dialog's Segmented gets a third option, **Your map**. The map export preview gets "Make it a video" back, opening the dialog on the map for that year. An all-time map export keeps no offer.
- **Copy:** `/videos` (the year pack and the video list), `/terms` (what a year pack contains; bump its date in `lib/page-updated.ts`), the dialog's pack description, `VideoOrderCard`, and the Polar year product's description. The launch email names the year and stats videos; if it has already gone out, leave it.
- **No new personal data:** the render reads the same days as the year and stats videos. `/privacy` and the record of processing don't change.

## Risks to check first

- **Render speed.** Every frame redraws about 240 detailed country outlines, with flag patterns, at 1080 wide. The year video renders in about 16 s on a 4 vCPU sandbox. If the map is much slower:
  - draw the grey world once as an image and only the visited countries as SVG, or
  - use the coarser 110m outlines for countries that aren't visited.
- **Flags on the first frames.** Check that no frame shows an empty country while its flag loads, locally and on Sandbox.
- **Bundle and snapshot.** The outlines add about 750 KB to the 37 MB bundle. Snapshots are made per bundle hash, so the first deploy after this makes a new one.

## Cost

- Rendering: about 0.6¢ per video today (2.4¢ for the 4 videos of a year pack), so roughly +1.2¢ per year pack, more if the map renders slower. To measure in the spike.
- Storage: about 1.3 MB per MP4 today (5.1 MB per year pack), so roughly +2.5 MB per year pack.

## Plan

1. **Spike:** `MapVideo` with the example year. Render it locally and on a Sandbox snapshot, and measure:
   - seconds per video and MP4 size
   - whether every flag shows from its first frame
2. **Build:**
   - the composition and timeline, with tests
   - the preview tab and the offer back in the map export preview
   - the pack change, behind its own switch so it can land before it's switched on
3. **Copy and Polar:** `/videos`, `/terms`, the dialog, `/account` and the Polar product description, switched on together.
4. **Existing packs:** Add your map video on `/account` and in the dialog (option 1 above).

## Open questions

1. Year pack at the same price (A, recommended) or a separate map pack (B)?
2. Ship it before the video launch, or after it? Recommended: after. Launch as planned, then add the map in the week after, while there's still time before the late-December peak.
3. Packs bought before it ships: on request (recommended), all at once, or with the next update?
4. Should signed-out visitors see **Your map** in the video preview? It sells the pack, and they sign in to buy anyway, but the map itself is a signed-in feature.
5. End on the visited region (zoomed in) or on the whole world?
