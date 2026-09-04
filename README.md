# CodeReplay

CodeReplay is a focused tutorial replay workspace. It turns a short sequence of commits into checkpoints you can inspect, edit, and verify instead of passively watching a video.

## Demo

1. Run `npm install`
2. Run `npm run dev`
3. Open the local URL shown by Vite.
4. Use **Load a public GitHub repo** to pull the latest four public commits from any repository. No GitHub token is required.
5. Select a checkpoint, choose **Practice**, edit the code, and choose **Check my code**.

The GitHub import intentionally keeps the demo safe and lightweight: commit metadata is live, while the starter snippets remain editable lesson fixtures until a server-side source mapper is added.

## Production notes

- No secrets are stored in the browser or repository.
- The app is a static Vite build and can be hosted on any static host.
- GitHub API errors and invalid URLs are shown inline.
- `npm run build` creates the deployable `dist/` directory.
