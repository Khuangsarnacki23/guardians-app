// src/CircularCarousel.js
import React, {
  Children,
  useRef,
  useState,
  useImperativeHandle,
  forwardRef,
  useEffect,
} from "react";

const ARC_SIZE = 150;

const lerp = (start, stop, amt) => (1 - amt) * start + amt * stop;

function CircularCarouselComp(
  { onSelect, onSwapRight, onPointerDown, children },
  ref
) {
  const indexRef = useRef(0);
  const prevRef = useRef(0);
  const nextRef = useRef(0);
  const rendering = useRef(false);
  const wheelLockedRef = useRef(false);
  const [deg, setDeg] = useState(0);
  const [wrapper, setWrapper] = useState(null);

  const len = Children.count(children);
  prevRef.current = deg;

  const handleSetWrapper = (node) => {
    setWrapper(node);
  };

  function move() {
    const next = nextRef.current;
    const prev = prevRef.current;
    const newDeg = lerp(prev, next, 0.2);

    if (newDeg !== prev) {
      setDeg(newDeg);
      requestAnimationFrame(move);
    } else {
      rendering.current = false;
    }

    if (len > 0) {
      const index = Math.round(Math.abs(((newDeg / ARC_SIZE) * len) % len));
      if (index !== indexRef.current) {
        indexRef.current = index;
        onSelect && onSelect(index);
      }
    }
  }

  const onMouseDown = (e) => {
    const isTouch = e.type === "touchstart";
    let _deg = deg;
  
    onPointerDown && onPointerDown();
  
    const tryMove = (next) => {
      _deg = nextRef.current += next;
      _deg = nextRef.current = Math.min(_deg, 3);
      _deg = nextRef.current = Math.max(_deg, -ARC_SIZE + 3);
  
      if (!rendering.current) {
        rendering.current = true;
        requestAnimationFrame(move);
      }
    };

    const onMouseMove = ({ movementX }) => {
      tryMove(movementX / 40);
    };
  
    let prevTouchPageX;
    const onTouchMove = ({ touches }) => {
      const pageX = touches[0].pageX;
      if (prevTouchPageX != null) {
        const movementX = pageX - prevTouchPageX;
        tryMove(movementX / 22);
      }
      prevTouchPageX = pageX;
    };

    const onMouseUp = () => {
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
      document.removeEventListener("touchend", onMouseUp);

      if (len === 0) return;

      const angle = ARC_SIZE / len;
      const mod = _deg % angle;
      const diff = angle - Math.abs(mod);
      const sign = Math.sign(_deg);
      const max = angle * (len - 1);

      if (_deg > 0) {
        if (onSwapRight && indexRef.current === 0 && _deg > 2) {
          onSwapRight();
        }
        tryMove(-_deg);
      } else if (-_deg > max) {
        tryMove(-_deg - max);
      } else {
        const move = (diff <= angle / 2 ? diff : mod) * sign;
        tryMove(move);
      }
    };

    if (isTouch) {
      document.addEventListener("touchmove", onTouchMove);
      document.addEventListener("touchend", onMouseUp);
    } else {
      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    }
  };

  useEffect(() => {
    if (!wrapper || len === 0) return;

    const onWheel = (e) => {
      e.preventDefault();
      e.stopPropagation();

      if (wheelLockedRef.current) return;
      wheelLockedRef.current = true;

      setTimeout(() => {
        wheelLockedRef.current = false;
      }, 100);

      let _deg = ARC_SIZE / len;

      if (e.deltaY > 0 || e.deltaX > 0) {
        _deg *= -1;
      }

      const next = Math.max(nextRef.current + _deg, -ARC_SIZE - _deg);
      const index = Math.round(((next / ARC_SIZE) * len) % len);

      if ((e.deltaY < 0 || e.deltaX < 0) && index === 1) {
        onSwapRight && onSwapRight();
        return;
      }

      nextRef.current = next;

      if (!rendering.current) {
        rendering.current = true;
        requestAnimationFrame(move);
      }
    };

    wrapper.addEventListener("wheel", onWheel, { passive: false });

    return () => {
      wrapper.removeEventListener("wheel", onWheel);
    };
  }, [wrapper, len]);

  useImperativeHandle(
    ref,
    () => ({
      scrollTo(i) {
        if (len === 0) return;
        const _deg = (-ARC_SIZE / len) * i;
        nextRef.current = _deg;
        if (!rendering.current) {
          rendering.current = true;
          requestAnimationFrame(move);
        }
      },
    }),
    [len]
  );

  return (
    <div className="root" ref={handleSetWrapper}>
      <div
        className="handle"
        onMouseDown={onMouseDown}
        onTouchStart={onMouseDown}
      >
        <div className="center">
          <div className="items" style={{ transform: `rotate(${deg}deg)` }}>
            {Children.map(children, (child, i) => (
              <div
                key={i}
                className="item"
                style={{
                  transform: `translateX(-50%) rotate(${
                    i * (ARC_SIZE / len)
                  }deg)`,
                }}
              >
                {child}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const CircularCarousel = forwardRef(CircularCarouselComp);
export default CircularCarousel;
