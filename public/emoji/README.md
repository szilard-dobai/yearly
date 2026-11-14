# Emoji images

The flags and emoji that Yearly draws, from [googlefonts/noto-emoji](https://github.com/googlefonts/noto-emoji) at commit [`99701e07d3d1fe1bdbcdb14964547f0fd592966f`](https://github.com/googlefonts/noto-emoji/tree/99701e07d3d1fe1bdbcdb14964547f0fd592966f).

- Flags come from `third_party/region-flags/waved-svg/`. The flag designs are in the public domain.
- Other emoji come from `2D/svg/`.

Colours adjusted: every colour went through the equivalent of CSS `filter: saturate(0.82) contrast(0.92) brightness(1.02)`. Flags are cropped to one shared box. Everything is saved as lossless WebP in two sizes.

The images are used under the Apache License, Version 2.0, in [LICENSE](LICENSE).

Rebuild with `npm run emoji:build` (`scripts/build-emoji-images.mts`).
