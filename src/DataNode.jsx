import { Handle, Position } from '@xyflow/react';

export default function DataNode({ data }) {
  const { label, grains, accent, dim, stacked, cat } = data;

  const isTableau = cat === 'tableau';

  return (
    <div
      className={`data-node ${dim ? 'dim' : ''} ${stacked ? 'stacked' : ''} ${isTableau ? 'tableau' : ''}`}
      style={{ borderLeftColor: accent }}
    >
      <Handle type="target" position={Position.Top} id="t-top" className="handle" />
      <Handle type="target" position={Position.Left} id="t-left" className="handle" />
      <Handle type="target" position={Position.Right} id="t-right" className="handle" />
      <Handle type="target" position={Position.Bottom} id="t-bottom" className="handle" />
      <Handle type="source" position={Position.Top} id="s-top" className="handle" />
      <Handle type="source" position={Position.Left} id="s-left" className="handle" />
      <Handle type="source" position={Position.Right} id="s-right" className="handle" />
      <Handle type="source" position={Position.Bottom} id="s-bottom" className="handle" />
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
    </div>
  );
}
