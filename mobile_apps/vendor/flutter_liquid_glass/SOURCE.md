# liquid_glass_renderer (vendored)

- Upstream monorepo: https://github.com/whynotmake-it/flutter_liquid_glass
- Package: `packages/liquid_glass_renderer`
- Pinned version: **0.2.0-dev.4** (works with Flutter **3.44** / Dart 3.12)
- Why not 1.0-dev: requires Flutter ≥ **3.47** + Flutter GPU preview

GitHub full-repo clone was unreliable on this network; sources match the GitHub-published `0.2.0-dev.4` package archive. To refresh from GitHub later:

```bash
git clone https://github.com/whynotmake-it/flutter_liquid_glass.git
git -C flutter_liquid_glass checkout liquid_glass_renderer-v0.2.0-dev.4
```

Customer app depends via path:

`mobile_apps/customer_app` → `../vendor/flutter_liquid_glass/packages/liquid_glass_renderer`
