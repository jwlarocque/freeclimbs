# Freeclimbs

Free and open source route book for home climbing and spray walls. 

## Roadmap

Launch:
- Styling
    - Unify?
    - Buttons
- Add Wall Select (home page)
- Store current Set and Route as URL params
- Sets
    - Clone + Edit as new Set
    - Edit existing (draft) Sets
    - Always show current Set at top of list
    - Thumbnails (?)
- Sharing links
    - QR codes
- Sends, ratings, and climber grades
- Filter and search Routes
- More auth options (Google at minimum)
- Set Creation Demo for unauthed users
- User settings
    - Grading system (font/hueco/dankyu)
- API rate limiting (just use nginx?)
- Global admin settings (e.g. disallow Wall creation)
- GDPR
    - Don't load fonts from Google
    - Don't load models from Hugging Face
- Moderation
    - Banned users (readonly-ify on backend)

Up Next:
- More detailed new Set instructions (particularly for error correction step)
- CI
- Climbing rating aggregation (not just mean)
- More login options (including username/password)

Planned:
- Svelte 5
- transformers.js v3 / WebGPU, batch segmentation
- Projector mode (use a projector to light holds directly on the wall)

Under Consideration:
- upgrade hold detection to yolov9
- client side hold detection?
- LED mode/client (most likely raspi + WS2812)
- Moderation
    - Shadowbans
    - Automod for text
    - Mod queue for images
