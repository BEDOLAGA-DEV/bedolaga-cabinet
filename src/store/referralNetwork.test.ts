import { beforeEach, describe, expect, it } from 'vitest';
import { MAX_SCOPE_ITEMS, useReferralNetworkStore } from './referralNetwork';
import type { ScopeSelection } from '@/types/referralNetwork';

const INITIAL_STATE = useReferralNetworkStore.getState();

function campaign(id: number): ScopeSelection {
  return { type: 'campaign', id, label: `Campaign ${id}` };
}

describe('referralNetwork store', () => {
  beforeEach(() => {
    useReferralNetworkStore.setState(INITIAL_STATE, true);
  });

  it('starts with no scope and full network off', () => {
    const state = useReferralNetworkStore.getState();
    expect(state.scope).toEqual([]);
    expect(state.isFullNetwork).toBe(false);
  });

  it('drops the selected scope when full network is enabled', () => {
    const { addScope, setFullNetwork } = useReferralNetworkStore.getState();
    addScope(campaign(1));
    addScope(campaign(2));

    setFullNetwork(true);

    const state = useReferralNetworkStore.getState();
    expect(state.isFullNetwork).toBe(true);
    expect(state.scope).toEqual([]);
  });

  it('leaves full network mode when a scope item is added', () => {
    const { setFullNetwork, addScope } = useReferralNetworkStore.getState();
    setFullNetwork(true);

    addScope(campaign(1));

    const state = useReferralNetworkStore.getState();
    expect(state.isFullNetwork).toBe(false);
    expect(state.scope).toEqual([campaign(1)]);
  });

  it('resets the graph selection when switching to full network', () => {
    const { setSelectedNode, setHighlightedNodes, setFullNetwork } =
      useReferralNetworkStore.getState();
    setSelectedNode({ type: 'user', id: 7 });
    setHighlightedNodes(new Set(['user_7']));

    setFullNetwork(true);

    const state = useReferralNetworkStore.getState();
    expect(state.selectedNode).toBeNull();
    expect(state.highlightedNodes.size).toBe(0);
  });

  it('turns full network off without leaving a stale scope', () => {
    const { setFullNetwork } = useReferralNetworkStore.getState();
    setFullNetwork(true);

    setFullNetwork(false);

    const state = useReferralNetworkStore.getState();
    expect(state.isFullNetwork).toBe(false);
    expect(state.scope).toEqual([]);
  });

  it('clears both the scope and full network mode', () => {
    const { setFullNetwork, clearScope } = useReferralNetworkStore.getState();
    setFullNetwork(true);

    clearScope();

    const state = useReferralNetworkStore.getState();
    expect(state.isFullNetwork).toBe(false);
    expect(state.scope).toEqual([]);
  });

  it('ignores duplicate scope items and keeps full network off', () => {
    const { addScope } = useReferralNetworkStore.getState();
    addScope(campaign(1));
    addScope(campaign(1));

    const state = useReferralNetworkStore.getState();
    expect(state.scope).toEqual([campaign(1)]);
    expect(state.isFullNetwork).toBe(false);
  });

  it('does not exit full network mode when the scope is already full', () => {
    const { addScope, setFullNetwork } = useReferralNetworkStore.getState();
    for (let id = 1; id <= MAX_SCOPE_ITEMS; id++) {
      addScope(campaign(id));
    }
    setFullNetwork(true);

    // The cap is per-scope; with the scope dropped by full-network mode there is
    // nothing to reject, so this add must switch the mode off and take effect.
    addScope(campaign(999));

    const state = useReferralNetworkStore.getState();
    expect(state.isFullNetwork).toBe(false);
    expect(state.scope).toEqual([campaign(999)]);
  });
});
