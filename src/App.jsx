import React, { useEffect, useRef, useState } from 'react';
import { Stage, Layer, Rect, Circle, Line, Arrow, Transformer } from 'react-konva';
import { v4 as uuidv4 } from 'uuid';
import { GiArrowCursor } from "react-icons/gi";
import { TbRectangle } from "react-icons/tb";
import { FaRegCircle } from "react-icons/fa";
import { LuPencil } from "react-icons/lu";
import { IoMdDownload } from "react-icons/io";

const ACTIONS = {
  SELECT: 'select',
  RECTANGLE: 'rectangle',
  CIRCLE: 'circle',
  SCRIBBLE: 'scribble',
  CONNECT: 'connect'
};

const App = () => {
  const stageRef = useRef();
  const transformerRef = useRef();

  const [action, setAction] = useState(ACTIONS.SELECT);
  const [fillColor, setFillColor] = useState("#fff");
  const [rectangles, setRectangles] = useState([]);
  const [circles, setCircles] = useState([]);
  const [scribbles, setScribbles] = useState([]);
  const [connections, setConnections] = useState([]);

  const isPainting = useRef(false);
  const currentShapeId = useRef(null);
  const selectedForConnection = useRef([]);
  const [selectedId, setSelectedId] = useState(null);

  const isDraggable = action === ACTIONS.SELECT;

  const getSnapPoints = (shape) => {
    if (!shape) return [];

    if (shape.radius) {
      return [
        { x: shape.x, y: shape.y - shape.radius, side: 'top' },
        { x: shape.x, y: shape.y + shape.radius, side: 'bottom' },
        { x: shape.x - shape.radius, y: shape.y, side: 'left' },
        { x: shape.x + shape.radius, y: shape.y, side: 'right' }
      ];
    } else {
      return [
        { x: shape.x + shape.width / 2, y: shape.y, side: 'top' },
        { x: shape.x + shape.width / 2, y: shape.y + shape.height, side: 'bottom' },
        { x: shape.x, y: shape.y + shape.height / 2, side: 'left' },
        { x: shape.x + shape.width, y: shape.y + shape.height / 2, side: 'right' }
      ];
    }
  };

  const showSnapPoints = action === ACTIONS.CONNECT;

  const getSnapPointsWithShape = () => {
    return [...rectangles, ...circles].flatMap(shape => {
      const points = getSnapPoints(shape);
      return points.map(p => ({ ...p, shapeId: shape.id }));
    });
  };


  const getClosestSnapPoints = (fromShape, toShape) => {
    const fromPoints = getSnapPoints(fromShape);
    const toPoints = getSnapPoints(toShape);

    let minDistance = Infinity;
    let closest = { from: fromPoints[0], to: toPoints[0] };

    fromPoints.forEach(fp => {
      toPoints.forEach(tp => {
        const dist = Math.hypot(tp.x - fp.x, tp.y - fp.y);
        if (dist < minDistance) {
          minDistance = dist;
          closest = { from: fp, to: tp };
        }
      });
    });

    return {
      from: closest.from,
      to: closest.to
    };
  };

  const onPointerDown = (e) => {
    if (action === ACTIONS.SELECT) return;

    const stage = stageRef.current;
    const { x, y } = stage.getPointerPosition();
    const id = uuidv4();
    currentShapeId.current = id;
    isPainting.current = true;

    switch (action) {
      case ACTIONS.RECTANGLE:
        setRectangles(prev => [...prev, { id, x, y, width: 0, height: 0, fillColor }]);
        break;
      case ACTIONS.CIRCLE:
        setCircles(prev => [...prev, { id, x, y, radius: 0, fillColor }]);
        break;
      case ACTIONS.SCRIBBLE:
        setScribbles(prev => [...prev, { id, points: [x, y], fillColor }]);
        break;
    }
  };

  const onPointerMove = () => {
    if (!isPainting.current || action === ACTIONS.SELECT) return;

    const stage = stageRef.current;
    const { x, y } = stage.getPointerPosition();

    switch (action) {
      case ACTIONS.RECTANGLE:
        setRectangles(prev => prev.map(r => r.id === currentShapeId.current ? { ...r, width: x - r.x, height: y - r.y } : r));
        break;
      case ACTIONS.CIRCLE:
        setCircles(prev => prev.map(c => c.id === currentShapeId.current ? { ...c, radius: Math.sqrt((x - c.x) ** 2 + (y - c.y) ** 2) } : c));
        break;
      case ACTIONS.SCRIBBLE:
        setScribbles(prev => prev.map(s => s.id === currentShapeId.current ? { ...s, points: [...s.points, x, y] } : s));
        break;
    }
  };

  const onPointerUp = () => {
    isPainting.current = false;
  };

  const findShapeById = (id) => {
    return [...rectangles, ...circles].find(s => s.id === id);
  };

  const getSidePosition = (shape, side) => {
    if (!shape) return { x: 0, y: 0 };

    if (shape.radius) {
      const offset = shape.radius;
      return {
        top: { x: shape.x, y: shape.y - offset },
        bottom: { x: shape.x, y: shape.y + offset },
        left: { x: shape.x - offset, y: shape.y },
        right: { x: shape.x + offset, y: shape.y }
      }[side];
    } else {
      return {
        top: { x: shape.x + shape.width / 2, y: shape.y },
        bottom: { x: shape.x + shape.width / 2, y: shape.y + shape.height },
        left: { x: shape.x, y: shape.y + shape.height / 2 },
        right: { x: shape.x + shape.width, y: shape.y + shape.height / 2 }
      }[side];
    }
  };

  const clicked = (e, id) => {
    if (action === ACTIONS.SELECT) {
      transformerRef.current.nodes([e.target]);
      setSelectedId(id);
    } else if (action === ACTIONS.CONNECT) {
      selectedForConnection.current.push(id);
      if (selectedForConnection.current.length === 2) {
        const [from, to] = selectedForConnection.current;
        const fromShape = findShapeById(from);
        const toShape = findShapeById(to);

        if (fromShape && toShape) {
          const closest = getClosestSnapPoints(fromShape, toShape);
          setConnections(prev => [...prev, {
            id: uuidv4(),
            from,
            to,
            fromSide: closest.from.side,
            toSide: closest.to.side
          }]);
        }
        selectedForConnection.current = [];
      }
    }
  };

  const handleExport = () => {
    const uri = stageRef.current.toDataURL();
    const link = document.createElement('a');
    link.download = "canvas.png";
    link.href = uri;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const deleteSelected = () => {
    if (!selectedId) return;
    setRectangles(prev => prev.filter(r => r.id !== selectedId));
    setCircles(prev => prev.filter(c => c.id !== selectedId));
    setScribbles(prev => prev.filter(s => s.id !== selectedId));
    setConnections(prev => prev.filter(conn => conn.from !== selectedId && conn.to !== selectedId));
    selectedForConnection.current = selectedForConnection.current.filter(id => id !== selectedId);
    setSelectedId(null);
    transformerRef.current.nodes([]);
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Delete" || e.key === "Backspace") {
        deleteSelected();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedId]);

  return (
    <div>
      <div className="absolute top-0 left-0 right-0 flex gap-2 p-2 bg-white z-10 shadow-md">
        <button className={action === ACTIONS.SELECT ? 'bg-violet-300 p-1 rounded' : 'p-1 hover:bg-violet-100 rounded'} onClick={() => setAction(ACTIONS.SELECT)}>
          <GiArrowCursor size={24} />
        </button>
        <button className={action === ACTIONS.RECTANGLE ? 'bg-violet-300 p-1 rounded' : 'p-1 hover:bg-violet-100 rounded'} onClick={() => setAction(ACTIONS.RECTANGLE)}>
          <TbRectangle size={24} />
        </button>
        <button className={action === ACTIONS.CIRCLE ? 'bg-violet-300 p-1 rounded' : 'p-1 hover:bg-violet-100 rounded'} onClick={() => setAction(ACTIONS.CIRCLE)}>
          <FaRegCircle size={24} />
        </button>
        <button className={action === ACTIONS.SCRIBBLE ? 'bg-violet-300 p-1 rounded' : 'p-1 hover:bg-violet-100 rounded'} onClick={() => setAction(ACTIONS.SCRIBBLE)}>
          <LuPencil size={24} />
        </button>
        <button className={action === ACTIONS.CONNECT ? 'bg-green-300 p-1 rounded' : 'p-1 hover:bg-green-100 rounded'} onClick={() => setAction(ACTIONS.CONNECT)}>
          Connect
        </button>
        <input type="color" value={fillColor} onChange={(e) => setFillColor(e.target.value)} className="w-8 h-8" />
        <button onClick={handleExport}>
          <IoMdDownload size={24} />
        </button>
      </div>

      <Stage
        ref={stageRef}
        width={window.innerWidth}
        height={window.innerHeight}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        {/* Layer 1 - Shapes (background) */}
        <Layer>
          <Rect
            x={0}
            y={0}
            width={window.innerWidth}
            height={window.innerHeight}
            fill="white"
            onClick={() => transformerRef.current.nodes([])}
          />

          {rectangles.map((rect) => (
            <Rect
              key={rect.id}
              x={rect.x}
              y={rect.y}
              width={rect.width}
              height={rect.height}
              fill={rect.fillColor}
              stroke="black"
              strokeWidth={2}
              draggable={isDraggable}
              onClick={(e) => clicked(e, rect.id)}
              onDragMove={(e) => {
                setRectangles(prev => prev.map(r => r.id === rect.id ? { ...r, x: e.target.x(), y: e.target.y() } : r));
              }}
            />
          ))}

          {circles.map((circle) => (
            <Circle
              key={circle.id}
              x={circle.x}
              y={circle.y}
              radius={circle.radius}
              fill={circle.fillColor}
              stroke="black"
              strokeWidth={2}
              draggable={isDraggable}
              onClick={(e) => clicked(e, circle.id)}
              onDragMove={(e) => {
                setCircles(prev => prev.map(c => c.id === circle.id ? { ...c, x: e.target.x(), y: e.target.y() } : c));
              }}
            />
          ))}

          {scribbles.map((scribble) => (
            <Line
              key={scribble.id}
              points={scribble.points}
              stroke={scribble.fillColor}
              strokeWidth={2}
              tension={0.5}
              lineCap="round"
              lineJoin="round"
            />
          ))}

          {/* 🟢 SNAP POINTS VISIBLE IN CONNECT MODE */}
          {showSnapPoints && getSnapPointsWithShape().map((p, idx) => (
            <Circle
              key={idx}
              x={p.x}
              y={p.y}
              radius={4}
              fill="red"
              stroke="black"
              strokeWidth={1}
            />
          ))}
          <Transformer ref={transformerRef} />
        </Layer>

        {/* ✅ Layer 2 - Arrows ABOVE shapes */}
        <Layer>
          {connections.map((conn) => {
            const fromShape = findShapeById(conn.from);
            const toShape = findShapeById(conn.to);
            if (!fromShape || !toShape) return null;
            const fromPos = getSidePosition(fromShape, conn.fromSide);
            const toPos = getSidePosition(toShape, conn.toSide);
            return (
              <Arrow
                key={conn.id}
                points={[fromPos.x, fromPos.y, toPos.x, toPos.y]}
                stroke="black"
                fill="black"
                strokeWidth={2}
                pointerLength={8}
                pointerWidth={8}
                lineCap="round"
                lineJoin="round"
              />
            );
          })}
        </Layer>
      </Stage>
    </div>
  );
};

export default App;
