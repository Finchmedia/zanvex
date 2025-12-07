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
              {isStart && (
                <div className="text-xs text-blue-500 font-medium mt-1">subject</div>
              )}
              {isEnd && (
                <div className="text-xs text-purple-500 font-medium mt-1">target</div>
              )}
            </div>
          ),
        },
        position: { x: i * 250, y: 100 },
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
        style: {
          width: 180,
          padding: 0,
        },
      });

      // Create edge to next node (in reversed order)
      if (i < reversedPath.length - 1) {
        const nextNode = reversedPath[i + 1];
        // Get the relation from the next node in the reversed path
        const edgeLabel = nextNode.relation || "";

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
                {isStart && (
                  <div className="text-xs text-blue-500 font-medium mt-1">subject</div>
                )}
                {isEnd && (
                  <div className="text-xs text-destructive font-medium mt-1">blocked</div>
                )}
              </div>
            ),
          },
          position: { x: i * 250, y: 100 },
          sourcePosition: Position.Right,
          targetPosition: Position.Left,
          style: {
            width: 180,
            padding: 0,
          },
        });

        // Create edge to next node
        if (i < reversedPath.length - 1) {
          const nextNode = reversedPath[i + 1];
          edges.push({
            id: `edge-${i}`,
            source: nodeId,
            target: `${nextNode.nodeType}:${nextNode.nodeId}`,
            label: nextNode.relation || "",
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
          });
        }
      });
    }
  }

  if (nodes.length === 0) {
    return (
      <div className="flex items-center justify-center h-[400px] text-muted-foreground">
        <p className="text-sm">No traversal path available</p>
      </div>
    );
  }

  return (
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
  );
}
