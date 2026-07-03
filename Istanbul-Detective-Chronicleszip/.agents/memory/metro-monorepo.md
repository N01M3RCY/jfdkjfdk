---
name: Metro monorepo setup
description: How to configure Metro bundler to resolve pnpm workspace packages in a monorepo
---

Metro's default config does not traverse symlinked workspace packages from `lib/`. Symptoms: "Unable to resolve './generated/api'" from within a symlinked package.

**Rule:** Always configure metro.config.js in the mobile artifact with:
```js
const workspaceRoot = path.resolve(projectRoot, '../..');
config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];
config.resolver.unstable_enableSymlinks = true;
```

**Why:** pnpm links workspace packages as symlinks in `artifacts/mobile/node_modules/@workspace/`. Metro resolves the symlink target (`lib/api-client-react`) but then can't find relative imports inside that directory unless `watchFolders` includes the workspace root.

**How to apply:** Any time a new workspace lib package is added as a mobile dependency, confirm this config exists.
