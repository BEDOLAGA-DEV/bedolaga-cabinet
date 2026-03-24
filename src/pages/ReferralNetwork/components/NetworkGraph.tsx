import { useEffect, useRef, useCallback } from 'react';
import Graph from 'graphology';
import Sigma from 'sigma';
import FA2LayoutSupervisor from 'graphology-layout-forceatlas2/worker';
import { inferSettings } from 'graphology-layout-forceatlas2';
import { useReferralNetworkStore } from '@/store/referralNetwork';
import type { NetworkGraphData, NetworkFilters } from '@/types/referralNetwork';
import { createNodeBorderProgram } from '@sigma/node-border';
import {
  getNodeFillColor,
  getNodeBorderColor,
  getUserNodeSize,
  getCampaignColor,
  NODE_COLORS,
} from '../utils';
import { setSigmaInstance } from '../sigmaGlobals';

interface NetworkGraphProps {
  data: NetworkGraphData;
  className?: string;
}

/**
 * Compute initial positions using radial layout based on referral depth.
 * Campaign nodes at center, direct users in first ring, their referrals further out.
 */
function computeRadialPositions(
  graphData: NetworkGraphData,
): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>();

  // Build adjacency: referrer_id -> [user_ids]
  const childrenOf = new Map<number, number[]>();
  const userMap = new Map<number, (typeof graphData.users)[0]>();
  for (const user of graphData.users) {
    userMap.set(user.id, user);
    if (user.referrer_id !== null) {
      const children = childrenOf.get(user.referrer_id) ?? [];
      children.push(user.id);
      childrenOf.set(user.referrer_id, children);
    }
  }

  // Place campaign nodes at center
  const campaignCount = graphData.campaigns.length;
  graphData.campaigns.forEach((campaign, i) => {
    const angle = (2 * Math.PI * i) / Math.max(campaignCount, 1);
    positions.set(`campaign_${campaign.id}`, {
      x: Math.cos(angle) * 5,
      y: Math.sin(angle) * 5,
    });
  });

  // BFS from campaign users outward
  const placed = new Set<number>();
  const queue: Array<{ userId: number; depth: number; parentAngle: number }> = [];

  // Seed: campaign users at depth 1
  const campaignUserIds = new Set(
    graphData.users.filter((u) => u.campaign_id !== null).map((u) => u.id),
  );
  const campaignUsers = [...campaignUserIds];
  campaignUsers.forEach((userId, i) => {
    const angle = (2 * Math.PI * i) / Math.max(campaignUsers.length, 1);
    const radius = 30 + Math.random() * 10;
    positions.set(`user_${userId}`, {
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
    });
    placed.add(userId);
    queue.push({ userId, depth: 1, parentAngle: angle });
  });

  // Also seed root referrers (users who refer others but have no referrer and no campaign)
  for (const user of graphData.users) {
    if (
      !placed.has(user.id) &&
      user.referrer_id === null &&
      (childrenOf.get(user.id)?.length ?? 0) > 0
    ) {
      const angle = Math.random() * 2 * Math.PI;
      const radius = 20 + Math.random() * 10;
      positions.set(`user_${user.id}`, {
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
      });
      placed.add(user.id);
      queue.push({ userId: user.id, depth: 1, parentAngle: angle });
    }
  }

  // BFS: place children at increasing radius
  while (queue.length > 0) {
    const { userId, depth, parentAngle } = queue.shift()!;
    const children = childrenOf.get(userId) ?? [];
    const childCount = children.length;
    if (childCount === 0) continue;

    const spreadAngle = Math.min(Math.PI / 2, (Math.PI / 3) * (1 / Math.max(depth, 1)));

    children.forEach((childId, i) => {
      if (placed.has(childId)) return;
      const offset = childCount === 1 ? 0 : (i / (childCount - 1) - 0.5) * spreadAngle;
      const angle = parentAngle + offset + (Math.random() - 0.5) * 0.1;
      const radius = 30 + depth * 25 + Math.random() * 10;
      positions.set(`user_${childId}`, {
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
      });
      placed.add(childId);
      queue.push({ userId: childId, depth: depth + 1, parentAngle: angle });
    });
  }

  // Place remaining unplaced users at the outer edge
  for (const user of graphData.users) {
    if (!placed.has(user.id)) {
      const angle = Math.random() * 2 * Math.PI;
      const radius = 60 + Math.random() * 40;
      positions.set(`user_${user.id}`, {
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
      });
    }
  }

  return positions;
}

const BorderedNodeProgram = createNodeBorderProgram({
  borders: [
    {
      size: { attribute: 'borderSize', defaultValue: 0 },
      color: { attribute: 'borderColor' },
    },
    {
      size: { fill: true },
      color: { attribute: 'color' },
    },
  ],
});

function buildFullGraph(graphData: NetworkGraphData): Graph {
  const graph = new Graph();
  const positions = computeRadialPositions(graphData);

  graphData.campaigns.forEach((campaign, index) => {
    const pos = positions.get(`campaign_${campaign.id}`) ?? {
      x: Math.random() * 100,
      y: Math.random() * 100,
    };
    graph.addNode(`campaign_${campaign.id}`, {
      label: campaign.name,
      x: pos.x,
      y: pos.y,
      size: 16,
      color: getCampaignColor(index),
      type: 'bordered',
      nodeType: 'campaign',
      nodeId: campaign.id,
      borderSize: 0,
      borderColor: getCampaignColor(index),
    });
  });

  graphData.users.forEach((user) => {
    const fillColor = getNodeFillColor(
      user.subscription_status,
      user.direct_referrals,
      user.is_partner,
    );
    const borderColor = getNodeBorderColor(user.direct_referrals, user.is_partner);
    const size = getUserNodeSize(user.direct_referrals);
    const pos = positions.get(`user_${user.id}`) ?? {
      x: Math.random() * 100,
      y: Math.random() * 100,
    };

    graph.addNode(`user_${user.id}`, {
      label: user.display_name,
      x: pos.x,
      y: pos.y,
      size,
      color: fillColor,
      type: 'bordered',
      nodeType: 'user',
      nodeId: user.id,
      isPartner: user.is_partner,
      directReferrals: user.direct_referrals,
      campaignId: user.campaign_id,
      subscriptionStatus: user.subscription_status,
      borderColor: borderColor ?? fillColor,
      borderSize: borderColor ? 0.35 : 0,
    });
  });

  graphData.edges.forEach((edge) => {
    if (graph.hasNode(edge.source) && graph.hasNode(edge.target)) {
      const edgeKey = `${edge.source}->${edge.target}`;
      if (!graph.hasEdge(edgeKey)) {
        graph.addEdgeWithKey(edgeKey, edge.source, edge.target, {
          color:
            edge.type === 'partner_campaign'
              ? 'rgba(255, 138, 101, 0.5)'
              : edge.type === 'campaign'
                ? 'rgba(255, 255, 255, 0.06)'
                : 'rgba(255,255,255,0.03)',
          size: edge.type === 'partner_campaign' ? 1.5 : 0.3,
          edgeType: edge.type,
        });
      }
    }
  });

  return graph;
}

function computeHiddenNodes(graph: Graph, filters: NetworkFilters): Set<string> {
  const hidden = new Set<string>();
  const filterCampaignSet = new Set(filters.campaigns);
  const hasCampaignFilter = filterCampaignSet.size > 0;

  graph.forEachNode((node, attrs) => {
    if (attrs.nodeType === 'user') {
      if (filters.partnersOnly && !attrs.isPartner) {
        hidden.add(node);
      } else if ((attrs.directReferrals ?? 0) < filters.minReferrals) {
        hidden.add(node);
      } else if (
        hasCampaignFilter &&
        attrs.campaignId !== null &&
        !filterCampaignSet.has(attrs.campaignId)
      ) {
        hidden.add(node);
      }
    } else if (attrs.nodeType === 'campaign') {
      if (hasCampaignFilter && !filterCampaignSet.has(attrs.nodeId)) {
        hidden.add(node);
      }
    }
  });

  return hidden;
}

const FA2_DURATION_MS = 3000;

function clampOutlierPositions(graph: Graph): void {
  const xs: number[] = [];
  const ys: number[] = [];

  graph.forEachNode((_, attrs) => {
    xs.push(attrs.x as number);
    ys.push(attrs.y as number);
  });

  if (xs.length < 2) return;

  const meanX = xs.reduce((a, b) => a + b, 0) / xs.length;
  const meanY = ys.reduce((a, b) => a + b, 0) / ys.length;

  const stdX = Math.sqrt(xs.reduce((sum, x) => sum + (x - meanX) ** 2, 0) / xs.length) || 1;
  const stdY = Math.sqrt(ys.reduce((sum, y) => sum + (y - meanY) ** 2, 0) / ys.length) || 1;

  const MAX_STD = 3;
  const minX = meanX - MAX_STD * stdX;
  const maxX = meanX + MAX_STD * stdX;
  const minY = meanY - MAX_STD * stdY;
  const maxY = meanY + MAX_STD * stdY;

  graph.forEachNode((node, attrs) => {
    const x = attrs.x as number;
    const y = attrs.y as number;
    const clampedX = Math.max(minX, Math.min(maxX, x));
    const clampedY = Math.max(minY, Math.min(maxY, y));

    if (clampedX !== x || clampedY !== y) {
      graph.setNodeAttribute(node, 'x', clampedX);
      graph.setNodeAttribute(node, 'y', clampedY);
    }
  });
}

export function NetworkGraph({ data, className }: NetworkGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sigmaRef = useRef<Sigma | null>(null);
  const graphRef = useRef<Graph | null>(null);
  const hiddenNodesRef = useRef<Set<string>>(new Set());
  const fa2Ref = useRef<FA2LayoutSupervisor | null>(null);
  const fa2TimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setSelectedNode = useReferralNetworkStore((s) => s.setSelectedNode);
  const setHoveredNode = useReferralNetworkStore((s) => s.setHoveredNode);
  const setHighlightedNodes = useReferralNetworkStore((s) => s.setHighlightedNodes);
  const hoveredNodeId = useReferralNetworkStore((s) => s.hoveredNodeId);
  const highlightedNodes = useReferralNetworkStore((s) => s.highlightedNodes);
  const filters = useReferralNetworkStore((s) => s.filters);

  const killFA2 = useCallback(() => {
    if (fa2TimerRef.current !== null) {
      clearTimeout(fa2TimerRef.current);
      fa2TimerRef.current = null;
    }
    if (fa2Ref.current) {
      fa2Ref.current.kill();
      fa2Ref.current = null;
    }
  }, []);

  useEffect(() => {
    if (!containerRef.current || !data) return;

    const container = containerRef.current;
    let rafId: number;
    let cancelled = false;

    function tryInit() {
      if (cancelled || !container.isConnected) return;
      if (container.offsetWidth === 0 || container.offsetHeight === 0) {
        rafId = requestAnimationFrame(tryInit);
        return;
      }

      killFA2();
      if (sigmaRef.current) {
        sigmaRef.current.kill();
        sigmaRef.current = null;
      }

      const graph = buildFullGraph(data);
      graphRef.current = graph;

      const initialFilters = useReferralNetworkStore.getState().filters;
      hiddenNodesRef.current = computeHiddenNodes(graph, initialFilters);

      const sigma = new Sigma(graph, container, {
        renderEdgeLabels: false,
        labelDensity: 0.12,
        labelRenderedSizeThreshold: 14,
        zIndex: true,
        defaultEdgeColor: '#ffffff06',
        defaultNodeColor: NODE_COLORS.regular,
        nodeProgramClasses: { bordered: BorderedNodeProgram },
        defaultNodeType: 'bordered',
        labelColor: { attribute: 'labelColor', color: '#e5e7eb' },
        labelFont: 'Inter, system-ui, sans-serif',
        labelSize: 11,
        stagePadding: 40,
        nodeReducer: (node, attrs) => {
          const res = { ...attrs };

          if (hiddenNodesRef.current.has(node)) {
            res.hidden = true;
            return res;
          }

          const store = useReferralNetworkStore.getState();
          const hovered = store.hoveredNodeId;
          const highlighted = store.highlightedNodes;

          if (highlighted.size > 0) {
            if (highlighted.has(node)) {
              res.highlighted = true;
              res.labelColor = '#111827';
              res.zIndex = 2;
            } else {
              res.color = `${attrs.color}33`;
              res.label = '';
              res.zIndex = 0;
            }
          }

          if (hovered) {
            if (node === hovered) {
              res.highlighted = true;
              res.labelColor = '#111827';
              res.zIndex = 2;
            } else if (graph.hasNode(hovered) && graph.areNeighbors(node, hovered)) {
              res.highlighted = true;
              res.labelColor = '#111827';
              res.zIndex = 1;
            } else if (!highlighted.has(node)) {
              res.color = `${attrs.color}33`;
              res.label = '';
              res.zIndex = 0;
            }
          }

          return res;
        },
        edgeReducer: (edge, attrs) => {
          const res = { ...attrs };

          const [source, target] = graph.extremities(edge);
          if (hiddenNodesRef.current.has(source) || hiddenNodesRef.current.has(target)) {
            res.hidden = true;
            return res;
          }

          const store = useReferralNetworkStore.getState();
          const hovered = store.hoveredNodeId;
          const highlighted = store.highlightedNodes;

          if (hovered && graph.hasNode(hovered)) {
            if (!graph.hasExtremity(edge, hovered)) {
              res.hidden = true;
            } else {
              res.color = '#ffffff30';
              res.size = 1;
            }
          } else if (highlighted.size > 0) {
            if (!highlighted.has(source) && !highlighted.has(target)) {
              res.hidden = true;
            }
          }

          return res;
        },
      });

      sigmaRef.current = sigma;
      setSigmaInstance(sigma);

      if (graph.order > 0) {
        const inferred = inferSettings(graph);
        const supervisor = new FA2LayoutSupervisor(graph, {
          settings: {
            ...inferred,
            linLogMode: true,
            adjustSizes: true,
            barnesHutOptimize: graph.order > 100,
            gravity: 0.05,
            scalingRatio: 10,
            slowDown: 5,
            strongGravityMode: false,
          },
        });
        fa2Ref.current = supervisor;
        supervisor.start();

        fa2TimerRef.current = setTimeout(() => {
          if (fa2Ref.current === supervisor) {
            supervisor.kill();
            fa2Ref.current = null;
          }
          fa2TimerRef.current = null;

          if (graphRef.current) {
            clampOutlierPositions(graphRef.current);
          }

          if (sigmaRef.current) {
            sigmaRef.current.resize();
            sigmaRef.current.getCamera().animatedReset({ duration: 400 });
          }
        }, FA2_DURATION_MS);
      }

      sigma.on('clickNode', ({ node }) => {
        const attrs = graph.getNodeAttributes(node);
        const nodeType = attrs.nodeType;
        const nodeId = attrs.nodeId;

        if (typeof nodeId !== 'number') return;

        if (nodeType === 'user') {
          setSelectedNode({ type: 'user', id: nodeId });
        } else if (nodeType === 'campaign') {
          setSelectedNode({ type: 'campaign', id: nodeId });
        }
      });

      sigma.on('clickStage', () => {
        setSelectedNode(null);
      });

      sigma.on('enterNode', ({ node }) => {
        setHoveredNode(node);
        if (containerRef.current) {
          containerRef.current.style.cursor = 'pointer';
        }
      });

      sigma.on('leaveNode', () => {
        setHoveredNode(null);
        if (containerRef.current) {
          containerRef.current.style.cursor = 'default';
        }
      });
    }

    rafId = requestAnimationFrame(tryInit);

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
      killFA2();
      if (sigmaRef.current) {
        sigmaRef.current.kill();
        sigmaRef.current = null;
      }
      graphRef.current = null;
      setSigmaInstance(null);

      setHoveredNode(null);
      setHighlightedNodes(new Set());
    };
  }, [data, setSelectedNode, setHoveredNode, setHighlightedNodes, killFA2]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver(() => {
      if (sigmaRef.current) {
        sigmaRef.current.resize();
      }
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!graphRef.current || !sigmaRef.current) return;
    hiddenNodesRef.current = computeHiddenNodes(graphRef.current, filters);
    sigmaRef.current.refresh();
  }, [filters]);

  useEffect(() => {
    if (sigmaRef.current) {
      sigmaRef.current.refresh();
    }
  }, [hoveredNodeId, highlightedNodes]);

  return <div ref={containerRef} className={`bg-[#0a0a0f] ${className ?? ''}`} />;
}
