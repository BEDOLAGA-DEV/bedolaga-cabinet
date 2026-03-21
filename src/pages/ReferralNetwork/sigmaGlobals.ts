import type Sigma from 'sigma';

/**
 * We store the sigma instance on a module-level variable
 * so that controls can access it without prop drilling.
 */
let sigmaInstance: Sigma | null = null;

export function setSigmaInstance(sigma: Sigma | null): void {
  sigmaInstance = sigma;
}

export function getSigmaInstance(): Sigma | null {
  return sigmaInstance;
}
