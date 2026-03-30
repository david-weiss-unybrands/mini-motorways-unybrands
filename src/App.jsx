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
import { initialNodes, initialEdges, allGrains, categories } from './data';
import DataNode from './DataNode';
import TransformNode from './TransformNode';

const nodeTypes = {
  dataNode: DataNode,
  transformNode: TransformNode,
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

  const toggleGrain = useCallback((g) => {
    setSelectedGrains(prev =>
      prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g]
    );
  }, []);

  const filteredNodes = useMemo(() => {
    if (selectedGrains.length === 0) return nodes;
    return nodes.map(n => {
      if (n.type === 'transformNode') return { ...n, data: { ...n.data, filterDim: true } };
      const hasGrain = selectedGrains.every(g => n.data.grains?.includes(g));
      return { ...n, data: { ...n.data, filterHighlight: hasGrain, filterDim: !hasGrain } };
    });
  }, [nodes, selectedGrains]);

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
        {selectedGrains.length > 0 && (
          <button className="grain-pill clear" onClick={() => setSelectedGrains([])}>
            Clear
          </button>
        )}
      </div>
      <ReactFlow
        nodes={filteredNodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
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
