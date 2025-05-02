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
  const [connections, setConnections] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [dragLine, setDragLine] = useState(null);

  const isDraggable = action === ACTIONS.SELECT;

  const getSnapPoints = (shape) => {
    if (!shape) return [];
    if (shape.radius) {
      return [
        { x: shape.x, y: shape.y - shape.radius, side: 'top', shapeId: shape.id },
        { x: shape.x, y: shape.y + shape.radius, side: 'bottom', shapeId: shape.id },
        { x: shape.x - shape.radius, y: shape.y, side: 'left', shapeId: shape.id },
        { x: shape.x + shape.radius, y: shape.y, side: 'right', shapeId: shape.id },
      ];
    } else {
      return [
        { x: shape.x + shape.width / 2, y: shape.y, side: 'top', shapeId: shape.id },
        { x: shape.x + shape.width / 2, y: shape.y + shape.height, side: 'bottom', shapeId: shape.id },
        { x: shape.x, y: shape.y + shape.height / 2, side: 'left', shapeId: shape.id },
        { x: shape.x + shape.width, y: shape.y + shape.height / 2, side: 'right', shapeId: shape.id },
      ];
    }
  };

  const getAllSnapPoints = () => [...rectangles, ...circles, ...bubbles].flatMap(getSnapPoints);

  const getShapeById = (id) => [...rectangles, ...circles, ...bubbles].find(s => s.id === id);

  const getSidePosition = (shape, side) => {
    if (!shape) return { x: 0, y: 0 };
    if (shape.radius) {
      const r = shape.radius;
      return {
        top: { x: shape.x, y: shape.y - r },
        bottom: { x: shape.x, y: shape.y + r },
        left: { x: shape.x - r, y: shape.y },
        right: { x: shape.x + r, y: shape.y },
      }[side];
    } else {
      return {
        top: { x: shape.x + shape.width / 2, y: shape.y },
        bottom: { x: shape.x + shape.width / 2, y: shape.y + shape.height },
        left: { x: shape.x, y: shape.y + shape.height / 2 },
        right: { x: shape.x + shape.width, y: shape.y + shape.height / 2 },
      }[side];
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
      setBubbles(prev => [...prev, { id, x, y, width: 0, height: 0, fillColor }]);
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
              draggable={isDraggable}
              onClick={(e) => {
                setSelectedId(r.id);
                transformerRef.current.nodes([e.target]);
              }}
              onDragMove={(e) =>
                setRectangles(prev => prev.map(x => x.id === r.id ? { ...x, x: e.target.x(), y: e.target.y() } : x))
              }
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
              draggable={isDraggable}
              onClick={(e) => {
                setSelectedId(c.id);
                transformerRef.current.nodes([e.target]);
              }}
              onDragMove={(e) =>
                setCircles(prev => prev.map(x => x.id === c.id ? { ...x, x: e.target.x(), y: e.target.y() } : x))
              }
            />
          ))}
          {bubbles.map((b) => (
            <Line
              key={b.id}
              x={b.x}
              y={b.y}
              points={[
                0, 0,
                b.width, 0,
                b.width, b.height,
                50, b.height,       
                30, b.height + 30,  
                20, b.height,       
                0, b.height,
              ]}
              fill={b.fillColor}
              stroke="black"
              strokeWidth={2}
              closed
              draggable={isDraggable}
              onClick={(e) => {
                setSelectedId(b.id);
                transformerRef.current.nodes([e.target]);
              }}
              onDragMove={(e) =>
                setBubbles(prev => prev.map(x => x.id === b.id ? { ...x, x: e.target.x(), y: e.target.y() } : x))
              }
            />
          ))}
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
          <Transformer ref={transformerRef} />
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
