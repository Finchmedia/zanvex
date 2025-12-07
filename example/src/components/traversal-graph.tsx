import { useEffect, useState } from "react";
import {
  ReactFlow,
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  MarkerType,
  Position,
  type ColorMode,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

interface TraversalNode {
  nodeType: string;
  nodeId: string;
  displayName?: string;
  relation?: string;
  permission?: string;
  depth: number;
}

interface TriedPath {
  rulePart: string;
  failureReason: string;
  partialPath?: TraversalNode[];
}

interface PathResult {
  allowed: boolean;
  reason: string;
  matchedRule?: string;
  path?: TraversalNode[];
  triedPaths?: TriedPath[];
}

interface TraversalGraphProps {
  data: PathResult;
}

export function TraversalGraph({ data }: TraversalGraphProps) {
  const [colorMode, setColorMode] = useState<ColorMode>("dark");

  // Observe the dark class on document.documentElement
  useEffect(() => {
    // Set initial value
    const isDark = document.documentElement.classList.contains("dark");
    setColorMode(isDark ? "dark" : "light");

    // Watch for changes to the class attribute
    const observer = new MutationObserver(() => {
      const isDark = document.documentElement.classList.contains("dark");
      setColorMode(isDark ? "dark" : "light");
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  // Transform path into React Flow nodes and edges
  const nodeWidth = 180;
  const edgeSpacing = 100;
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  if (data.path && data.path.length > 0) {
    // Reverse the path so user is on the left and target object is on the right
    const reversedPath = [...data.path].reverse();

    // Create nodes from successful path
    reversedPath.forEach((node, i) => {
      const nodeId = `${node.nodeType}:${node.nodeId}`;
      const isStart = i === 0; // First node in reversed path (the user/subject)
      const isEnd = i === reversedPath.length - 1; // Last node (the target object)
      const hopNumber = !isStart && !isEnd ? i : null;

      nodes.push({
        id: nodeId,
        type: "default",
        data: {
          label: (
            <div className="px-4 py-2">
              <div className="font-semibold text-sm">{node.nodeType}</div>
              <div className="text-xs text-muted-foreground truncate max-w-[140px] mt-1">
                {node.displayName || node.nodeId}
              </div>
              <div className="text-xs font-medium mt-1" style={{ minHeight: "16px" }}>
                {isStart && <span className="text-blue-500">subject</span>}
                {isEnd && <span className="text-purple-500">target</span>}
                {hopNumber && (
                  <span className="text-muted-foreground">hop {hopNumber}</span>
                )}
              </div>
            </div>
          ),
        },
        position: { x: i * (nodeWidth + edgeSpacing), y: 50 },
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
        style: {
          width: nodeWidth,
          padding: 0,
        },
      });

      // Create edge to next node (in reversed order)
      if (i < reversedPath.length - 1) {
        const nextNode = reversedPath[i + 1];
        // Get the relation from the next node in the reversed path
        const edgeLabel = nextNode.relation || "";

        console.log(`Edge ${i}: ${nodeId} → ${nextNode.nodeType}:${nextNode.nodeId}, label: "${edgeLabel}"`);

        edges.push({
          id: `edge-${i}`,
          source: nodeId,
          target: `${nextNode.nodeType}:${nextNode.nodeId}`,
          label: edgeLabel,
          type: "smoothstep",
          animated: data.allowed,
          markerEnd: {
            type: MarkerType.ArrowClosed,
            width: 20,
            height: 20,
          },
          style: data.allowed ? undefined : {
            strokeDasharray: "5,5",
          },
          labelStyle: {
            fontSize: 12,
            fontWeight: 600,
            fill: "hsl(var(--foreground))",
          },
          labelBgStyle: {
            fill: "hsl(var(--background))",
            fillOpacity: 0.9,
          },
        });
      }
    });
  }

  // If no successful path but we have tried paths, visualize the first failed attempt
  if (
    (!data.path || data.path.length === 0) &&
    data.triedPaths &&
    data.triedPaths.length > 0
  ) {
    const firstTry = data.triedPaths[0];
    if (firstTry.partialPath && firstTry.partialPath.length > 0) {
      // Reverse the path so user is on the left
      const reversedPath = [...firstTry.partialPath].reverse();

      reversedPath.forEach((node, i) => {
        const nodeId = `${node.nodeType}:${node.nodeId}`;
        const isStart = i === 0;
        const isEnd = i === reversedPath.length - 1;
        const hopNumber = !isStart && !isEnd ? i : null;

        nodes.push({
          id: nodeId,
          type: "default",
          data: {
            label: (
              <div className="px-4 py-2">
                <div className="font-semibold text-sm">{node.nodeType}</div>
                <div className="text-xs text-muted-foreground truncate max-w-[140px] mt-1">
                  {node.displayName || node.nodeId}
                </div>
                <div className="text-xs font-medium mt-1" style={{ minHeight: "16px" }}>
                  {isStart && <span className="text-blue-500">subject</span>}
                  {isEnd && <span className="text-destructive">blocked</span>}
                  {hopNumber && (
                    <span className="text-muted-foreground">hop {hopNumber}</span>
                  )}
                </div>
              </div>
            ),
          },
          position: { x: i * (nodeWidth + edgeSpacing), y: 50 },
          sourcePosition: Position.Right,
          targetPosition: Position.Left,
          style: {
            width: nodeWidth,
            padding: 0,
          },
        });

        // Create edge to next node
        if (i < reversedPath.length - 1) {
          const nextNode = reversedPath[i + 1];
          const edgeLabel = nextNode.relation || "";

          console.log(`Failed path edge ${i}: ${nodeId} → ${nextNode.nodeType}:${nextNode.nodeId}, label: "${edgeLabel}"`);

          edges.push({
            id: `edge-${i}`,
            source: nodeId,
            target: `${nextNode.nodeType}:${nextNode.nodeId}`,
            label: edgeLabel,
            type: "smoothstep",
            animated: false,
            markerEnd: {
              type: MarkerType.ArrowClosed,
              width: 20,
              height: 20,
            },
            style: {
              strokeDasharray: "5,5",
            },
            labelStyle: {
              fontSize: 12,
              fontWeight: 600,
              fill: "hsl(var(--foreground))",
            },
            labelBgStyle: {
              fill: "hsl(var(--background))",
              fillOpacity: 0.9,
            },
          });
        }
      });
    }
  }

  // Generate human-readable traversal sentence
  const generateTraversalSentence = (): string | null => {
    if (!data.path || data.path.length === 0) return null;

    const reversedPath = [...data.path].reverse();
    const parts: string[] = [];

    reversedPath.forEach((node, i) => {
      parts.push(node.displayName || node.nodeId);
      if (i < reversedPath.length - 1) {
        const nextNode = reversedPath[i + 1];
        parts.push(nextNode.relation || "→");
      }
    });

    return parts.join(" → ");
  };

  const traversalSentence = generateTraversalSentence();

  if (nodes.length === 0) {
    return (
      <div className="flex items-center justify-center h-[400px] text-muted-foreground">
        <p className="text-sm">No traversal path available</p>
      </div>
    );
  }

  return (
    <>
      {traversalSentence && (
        <div className="mb-4 p-3 bg-muted/50 rounded-lg border">
          <p className="text-sm font-mono">
            <span className="font-semibold">Path: </span>
            {traversalSentence}
          </p>
          {data.matchedRule && (
            <p className="text-xs text-muted-foreground mt-1">
              Matched rule: <code className="bg-muted px-1 rounded">{data.matchedRule}</code>
            </p>
          )}
        </div>
      )}

      <div style={{ width: "100%", height: "400px" }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          fitView
          minZoom={0.5}
          maxZoom={1.5}
          colorMode={colorMode}
          attributionPosition="bottom-left"
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          edgesFocusable={false}
          nodesFocusable={false}
        >
          <Background />
          <Controls />
          <MiniMap
            nodeColor={(node) => {
              return "hsl(var(--primary))";
            }}
            maskColor="hsl(var(--background) / 0.8)"
          />
        </ReactFlow>
      </div>
    </>
  );
}
