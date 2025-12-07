import { useEffect, useState } from "react";
import {
  ReactFlow,
  Node,
  Edge,
  Background,
  Controls,
  MarkerType,
  type ColorMode,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

interface TraversalNode {
  nodeType: string;
  nodeId: string;
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
    // Create nodes from successful path
    data.path.forEach((node, i) => {
      const nodeId = `${node.nodeType}:${node.nodeId}`;
      nodes.push({
        id: nodeId,
        type: "default",
        data: {
          label: (
            <div className="text-center px-2">
              <div className="font-semibold text-xs">{node.nodeType}</div>
              <div className="text-[10px] text-muted-foreground truncate max-w-[120px]">
                {node.nodeId}
              </div>
            </div>
          ),
        },
        position: { x: i * 200, y: 100 },
        style: {
          background: data.allowed
            ? "hsl(var(--green-500) / 0.1)"
            : "hsl(var(--destructive) / 0.1)",
          border: "2px solid",
          borderColor: data.allowed
            ? "hsl(var(--green-500))"
            : "hsl(var(--destructive))",
          padding: "10px",
          borderRadius: "8px",
          width: 140,
        },
      });

      // Create edge to next node
      if (i < data.path!.length - 1) {
        const nextNode = data.path![i + 1];
        edges.push({
          id: `edge-${i}`,
          source: nodeId,
          target: `${nextNode.nodeType}:${nextNode.nodeId}`,
          label: nextNode.relation || "",
          type: "smoothstep",
          animated: data.allowed,
          markerEnd: { type: MarkerType.ArrowClosed },
          style: {
            stroke: data.allowed
              ? "hsl(var(--green-500))"
              : "hsl(var(--destructive))",
            strokeWidth: 2,
          },
          labelStyle: {
            fontSize: 10,
            fontWeight: 600,
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
      firstTry.partialPath.forEach((node, i) => {
        const nodeId = `${node.nodeType}:${node.nodeId}`;
        nodes.push({
          id: nodeId,
          type: "default",
          data: {
            label: (
              <div className="text-center px-2">
                <div className="font-semibold text-xs">{node.nodeType}</div>
                <div className="text-[10px] text-muted-foreground truncate max-w-[120px]">
                  {node.nodeId}
                </div>
              </div>
            ),
          },
          position: { x: i * 200, y: 100 },
          style: {
            background: "hsl(var(--destructive) / 0.1)",
            border: "2px solid",
            borderColor: "hsl(var(--destructive))",
            padding: "10px",
            borderRadius: "8px",
            width: 140,
          },
        });

        // Create edge to next node
        if (i < firstTry.partialPath!.length - 1) {
          const nextNode = firstTry.partialPath![i + 1];
          edges.push({
            id: `edge-${i}`,
            source: nodeId,
            target: `${nextNode.nodeType}:${nextNode.nodeId}`,
            label: nextNode.relation || "",
            type: "smoothstep",
            animated: false,
            markerEnd: { type: MarkerType.ArrowClosed },
            style: {
              stroke: "hsl(var(--destructive))",
              strokeWidth: 2,
              strokeDasharray: "5,5",
            },
            labelStyle: {
              fontSize: 10,
              fontWeight: 600,
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
      >
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  );
}
