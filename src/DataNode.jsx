import { Handle, Position } from '@xyflow/react';

function TableauLogo() {
  return (
    <svg className="tableau-logo" width="20" height="20" viewBox="0 0 60 60" fill="none">
      <rect x="25" y="2" width="10" height="22" fill="#E8762D"/>
      <rect x="17" y="8" width="26" height="10" fill="#E8762D"/>
      <rect x="25" y="36" width="10" height="22" fill="#C72037"/>
      <rect x="17" y="42" width="26" height="10" fill="#C72037"/>
      <rect x="2" y="19" width="10" height="22" fill="#5B879B"/>
      <rect x="-6" y="25" width="26" height="10" fill="#5B879B"/>
      <rect x="48" y="19" width="10" height="22" fill="#5C6693"/>
      <rect x="40" y="25" width="26" height="10" fill="#5C6693"/>
      <rect x="25" y="19" width="10" height="22" fill="#1F457E"/>
      <rect x="17" y="25" width="26" height="10" fill="#1F457E"/>
    </svg>
  );
}

export default function DataNode({ data }) {
  const { label, grains, attrs, accent, dim, stacked, cat, tag, filterHighlight, filterDim } = data;

  const isTableau = cat === 'tableau';

  return (
    <div
      className={`data-node ${dim ? 'dim' : ''} ${stacked ? 'stacked' : ''} ${isTableau ? 'tableau' : ''} ${filterHighlight ? 'filter-highlight' : ''} ${filterDim ? 'filter-dim' : ''}`}
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
      {isTableau && (
        <div className="tableau-badge">
          <TableauLogo />
        </div>
      )}
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
      {attrs && attrs.length > 0 && (
        <div className="node-attrs">
          {attrs.map((a, i) => (
            <span key={a} className="attr">
              {i > 0 && <span className="sep"> · </span>}{a}
            </span>
          ))}
        </div>
      )}
      {tag && <div className="node-tag">{tag}</div>}
    </div>
  );
}
