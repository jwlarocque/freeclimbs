# Freeclimbs

Free and open source route book for home climbing and spray walls. 

## Roadmap

Launch:
- Move controls toggle inline with tabs, hide wall name on mobile
- Styling
    - Unify?
    - Buttons
- Add Wall Select (home page)
- Sets
    - Clone Set as draft
    - Edit existing (draft) Sets
- Sharing links
    - QR codes
- Sends, ratings, and climber grades
    - Additional route search filtering/sorting based on ratings
- More auth options (Google at minimum)
    - Fix reload-on-login
- User settings
    - Grading system (font/hueco/dankyu)
    - Username/nickname
- API rate limiting (just use nginx?)
- Global admin settings (e.g. disallow Wall creation)
- GDPR
    - Don't load fonts from Google
    - Don't load models from Hugging Face
- Moderation
    - Banned users (readonly-ify on backend)
- Bug fixes
    - Controls expand/collapse responsiveness
    - Empty set list has a page zero
    - Login redirect is broken
    - Weird bug when adding a hold to the editor on mobile?
    - When first set is created, set as current_set? (only if none exists?)
    - Are the certs working properly on birdthing?
    - Check behavior when no walls exist
    - Check routeviewer behavior when holds overlap

Up Next:
- More detailed new Set instructions (particularly for error correction step)
- CI
- Climber rating aggregation (not just mean)
    - https://www.evanmiller.org/ranking-items-with-star-ratings.html
    - pocketbase extension for write-time aggregation
- More login options
    - Populate automatically from pocketbase available
    - Username/password login (disabled in default config)
- Better updates on navigation, store route search params in URL

Planned:
- Svelte 5
- transformers.js v3 / WebGPU, batch segmentation
- Projector mode (use a projector to light holds directly on the wall)

Under Consideration:
- upgrade hold detection to yolov9 (https://github.com/WongKinYiu/YOLO/)
- client side hold detection?
- LED mode/client (most likely raspi + WS2812)
- Moderation
    - Shadowbans
    - Automod for text
    - Mod queue for images
