import { Handle, Position } from '@xyflow/react';

export default function TransformNode({ data }) {
  return (
    <div className={`transform-node ${data.filterDim ? 'filter-dim' : ''} ${data.transformHighlight ? 'transform-highlight' : ''}`}>
      <Handle type="target" position={Position.Top} id="t-top" className="handle" />
      <Handle type="target" position={Position.Left} id="t-left" className="handle" />
      <Handle type="target" position={Position.Right} id="t-right" className="handle" />
      <Handle type="target" position={Position.Bottom} id="t-bottom" className="handle" />
      <Handle type="source" position={Position.Top} id="s-top" className="handle" />
      <Handle type="source" position={Position.Left} id="s-left" className="handle" />
      <Handle type="source" position={Position.Right} id="s-right" className="handle" />
      <Handle type="source" position={Position.Bottom} id="s-bottom" className="handle" />
      <span>{data.label}</span>
    </div>
  );
}
