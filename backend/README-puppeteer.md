Puppeteer / Chromium notes

This backend image installs a system Chromium binary and sets the environment variable `PUPPETEER_EXECUTABLE_PATH` to `/usr/bin/chromium` so that Puppeteer can use the system browser to generate PDFs.

If you rebuild the Docker image, the Dockerfile installs `chromium` and exports `PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium`.

To rebuild the backend image locally:

```powershell
cd <repo-root>
docker compose build --no-cache backend
docker compose up -d backend
```

If you prefer a custom Chromium binary, set the `PUPPETEER_EXECUTABLE_PATH` env in your compose or container.
