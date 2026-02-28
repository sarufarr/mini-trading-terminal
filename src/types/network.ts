/**
 * Network shape from Codex getNetworks. Shared by HomePage, NetworkList, NetworkPage.
 */
export interface Network {
  id: number;
  name: string;
}

export function isNetwork(x: unknown): x is Network {
  return (
    typeof x === 'object' &&
    x != null &&
    'id' in x &&
    typeof (x as Network).id === 'number' &&
    'name' in x &&
    typeof (x as Network).name === 'string'
  );
}
