import { Handle, Position } from '@xyflow/react';

export default function DataNode({ data }) {
  const { label, grains, accent, dim, stacked, cat } = data;

  const isTableau = cat === 'tableau';

  return (
    <div
      className={`data-node ${dim ? 'dim' : ''} ${stacked ? 'stacked' : ''} ${isTableau ? 'tableau' : ''}`}
      style={{ borderLeftColor: accent }}
    >
      <Handle type="target" position={Position.Top} className="handle" />
      <div className="node-name">{label}</div>
      {grains.length > 0 && (
        <div className="node-grains">
          {grains.map((g, i) => (
            <span key={g} className="grain">
              {i > 0 && <span className="sep"> · </span>}
              {g}
            </span>
          ))}
        </div>
      )}
      <Handle type="source" position={Position.Bottom} className="handle" />
    </div>
  );
}
