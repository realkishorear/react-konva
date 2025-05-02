import React, { useEffect, useRef, useState } from 'react';
import { Stage, Layer, Rect, Circle, Arrow, Transformer, Line } from 'react-konva';
import { v4 as uuidv4 } from 'uuid';
import { GiArrowCursor } from "react-icons/gi";
import { TbRectangle } from "react-icons/tb";
import { FaRegCircle } from "react-icons/fa";
import { IoMdDownload } from "react-icons/io";
import { MdOutlineTextsms } from "react-icons/md";

const ACTIONS = {
  SELECT: 'select',
  RECTANGLE: 'rectangle',
  CIRCLE: 'circle',
  CONNECT: 'connect',
  BUBBLE: 'bubble',
  BLOCK_ARROW: 'block_arrow',
};

const App = () => {
  const stageRef = useRef();
  const transformerRef = useRef();
  const isPainting = useRef(false);
  const currentShapeId = useRef(null);

  const [action, setAction] = useState(ACTIONS.SELECT);
  const [fillColor, setFillColor] = useState("#fff");
  const [rectangles, setRectangles] = useState([]);
  const [circles, setCircles] = useState([]);
  const [bubbles, setBubbles] = useState([]);
  const [blockArrows, setBlockArrows] = useState([]);
  const [connections, setConnections] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [dragLine, setDragLine] = useState(null);

  const isDraggable = action === ACTIONS.SELECT;

  const getSnapPoints = (shape) => {
    if (!shape) return [];

    const angle = (shape.rotation || 0) * Math.PI / 180;
    const rotatePoint = (x, y) => {
      const dx = x - shape.x;
      const dy = y - shape.y;
      return {
        x: shape.x + (dx * Math.cos(angle) - dy * Math.sin(angle)),
        y: shape.y + (dx * Math.sin(angle) + dy * Math.cos(angle)),
      };
    };

    if (shape.radius) {
      return [
        rotatePoint(shape.x, shape.y - shape.radius),
        rotatePoint(shape.x, shape.y + shape.radius),
        rotatePoint(shape.x - shape.radius, shape.y),
        rotatePoint(shape.x + shape.radius, shape.y),
      ].map((p, i) => ({
        ...p,
        side: ['top', 'bottom', 'left', 'right'][i],
        shapeId: shape.id,
      }));
    } else {
      const rawPoints = [
        { x: shape.x + shape.width / 2, y: shape.y, side: 'top' },
        { x: shape.x + shape.width / 2, y: shape.y + shape.height, side: 'bottom' },
        { x: shape.x, y: shape.y + shape.height / 2, side: 'left' },
        { x: shape.x + shape.width, y: shape.y + shape.height / 2, side: 'right' },
      ];
      return rawPoints.map(p => ({
        ...rotatePoint(p.x, p.y),
        side: p.side,
        shapeId: shape.id,
      }));
    }
  };

  const getAllSnapPoints = () => [...rectangles, ...circles, ...bubbles].flatMap(getSnapPoints);
  const getShapeById = (id) => [...rectangles, ...circles, ...bubbles].find(s => s.id === id);

  const getSidePosition = (shape, side) => {
    if (!shape) return { x: 0, y: 0 };
    const angle = (shape.rotation || 0) * Math.PI / 180;

    const rotatePoint = (x, y) => {
      const dx = x - shape.x;
      const dy = y - shape.y;
      return {
        x: shape.x + (dx * Math.cos(angle) - dy * Math.sin(angle)),
        y: shape.y + (dx * Math.sin(angle) + dy * Math.cos(angle)),
      };
    };

    if (shape.radius) {
      return {
        top: rotatePoint(shape.x, shape.y - shape.radius),
        bottom: rotatePoint(shape.x, shape.y + shape.radius),
        left: rotatePoint(shape.x - shape.radius, shape.y),
        right: rotatePoint(shape.x + shape.radius, shape.y),
      }[side];
    } else {
      const raw = {
        top: { x: shape.x + shape.width / 2, y: shape.y },
        bottom: { x: shape.x + shape.width / 2, y: shape.y + shape.height },
        left: { x: shape.x, y: shape.y + shape.height / 2 },
        right: { x: shape.x + shape.width, y: shape.y + shape.height / 2 },
      }[side];
      return rotatePoint(raw.x, raw.y);
    }
  };

  const handlePointerDown = () => {
    if (action === ACTIONS.SELECT) return;
    const stage = stageRef.current;
    const { x, y } = stage.getPointerPosition();
    const id = uuidv4();
    currentShapeId.current = id;
    isPainting.current = true;

    if (action === ACTIONS.RECTANGLE) {
      setRectangles(prev => [...prev, { id, x, y, width: 0, height: 0, fillColor }]);
    } else if (action === ACTIONS.CIRCLE) {
      setCircles(prev => [...prev, { id, x, y, radius: 0, fillColor }]);
    } else if (action === ACTIONS.BUBBLE) {
      setBubbles(prev => [...prev, {
        id, x, y, width: 0, height: 0, fillColor,
        tailDx: 30, tailDy: 30  // default tail offset
      }]);
    }
    else if (action === ACTIONS.BLOCK_ARROW) {
      setBlockArrows(prev => [...prev, {
        id,
        x, y,
        width: 0,
        height: 0,
        headWidthRatio: 0.4,
        shaftHeightRatio: 0.4,
        fillColor
      }]);
    }

  };

  const handlePointerMove = () => {
    if (!isPainting.current || action === ACTIONS.SELECT) return;
    const stage = stageRef.current;
    const { x, y } = stage.getPointerPosition();

    if (action === ACTIONS.RECTANGLE) {
      setRectangles(prev => prev.map(r => r.id === currentShapeId.current ? { ...r, width: x - r.x, height: y - r.y } : r));
    } else if (action === ACTIONS.CIRCLE) {
      setCircles(prev => prev.map(c => c.id === currentShapeId.current ? { ...c, radius: Math.hypot(x - c.x, y - c.y) } : c));
    } else if (action === ACTIONS.BUBBLE) {
      setBubbles(prev => prev.map(b => b.id === currentShapeId.current ? { ...b, width: x - b.x, height: y - b.y } : b));
    } else if (action === ACTIONS.BLOCK_ARROW) {
      setBlockArrows(prev => prev.map(b => b.id === currentShapeId.current ? {
        ...b,
        width: x - b.x,
        height: y - b.y,
      } : b));
    }

  };

  const handlePointerUp = () => {
    isPainting.current = false;
  };

  const handleSnapPointDown = (snap) => {
    setDragLine({ fromSnapPoint: snap, toPos: { x: snap.x, y: snap.y } });
  };

  const handleMouseMove = () => {
    if (!dragLine) return;
    const stage = stageRef.current;
    const pos = stage.getPointerPosition();
    setDragLine(prev => ({ ...prev, toPos: pos }));
  };

  const handleMouseUp = () => {
    if (!dragLine) return;
    const toSnap = getAllSnapPoints().find(p =>
      Math.hypot(p.x - dragLine.toPos.x, p.y - dragLine.toPos.y) < 10 &&
      !(p.shapeId === dragLine.fromSnapPoint.shapeId && p.side === dragLine.fromSnapPoint.side)
    );

    if (toSnap) {
      setConnections(prev => [...prev, {
        id: uuidv4(),
        from: dragLine.fromSnapPoint.shapeId,
        to: toSnap.shapeId,
        fromSide: dragLine.fromSnapPoint.side,
        toSide: toSnap.side,
      }]);
    }

    setDragLine(null);
  };

  const deleteSelected = () => {
    if (!selectedId) return;
    setRectangles(prev => prev.filter(r => r.id !== selectedId));
    setCircles(prev => prev.filter(c => c.id !== selectedId));
    setBubbles(prev => prev.filter(b => b.id !== selectedId));
    setConnections(prev => prev.filter(conn => conn.from !== selectedId && conn.to !== selectedId));
    setBlockArrows(prev => prev.filter(r => r.id !== selectedId));
    setSelectedId(null);
    transformerRef.current.nodes([]);
  };

  const handleExport = () => {
    const data = { rectangles, circles, bubbles, connections };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = 'canvas-data.json';
    link.href = url;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    const listener = (e) => (e.key === "Delete" || e.key === "Backspace") && deleteSelected();
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, [selectedId]);

  return (
    <div>
      <div className="absolute top-0 left-0 flex gap-2 p-2 bg-white z-10 shadow-md">
        <button onClick={() => setAction(ACTIONS.SELECT)} className={action === ACTIONS.SELECT ? 'bg-violet-300 p-1 rounded' : 'p-1'}>
          <GiArrowCursor size={24} />
        </button>
        <button onClick={() => setAction(ACTIONS.RECTANGLE)} className={action === ACTIONS.RECTANGLE ? 'bg-violet-300 p-1 rounded' : 'p-1'}>
          <TbRectangle size={24} />
        </button>
        <button onClick={() => setAction(ACTIONS.CIRCLE)} className={action === ACTIONS.CIRCLE ? 'bg-violet-300 p-1 rounded' : 'p-1'}>
          <FaRegCircle size={24} />
        </button>
        <button onClick={() => setAction(ACTIONS.BUBBLE)} className={action === ACTIONS.BUBBLE ? 'bg-violet-300 p-1 rounded' : 'p-1'}>
          <MdOutlineTextsms size={24} />
        </button>
        <button onClick={() => setAction(ACTIONS.CONNECT)} className={action === ACTIONS.CONNECT ? 'bg-green-300 p-1 rounded' : 'p-1'}>
          Connect
        </button>
        <button onClick={() => setAction(ACTIONS.BLOCK_ARROW)} className={action === ACTIONS.BLOCK_ARROW ? 'bg-violet-300 p-1 rounded' : 'p-1'}>
          Block Arrow
        </button>
        <input type="color" value={fillColor} onChange={(e) => setFillColor(e.target.value)} className="w-8 h-8" />
        <button onClick={handleExport}><IoMdDownload size={24} /></button>
      </div>

      <Stage
        ref={stageRef}
        width={window.innerWidth}
        height={window.innerHeight}
        onPointerDown={handlePointerDown}
        onPointerMove={(e) => { handlePointerMove(); handleMouseMove(e); }}
        onPointerUp={handlePointerUp}
        onMouseUp={handleMouseUp}
      >
        <Layer>
          <Rect
            x={0}
            y={0}
            width={window.innerWidth}
            height={window.innerHeight}
            fill="white"
            onClick={() => transformerRef.current.nodes([])}
          />
          {rectangles.map((r) => (
            <Rect
              key={r.id}
              x={r.x}
              y={r.y}
              width={r.width}
              height={r.height}
              fill={r.fillColor}
              stroke="black"
              strokeWidth={2}
              rotation={r.rotation || 0}
              draggable={isDraggable}
              onClick={(e) => {
                e.cancelBubble = true;
                setSelectedId(r.id);
                transformerRef.current.nodes([e.target]);
              }}
              onDragMove={(e) =>
                setRectangles(prev => prev.map(x => x.id === r.id ? { ...x, x: e.target.x(), y: e.target.y() } : x))
              }
              onTransformEnd={(e) => {
                const node = e.target;
                const scaleX = node.scaleX();
                const scaleY = node.scaleY();
                node.scaleX(1);
                node.scaleY(1);
                setRectangles(prev => prev.map(rect =>
                  rect.id === r.id
                    ? { ...rect, x: node.x(), y: node.y(), width: rect.width * scaleX, height: rect.height * scaleY, rotation: node.rotation() }
                    : rect));
              }}
            />
          ))}
          {circles.map((c) => (
            <Circle
              key={c.id}
              x={c.x}
              y={c.y}
              radius={c.radius}
              fill={c.fillColor}
              stroke="black"
              strokeWidth={2}
              rotation={c.rotation || 0}
              draggable={isDraggable}
              onClick={(e) => {
                e.cancelBubble = true;
                setSelectedId(c.id);
                transformerRef.current.nodes([e.target]);
              }}
              onDragMove={(e) =>
                setCircles(prev => prev.map(x => x.id === c.id ? { ...x, x: e.target.x(), y: e.target.y() } : x))
              }
              onTransformEnd={(e) => {
                const node = e.target;
                const scale = node.scaleX();
                node.scaleX(1);
                node.scaleY(1);
                setCircles(prev => prev.map(circle =>
                  circle.id === c.id
                    ? { ...circle, x: node.x(), y: node.y(), radius: circle.radius * scale, rotation: node.rotation() }
                    : circle));
              }}
            />
          ))}

          {bubbles.map((b) => {
            const tailX = b.tailDx;
            const tailY = b.height + b.tailDy;

            const points = [
              0, 0,
              b.width, 0,
              b.width, b.height,
              50, b.height,
              tailX, tailY,
              20, b.height,
              0, b.height
            ];

            return (
              <React.Fragment key={b.id}>
                <Line
                  x={b.x}
                  y={b.y}
                  points={points}
                  fill={b.fillColor}
                  stroke="black"
                  strokeWidth={2}
                  closed
                  rotation={b.rotation || 0}
                  draggable={isDraggable}
                  onClick={(e) => {
                    e.cancelBubble = true;
                    setSelectedId(b.id);
                    transformerRef.current.nodes([e.target]);
                  }}
                  onDragMove={(e) => {
                    const stage = stageRef.current;
                    const pos = e.target.getAbsolutePosition();

                    // Convert to local (unrotated) coordinates relative to bubble origin
                    const angle = -(b.rotation || 0) * Math.PI / 180;
                    const dx = pos.x - b.x;
                    const dy = pos.y - b.y;

                    const localX = Math.cos(angle) * dx - Math.sin(angle) * dy;
                    const localY = Math.sin(angle) * dx + Math.cos(angle) * dy;

                    const width = b.width;
                    const height = b.height;

                    let tailDx = 0;
                    let tailDy = 0;

                    const padding = 10; // Prevent overlap with corners

                    const topDist = Math.abs(localY);
                    const bottomDist = Math.abs(localY - height);
                    const leftDist = Math.abs(localX);
                    const rightDist = Math.abs(localX - width);

                    const minDist = Math.min(topDist, bottomDist, leftDist, rightDist);

                    if (minDist === topDist) {
                      tailDx = Math.min(width - padding, Math.max(padding, localX));
                      tailDy = 0;
                    } else if (minDist === bottomDist) {
                      tailDx = Math.min(width - padding, Math.max(padding, localX));
                      tailDy = height;
                    } else if (minDist === leftDist) {
                      tailDx = 0;
                      tailDy = Math.min(height - padding, Math.max(padding, localY));
                    } else if (minDist === rightDist) {
                      tailDx = width;
                      tailDy = Math.min(height - padding, Math.max(padding, localY));
                    }

                    setBubbles(prev =>
                      prev.map(bubble =>
                        bubble.id === b.id
                          ? { ...bubble, tailDx, tailDy }
                          : bubble
                      )
                    );
                  }}

                  onTransformEnd={(e) => {
                    const node = e.target;
                    const scaleX = node.scaleX();
                    const scaleY = node.scaleY();
                    node.scaleX(1);
                    node.scaleY(1);
                    setBubbles(prev => prev.map(bubble =>
                      bubble.id === b.id
                        ? {
                          ...bubble,
                          x: node.x(),
                          y: node.y(),
                          width: bubble.width * scaleX,
                          height: bubble.height * scaleY,
                          rotation: node.rotation(),
                          tailDx: bubble.tailDx * scaleX,
                          tailDy: bubble.tailDy * scaleY,
                        }
                        : bubble));
                  }}
                />

                {/* Yellow Dot for Tail Control */}
                {action === ACTIONS.SELECT && selectedId === b.id && (
                  <Circle
                    x={b.x + Math.cos((b.rotation || 0) * Math.PI / 180) * b.tailDx -
                      Math.sin((b.rotation || 0) * Math.PI / 180) * (b.tailDy + b.height)}
                    y={b.y + Math.sin((b.rotation || 0) * Math.PI / 180) * b.tailDx +
                      Math.cos((b.rotation || 0) * Math.PI / 180) * (b.tailDy + b.height)}
                    radius={6}
                    fill="yellow"
                    stroke="black"
                    strokeWidth={1}
                    draggable
                    onDragMove={(e) => {
                      const absX = e.target.x() - b.x;
                      const absY = e.target.y() - b.y;

                      const angle = -(b.rotation || 0) * Math.PI / 180;

                      const dx = Math.cos(angle) * absX - Math.sin(angle) * absY;
                      const dy = Math.sin(angle) * absX + Math.cos(angle) * absY;

                      setBubbles(prev => prev.map(bubble =>
                        bubble.id === b.id
                          ? {
                            ...bubble,
                            tailDx: dx,
                            tailDy: dy - bubble.height
                          }
                          : bubble
                      ));
                    }}
                  />

                )}
              </React.Fragment>
            );
          })}

          {action === ACTIONS.CONNECT && getAllSnapPoints().map((p, i) => (
            <Circle
              key={i}
              x={p.x}
              y={p.y}
              radius={5}
              fill="red"
              stroke="black"
              onMouseDown={() => handleSnapPointDown(p)}
            />
          ))}

          {blockArrows.map((b) => {
            const headW = Math.abs(b.width * b.headWidthRatio);
            const shaftH = Math.abs(b.height * b.shaftHeightRatio);
            const points = [
              0, shaftH / 2,
              b.width - headW, shaftH / 2,
              b.width - headW, 0,
              b.width, b.height / 2,
              b.width - headW, b.height,
              b.width - headW, b.height - shaftH / 2,
              0, b.height - shaftH / 2,
            ];

            return (
              <React.Fragment key={b.id}>
                <Line
                  x={b.x}
                  y={b.y}
                  points={points}
                  closed
                  fill={b.fillColor}
                  stroke="black"
                  strokeWidth={2}
                  rotation={b.rotation || 0}
                  draggable={isDraggable}
                  onClick={(e) => {
                    e.cancelBubble = true;
                    setSelectedId(b.id);
                    transformerRef.current.nodes([e.target]);
                  }}
                  onDragMove={(e) =>
                    setBlockArrows(prev => prev.map(x => x.id === b.id ? {
                      ...x, x: e.target.x(), y: e.target.y()
                    } : x))
                  }
                  onTransformEnd={(e) => {
                    const node = e.target;
                    const scaleX = node.scaleX();
                    const scaleY = node.scaleY();
                    node.scaleX(1);
                    node.scaleY(1);
                    setBlockArrows(prev => prev.map(arrow =>
                      arrow.id === b.id
                        ? {
                          ...arrow,
                          x: node.x(),
                          y: node.y(),
                          width: arrow.width * scaleX,
                          height: arrow.height * scaleY,
                          rotation: node.rotation()
                        }
                        : arrow));
                  }}
                />


                {/* Yellow Dots for customization */}
                {action === ACTIONS.SELECT && selectedId === b.id && (
                  <>
                    {/* Head width control (right upper corner of shaft before head starts) */}
                    <Circle
                      x={b.x + b.width - b.width * b.headWidthRatio}
                      y={b.y}
                      radius={6}
                      fill="yellow"
                      stroke="black"
                      draggable
                      onDragMove={(e) => {
                        const dx = b.width - (e.target.x() - b.x); // distance from right edge
                        const ratio = Math.max(0.1, Math.min(0.9, dx / b.width));
                        setBlockArrows(prev =>
                          prev.map(arrow =>
                            arrow.id === b.id
                              ? { ...arrow, headWidthRatio: ratio }
                              : arrow
                          )
                        );
                      }}
                    />

                    {/* Shaft height control (left vertical middle of shaft top edge) */}
                    <Circle
                      x={b.x}
                      y={b.y + (b.height - b.height * b.shaftHeightRatio) / 2}
                      radius={6}
                      fill="yellow"
                      stroke="black"
                      draggable
                      onDragMove={(e) => {
                        const dy = (e.target.y() - b.y) * 2; // vertical offset from top
                        const ratio = Math.max(0.1, Math.min(0.9, 1 - dy / b.height));
                        setBlockArrows(prev =>
                          prev.map(arrow =>
                            arrow.id === b.id
                              ? { ...arrow, shaftHeightRatio: ratio }
                              : arrow
                          )
                        );
                      }}
                    />
                  </>
                )}


              </React.Fragment>
            );
          })}

          <Transformer ref={transformerRef} rotateEnabled={true} />
        </Layer>
        <Layer>
          {connections.map((conn) => {
            const fromShape = getShapeById(conn.from);
            const toShape = getShapeById(conn.to);
            if (!fromShape || !toShape) return null;
            const from = getSidePosition(fromShape, conn.fromSide);
            const to = getSidePosition(toShape, conn.toSide);
            return (
              <Arrow
                key={conn.id}
                points={[from.x, from.y, to.x, to.y]}
                stroke="black"
                fill="black"
                strokeWidth={2}
                pointerLength={8}
                pointerWidth={8}
              />
            );
          })}
          {dragLine && (
            <Arrow
              points={[dragLine.fromSnapPoint.x, dragLine.fromSnapPoint.y, dragLine.toPos.x, dragLine.toPos.y]}
              stroke="gray"
              strokeWidth={2}
              dash={[4, 4]}
              pointerLength={6}
              pointerWidth={6}
            />
          )}
        </Layer>
      </Stage>
    </div>
  );
};

export default App;
