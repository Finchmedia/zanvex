import { useQuery } from "convex-helpers/react/cache";
import { api } from "@convex/_generated/api";
import { useCallback, useEffect, useMemo } from "react";
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
} from "reactflow";
import "reactflow/dist/style.css";
import dagre from "dagre";
import { Network } from "lucide-react";

// CSS to fix edge visibility
const graphStyles = `
  .react-flow__edge-path {
    stroke: hsl(var(--primary));
    stroke-width: 3;
  }
  .react-flow__edge .react-flow__edge-path {
    stroke: hsl(var(--primary)) !important;
  }
  .react-flow__edge text {
    fill: hsl(var(--foreground));
    font-size: 12px;
    font-weight: 600;
  }
`;
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// Dagre layout configuration
const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));

const nodeWidth = 180;
const nodeHeight = 80;

const getLayoutedElements = (nodes: Node[], edges: Edge[]) => {
  dagreGraph.setGraph({ rankdir: "TB", nodesep: 100, ranksep: 150 });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - nodeWidth / 2,
        y: nodeWithPosition.y - nodeHeight / 2,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
};

export function GraphPage() {
  const objectTypes = useQuery(api.app.listObjectTypes) ?? [];

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
        background: "hsl(var(--secondary))",
        border: "2px solid hsl(var(--border))",
        borderRadius: "8px",
        padding: 0,
        width: nodeWidth,
      },
    }));

    const edges: Edge[] = [];
    objectTypes.forEach((type) => {
      type.relations.forEach((relation) => {
        edges.push({
          id: `${type.name}-${relation.name}-${relation.targetType}`,
          source: type.name,
          target: relation.targetType,
          label: relation.name,
          type: "default",
          animated: false,
          markerEnd: {
            type: MarkerType.ArrowClosed,
            width: 20,
            height: 20,
            color: "hsl(var(--primary))",
          },
          style: {
            stroke: "hsl(var(--primary))",
            strokeWidth: 3,
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
      <style>{graphStyles}</style>
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
