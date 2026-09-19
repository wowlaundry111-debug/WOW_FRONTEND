const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [
  monorepoRoot,
  path.resolve(monorepoRoot, 'packages/shared'),
];

config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

config.resolver.extraNodeModules = {
  '@wow/shared': path.resolve(monorepoRoot, 'packages/shared/src'),
};

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web') {
    const zustandDir = path.resolve(projectRoot, 'node_modules/zustand');
    const fallbackDir = path.resolve(monorepoRoot, 'node_modules/zustand');
    const baseDir = require('fs').existsSync(zustandDir) ? zustandDir : fallbackDir;

    if (moduleName === 'zustand/middleware') {
      return {
        filePath: path.resolve(baseDir, 'middleware.js'),
        type: 'sourceFile',
      };
    }
    if (moduleName === 'zustand') {
      return {
        filePath: path.resolve(baseDir, 'index.js'),
        type: 'sourceFile',
      };
    }
    if (moduleName === 'zustand/vanilla') {
      return {
        filePath: path.resolve(baseDir, 'vanilla.js'),
        type: 'sourceFile',
      };
    }
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
