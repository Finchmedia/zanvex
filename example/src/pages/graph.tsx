import { useQuery } from "convex-helpers/react/cache";
import { api } from "@convex/_generated/api";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ReactFlow,
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  MarkerType,
  type ColorMode,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { tree, hierarchy } from "d3-hierarchy";
import { Network } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const nodeWidth = 180;
const nodeHeight = 80;

const getLayoutedElements = (nodes: Node[], edges: Edge[]) => {
  // Build hierarchy tree from nodes and edges
  const nodeMap = new Map(nodes.map(n => [n.id, { ...n, children: [] }]));

  // Build parent-child relationships from edges
  edges.forEach(edge => {
    const parent = nodeMap.get(edge.source);
    const child = nodeMap.get(edge.target);
    if (parent && child) {
      parent.children.push(child);
    }
  });

  // Find root node (node with no incoming edges)
  const targetIds = new Set(edges.map(e => e.target));
  const rootNode = nodes.find(n => !targetIds.has(n.id));

  if (!rootNode) return { nodes, edges };

  // Create hierarchy
  const root = hierarchy(nodeMap.get(rootNode.id));

  // Create tree layout
  const treeLayout = tree()
    .nodeSize([nodeWidth + 100, nodeHeight + 150]); // horizontal and vertical spacing

  // Apply layout
  treeLayout(root);

  // Convert back to React Flow nodes with positions
  const layoutedNodes = nodes.map(node => {
    const treeNode = root.descendants().find(d => d.data.id === node.id);
    if (!treeNode) return node;

    return {
      ...node,
      position: {
        x: treeNode.x,
        y: treeNode.y,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
};

export function GraphPage() {
  const objectTypes = useQuery(api.app.listObjectTypes) ?? [];
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

  // Generate nodes and edges from object types
  const { initialNodes, initialEdges } = useMemo(() => {
    const nodes: Node[] = objectTypes.map((type) => ({
      id: type.name,
      type: "default",
      data: {
        label: (
          <div className="px-4 py-2">
            <div className="font-semibold text-sm">{type.name}</div>
            {type.description && (
              <div className="text-xs text-muted-foreground mt-1">
                {type.description}
              </div>
            )}
            {type.relations.length > 0 && (
              <div className="text-xs text-muted-foreground mt-1">
                {type.relations.length} relation{type.relations.length !== 1 ? "s" : ""}
              </div>
            )}
          </div>
        ),
      },
      position: { x: 0, y: 0 },
      style: {
        width: nodeWidth,
        padding: 0,
      },
    }));

    const edges: Edge[] = [];
    objectTypes.forEach((type) => {
      type.relations.forEach((relation) => {
        edges.push({
          id: `${type.name}-${relation.name}-${relation.targetType}`,
          source: relation.targetType,
          target: type.name,
          label: relation.name,
          type: "smoothstep",
          animated: false,
          markerEnd: {
            type: MarkerType.ArrowClosed,
            width: 20,
            height: 20,
          },
        });
      });
    });

    return { initialNodes: nodes, initialEdges: edges };
  }, [objectTypes]);

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // Apply layout when object types change
  useEffect(() => {
    if (initialNodes.length > 0) {
      const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
        initialNodes,
        initialEdges
      );
      setNodes(layoutedNodes);
      setEdges(layoutedEdges);
    }
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  return (
    <div className="space-y-8">
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Network className="size-5" />
          <h2 className="text-xl font-semibold">Graph Visualization</h2>
          <span className="text-muted-foreground text-sm">
            (Schema and permission graph)
          </span>
        </div>

        {objectTypes.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>No Object Types</CardTitle>
              <CardDescription>
                Define object types first to see the graph visualization
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Go to the Object Types page and initialize or create object types
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Schema Graph</CardTitle>
              <CardDescription>
                Visual representation of object types and their relations
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div style={{ width: "100%", height: "600px" }}>
                <ReactFlow
                  nodes={nodes}
                  edges={edges}
                  onNodesChange={onNodesChange}
                  onEdgesChange={onEdgesChange}
                  fitView
                  attributionPosition="bottom-left"
                  colorMode={colorMode}
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
            </CardContent>
          </Card>
        )}

        {/* Legend */}
        {objectTypes.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Legend</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-secondary border-2 border-border"></div>
                  <span>Object Type Node</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-0.5 bg-primary"></div>
                  <span>Relation Edge (labeled with relation name)</span>
                </div>
                <div className="text-xs text-muted-foreground mt-2">
                  <strong>Example:</strong> An edge labeled "owner" from "resource" to
                  "org" means a resource has an "owner" relation that points to an org
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  );
}
