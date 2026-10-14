<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Application conventions
- Keep the SaveTok interface at the index route with its design tokens and responsive styles in the global stylesheet, so the reference layout stays consistent.
- The download form posts to the download service (`services/download_api.py`): via the Vite `/api/dl` proxy in dev, or `VITE_DOWNLOAD_API_URL` in production (see `services/README.md`). Only report success after a file is actually returned.
