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
  if (moduleName === 'zustand/middleware') {
    return {
      filePath: path.resolve(monorepoRoot, 'node_modules/zustand/middleware.js'),
      type: 'sourceFile',
    };
  }
  if (moduleName === 'zustand') {
    return {
      filePath: path.resolve(monorepoRoot, 'node_modules/zustand/index.js'),
      type: 'sourceFile',
    };
  }
  if (moduleName === 'zustand/vanilla') {
    return {
      filePath: path.resolve(monorepoRoot, 'node_modules/zustand/vanilla.js'),
      type: 'sourceFile',
    };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
