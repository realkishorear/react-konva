import React, { useEffect, useRef, useState } from 'react';
import { Stage, Layer, Rect, Circle, Line, Transformer } from 'react-konva';
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

  const onPointerDown = (e) => {
    if (action === ACTIONS.SELECT) return;

    const stage = stageRef.current;
    const { x, y } = stage.getPointerPosition();
    const id = uuidv4();
    currentShapeId.current = id;
    isPainting.current = true;

    switch (action) {
      case ACTIONS.RECTANGLE:
        setRectangles(prev => [...prev, { id, x, y, width: 30, height: 20, fillColor }]);
        break;
      case ACTIONS.CIRCLE:
        setCircles(prev => [...prev, { id, x, y, radius: 40, fillColor }]);
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

  const clicked = (e, id) => {
    if (action === ACTIONS.SELECT) {
      transformerRef.current.nodes([e.target]);
      setSelectedId(id);
    } else if (action === ACTIONS.CONNECT) {
      selectedForConnection.current.push(id);
      if (selectedForConnection.current.length === 2) {
        const [from, to] = selectedForConnection.current;
        setConnections(prev => [...prev, { id: uuidv4(), from, to }]);
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
    setConnections(prev => prev.filter(conn => conn.from !== selectedId && conn.to !== selectedId));
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

  const getCenter = (shape) => {
    if (!shape) return { x: 0, y: 0 };
    if (shape.radius) {
      return { x: shape.x, y: shape.y };
    } else {
      return { x: shape.x + shape.width / 2, y: shape.y + shape.height / 2 };
    }
  };

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
        <Layer>
          <Rect
            x={0}
            y={0}
            width={window.innerWidth}
            height={window.innerHeight}
            fill="white"
            onClick={() => transformerRef.current.nodes([])}
          />

          {/* Draw straight connections */}
          {connections.map((conn) => {
            const fromShape = findShapeById(conn.from);
            const toShape = findShapeById(conn.to);

            if (!fromShape || !toShape) return null;

            const start = getCenter(fromShape);
            const end = getCenter(toShape);

            return (
              <Line
                key={conn.id}
                points={[start.x, start.y, end.x, end.y]}
                stroke="black"
                strokeWidth={2}
              />
            );
          })}

          {/* Draw shapes */}
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

          <Transformer ref={transformerRef} />
        </Layer>
      </Stage>
    </div>
  );
};

export default App;
