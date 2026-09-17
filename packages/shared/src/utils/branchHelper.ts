import { Shop } from '../types';

/**
 * Helpers to identify and sort LPU branches first across the application.
 */

export const isLpuBranch = (shop: any): boolean => {
  if (!shop) return false;
  if (shop.name && /jalandhar/i.test(shop.name)) return false;
  if (shop.name && /agi/i.test(shop.name)) return false;
  const nameMatch = Boolean(shop.name && /lpu/i.test(shop.name));
  const idMatch = Boolean(shop._id && (/lpu/i.test(shop._id) || shop._id === '6a9731d114b3522fed5d8893'));
  const branchMatch = Array.isArray(shop.branches) && shop.branches.some((b: string) => /lpu|lawgate|green valley|mehru/i.test(b));
  const addressMatch = Boolean(shop.address && /lpu/i.test(shop.address));
  return nameMatch || idMatch || branchMatch || addressMatch;
};

export const sortShopsWithLpuFirst = <T = Shop>(shops: T[] = []): T[] => {
  if (!Array.isArray(shops)) return [];
  return [...shops].sort((a, b) => {
    const aIsLpu = isLpuBranch(a);
    const bIsLpu = isLpuBranch(b);
    if (aIsLpu && !bIsLpu) return -1;
    if (!aIsLpu && bIsLpu) return 1;
    return 0;
  });
};

export const sortBranchesWithLpuFirst = (branches: string[] = []): string[] => {
  if (!Array.isArray(branches)) return [];
  return [...branches].sort((a, b) => {
    const aIsLpu = /lpu|lawgate/i.test(a);
    const bIsLpu = /lpu|lawgate/i.test(b);
    if (aIsLpu && !bIsLpu) return -1;
    if (!aIsLpu && bIsLpu) return 1;
    return 0;
  });
};
