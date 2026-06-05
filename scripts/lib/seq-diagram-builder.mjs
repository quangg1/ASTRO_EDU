/**
 * Build draw.io UML sequence diagrams (medium–high granularity).
 * Supports: messages, self-calls, alt/opt combined fragments.
 */

const LIFELINE_STYLE =
  'shape=umlLifeline;perimeter=lifelinePerimeter;whiteSpace=wrap;html=1;container=1;collapsible=0;recursiveResize=0;outlineConnect=0;portConstraint=eastwest;size=40;';
const ACTOR_STYLE =
  'shape=umlActor;verticalLabelPosition=bottom;verticalAlign=top;html=1;outlineConnect=0;fontSize=12;fontStyle=1;';
const TITLE_STYLE =
  'text;html=1;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;fontSize=14;fontStyle=1;fontColor=#1a1a2e;';
const FRAME_STYLE =
  'shape=umlFrame;whiteSpace=wrap;html=1;container=0;collapsible=0;recursiveResize=0;outlineConnect=0;fillColor=none;strokeColor=#666666;';
const GUARD_STYLE =
  'text;html=1;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;fontSize=10;fontStyle=2;fontColor=#333333;';
const SEP_STYLE =
  'endArrow=none;html=1;strokeWidth=1;strokeColor=#999999;';

const STEP_H = 46;
const SELF_H = 40;
const FRAME_TOP = 30;
const GUARD_H = 22;
const FRAME_BOTTOM = 18;
const ACTOR_X = 40;
const LIFELINE_TOP = 88;
const START_Y = 200;

export function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function layoutNodes(nodes, y) {
  const laid = [];
  for (const node of nodes) {
    if (node.kind === 'msg' || node.kind === 'self') {
      laid.push({ ...node, y });
      y += node.kind === 'self' ? SELF_H : STEP_H;
    } else if (node.kind === 'opt' || node.kind === 'alt') {
      const frameY = y;
      y += FRAME_TOP;
      const operands = [];
      for (const op of node.operands) {
        const guardY = y;
        y += GUARD_H;
        const { items, endY } = layoutNodes(op.steps, y);
        operands.push({ guard: op.guard, guardY, items });
        y = endY;
      }
      y += FRAME_BOTTOM;
      laid.push({
        kind: node.kind,
        label: node.label || node.kind,
        frameY,
        frameH: y - frameY,
        operands,
      });
    }
  }
  return { items: laid, endY: y };
}

function buildDiagram(def) {
  const spacing = def.spacing ?? 155;
  const actorLabel = def.actor ?? 'User';
  const parts = def.participants.map((p) =>
    typeof p === 'string' ? { id: p.replace(/\W+/g, '_').toLowerCase(), label: p } : p,
  );

  const { items, endY } = layoutNodes(def.flow, START_Y);
  const lastX = ACTOR_X + 90 + parts.length * spacing;
  const pageW = Math.max(980, lastX + 120);
  const pageH = Math.max(800, endY + 100);

  const cells = [];
  let cid = 2;

  const nextId = () => `c${cid++}`;

  cells.push(
    `<mxCell id="${nextId()}" parent="1" style="${TITLE_STYLE}" value="${esc(def.title)}" vertex="1"><mxGeometry x="40" y="20" width="${pageW - 80}" height="32" as="geometry"/></mxCell>`,
  );

  cells.push(
    `<mxCell id="actor" parent="1" style="${ACTOR_STYLE}" value="${esc(actorLabel)}" vertex="1"><mxGeometry x="${ACTOR_X}" y="${LIFELINE_TOP}" width="30" height="60" as="geometry"/></mxCell>`,
  );

  const xMap = { actor: ACTOR_X + 15 };
  parts.forEach((p, i) => {
    const x = ACTOR_X + 90 + i * spacing;
    xMap[p.id] = x;
    const llH = pageH - LIFELINE_TOP - 30;
    cells.push(
      `<mxCell id="ll_${p.id}" parent="1" style="${LIFELINE_STYLE}" value="${esc(p.label)}" vertex="1"><mxGeometry x="${x - 50}" y="${LIFELINE_TOP - 12}" width="110" height="${llH}" as="geometry"/></mxCell>`,
    );
  });

  const frameL = ACTOR_X - 10;
  const frameR = lastX + 40;

  const xOf = (who) => {
    if (who === 'actor') return xMap.actor;
    if (typeof who === 'number') return xMap[parts[who].id];
    return xMap[who] ?? xMap.actor;
  };

  const addMsg = (from, to, label, y, dashed = false) => {
    const x1 = xOf(from);
    const x2 = xOf(to);
    const arrow = dashed ? 'endArrow=open;endFill=0;' : 'endArrow=block;endFill=1;';
    const dash = dashed ? 'dashed=1;' : '';
    const id = nextId();
    cells.push(
      `<mxCell id="${id}" parent="1" value="${esc(label)}" style="${arrow}html=1;${dash}fontSize=10;verticalAlign=bottom;" edge="1"><mxGeometry relative="1" as="geometry"><mxPoint x="${x1}" y="${y}" as="sourcePoint"/><mxPoint x="${x2}" y="${y}" as="targetPoint"/></mxGeometry></mxCell>`,
    );
  };

  const addSelf = (who, label, y, dashed = false) => {
    const x = xOf(who);
    const arrow = dashed ? 'endArrow=open;endFill=0;' : 'endArrow=block;endFill=1;';
    const dash = dashed ? 'dashed=1;' : '';
    const id = nextId();
    cells.push(
      `<mxCell id="${id}" parent="1" value="${esc(label)}" style="${arrow}html=1;${dash}fontSize=10;edgeStyle=orthogonalEdgeStyle;rounded=0;" edge="1"><mxGeometry relative="1" as="geometry"><mxPoint x="${x + 8}" y="${y}" as="sourcePoint"/><mxPoint x="${x + 48}" y="${y}" as="targetPoint"/><Array as="points"><mxPoint x="${x + 48}" y="${y - 14}"/><mxPoint x="${x + 8}" y="${y - 14}"/></Array></mxGeometry></mxCell>`,
    );
  };

  const renderLaid = (laid) => {
    for (const node of laid) {
      if (node.kind === 'msg') {
        addMsg(node.from, node.to, node.label, node.y, node.dashed);
      } else if (node.kind === 'self') {
        addSelf(node.who, node.label, node.y, node.dashed);
      } else if (node.kind === 'alt' || node.kind === 'opt') {
        const fid = nextId();
        const fw = frameR - frameL;
        const kindLabel = node.kind === 'opt' ? 'opt' : 'alt';
        cells.push(
          `<mxCell id="${fid}" parent="1" value="${kindLabel}" style="${FRAME_STYLE}" vertex="1"><mxGeometry x="${frameL}" y="${node.frameY}" width="${fw}" height="${node.frameH}" as="geometry"/></mxCell>`,
        );
        node.operands.forEach((op, idx) => {
          const gid = nextId();
          cells.push(
            `<mxCell id="${gid}" parent="1" style="${GUARD_STYLE}" value="${esc(op.guard)}" vertex="1"><mxGeometry x="${frameL + 8}" y="${op.guardY - 4}" width="${fw - 16}" height="18" as="geometry"/></mxCell>`,
          );
          if (idx > 0) {
            const sid = nextId();
            cells.push(
              `<mxCell id="${sid}" parent="1" style="${SEP_STYLE}" edge="1"><mxGeometry relative="1" as="geometry"><mxPoint x="${frameL}" y="${op.guardY - 10}" as="sourcePoint"/><mxPoint x="${frameR}" y="${op.guardY - 10}" as="targetPoint"/></mxGeometry></mxCell>`,
            );
          }
          renderLaid(op.items);
        });
      }
    }
  };

  renderLaid(items);

  const note = def.note ?? `Cosmo Learn — ${def.title}`;
  cells.push(
    `<mxCell id="${nextId()}" parent="1" style="text;html=1;strokeColor=#999;fillColor=#f5f5f5;align=left;verticalAlign=top;fontSize=9;fontColor=#666;rounded=1;" value="${esc(note)}" vertex="1"><mxGeometry x="40" y="${pageH - 44}" width="${pageW - 80}" height="32" as="geometry"/></mxCell>`,
  );

  return `<?xml version="1.0" encoding="UTF-8"?>
<mxfile host="app.diagrams.net" modified="${new Date().toISOString()}" agent="generate-seq-diagrams.mjs" version="22.1.0" type="device">
  <diagram id="${esc(def.file)}" name="${esc(def.title)}">
    <mxGraphModel dx="1400" dy="900" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="${pageW}" pageHeight="${pageH}" math="0" shadow="0">
      <root>
        <mxCell id="0"/>
        <mxCell id="1" parent="0"/>
        ${cells.join('\n        ')}
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>
`;
}

export function buildSeqDrawio(def) {
  return buildDiagram(def);
}
