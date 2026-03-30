import { Handle, Position } from '@xyflow/react';

export default function TransformNode({ data }) {
  return (
    <div className="transform-node">
      <Handle type="target" position={Position.Top} className="handle" />
      <span>{data.label}</span>
      <Handle type="source" position={Position.Bottom} className="handle" />
    </div>
  );
}
