import { useState, useCallback, useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import './styles.css';
import { initialNodes, initialEdges, allGrains, transformIds } from './data';
import DataNode from './DataNode';
import TransformNode from './TransformNode';
import OffsetEdge from './OffsetEdge';

const nodeTypes = {
  dataNode: DataNode,
  transformNode: TransformNode,
};

const edgeTypes = {
  offsetEdge: OffsetEdge,
};

const defaultEdgeOptions = {
  style: { stroke: '#d1d5db', strokeWidth: 1.5 },
  markerEnd: {
    type: 'arrowclosed',
    color: '#d1d5db',
    width: 10,
    height: 10,
  },
};

export default function App() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedGrains, setSelectedGrains] = useState([]);
  const [showTransforms, setShowTransforms] = useState(false);

  const toggleGrain = useCallback((g) => {
    setSelectedGrains(prev =>
      prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g]
    );
  }, []);

  // Compute which nodes sit on a transform path (source → transform → target)
  const transformPathNodeIds = useMemo(() => {
    if (!showTransforms) return null;
    const ids = new Set();
    edges.forEach(e => {
      if (transformIds.has(e.source) || transformIds.has(e.target)) {
        ids.add(e.source);
        ids.add(e.target);
      }
    });
    return ids;
  }, [edges, showTransforms]);

  const filteredNodes = useMemo(() => {
    let result = nodes;

    if (selectedGrains.length > 0) {
      result = result.map(n => {
        if (n.type === 'transformNode') return { ...n, data: { ...n.data, filterDim: true } };
        const hasGrain = selectedGrains.every(g => n.data.grains?.includes(g));
        return { ...n, data: { ...n.data, filterHighlight: hasGrain, filterDim: !hasGrain } };
      });
    }

    if (transformPathNodeIds) {
      result = result.map(n => {
        const onPath = transformPathNodeIds.has(n.id);
        return {
          ...n,
          data: {
            ...n.data,
            transformHighlight: onPath && n.type === 'transformNode',
            filterDim: n.data?.filterDim || !onPath,
            filterHighlight: n.data?.filterHighlight || (onPath && n.type !== 'transformNode'),
          },
        };
      });
    }

    return result;
  }, [nodes, selectedGrains, transformPathNodeIds]);

  const filteredEdges = useMemo(() => {
    if (!transformPathNodeIds) return edges;
    return edges.map(e => {
      const isLookup = e.data?.lookup;
      const onPath = transformIds.has(e.source) || transformIds.has(e.target);
      if (onPath && isLookup) {
        return { ...e, style: { stroke: '#d97706', strokeWidth: 2, strokeDasharray: '4 3' }, markerEnd: { type: 'arrowclosed', color: '#d97706', width: 8, height: 8 } };
      }
      return onPath
        ? { ...e, style: { stroke: '#6366f1', strokeWidth: 2 }, markerEnd: { type: 'arrowclosed', color: '#6366f1', width: 10, height: 10 } }
        : { ...e, style: { ...e.style, opacity: 0.15 } };
    });
  }, [edges, transformPathNodeIds]);

  const copyLayout = useCallback(() => {
    const positions = {};
    nodes.forEach(n => { positions[n.id] = { x: Math.round(n.position.x), y: Math.round(n.position.y) }; });
    navigator.clipboard.writeText(JSON.stringify(positions, null, 2));
    alert('Layout copied to clipboard');
  }, [nodes]);

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#f4f5f7' }}>
      <div className="grain-filter-bar">
        <span className="grain-filter-label">Filter by grain:</span>
        {allGrains.map(g => (
          <button
            key={g}
            className={`grain-pill ${selectedGrains.includes(g) ? 'active' : ''}`}
            onClick={() => toggleGrain(g)}
          >
            {g}
          </button>
        ))}
        {(selectedGrains.length > 0 || showTransforms) && (
          <button className="grain-pill clear" onClick={() => { setSelectedGrains([]); setShowTransforms(false); }}>
            Clear
          </button>
        )}
        <span className="filter-divider" />
        <button
          className={`grain-pill transform-toggle ${showTransforms ? 'active' : ''}`}
          onClick={() => setShowTransforms(v => !v)}
        >
          Show Transforms
        </button>
        <span className="filter-divider" />
        <button className="grain-pill" onClick={copyLayout}>
          Copy Layout
        </button>
      </div>
      <ReactFlow
        nodes={filteredNodes}
        edges={filteredEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        fitView
        fitViewOptions={{ padding: 0.15 }}
        minZoom={0.2}
        maxZoom={3}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#e2e4e9" gap={24} size={1} />
        <Controls showInteractive={false} />
        <MiniMap
          nodeStrokeWidth={2}
          nodeColor={(n) => {
            if (n.type === 'transformNode') return '#e5e7eb';
            return n.data?.accent || '#94a3b8';
          }}
          maskColor="rgba(244, 245, 247, 0.7)"
          style={{ borderRadius: 8, border: '1px solid #e5e7eb' }}
        />
      </ReactFlow>
    </div>
  );
}
