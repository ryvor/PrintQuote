# Publishing PrintQuote releases

Releases are published automatically when a `vX.Y.Z` tag is pushed. **Do not create a release with untested code.**

## One-time setup

1. In GitHub repository Settings → Actions → General, enable GitHub Actions and allow workflows to create releases (workflow has `contents: write`).
2. Ensure GitHub Packages permissions allow publishing to GHCR. The workflow uses the built-in `GITHUB_TOKEN`; no personal access token is required.
3. Make the `Release` branch the stable branch and enable branch protection requiring the CI check before merging.
4. Choose and add an explicit `LICENSE` file. This project currently has no licence; the owner must decide which terms to use.
5. Consider setting the GHCR packages to public if you want unauthenticated Docker pulls.

## For each version

1. Merge tested changes into `Release`.
2. Update the version in **both** `package.json` and `server/package.json`.
3. Add a `## [X.Y.Z]` entry to `CHANGELOG.md`; update README and ROADMAP.
4. Run `npm install`, `npm test`, `npm run build` and `npm run check:release` locally.
5. Commit changes and push. Wait for the **CI** workflow to pass on `Release`.
6. Create and push a tag at that exact commit:

```sh
git checkout Release
git pull --ff-only
git tag -a v2.4.2 -m "PrintQuote v2.4.2"
git push origin v2.4.2
```

The tag triggers **Publish release**, which reruns CI, builds the two Docker images, pushes `ghcr.io/ryvor/printquote-web:vX.Y.Z` and `ghcr.io/ryvor/printquote-api:vX.Y.Z`, creates ZIP and tar.gz source archives, and publishes a GitHub Release with notes extracted from the matching changelog entry. `latest` also points to the most recently tagged version; pin versions for production.

**Do not push the same version tag twice.** To correct a released version, publish a new patch version instead. If publication fails, inspect Actions logs before taking action; a partially published image or release may already exist.

## Install prebuilt Docker images

```sh
sudo mkdir -p /opt/PrintQuote/data /opt/PrintQuote/releases
printf 'PRINTQUOTE_VERSION=v2.4.2\n' >> .env
docker compose -f docker-compose.release.yml pull
docker compose -f docker-compose.release.yml up -d
```

Keep `/opt/PrintQuote/data` persistent and backed up. The image deployment path is separate from the in-app local-release updater, which still requires its host-side runner and trusted release directories. Avoid running both automated deployment mechanisms against the same installation.

## Limits

CI verifies compilation and packaging, **not** complete application correctness. End-to-end authentication, pricing, inventory and upgrade tests should be added before a stable 3.0 release.
