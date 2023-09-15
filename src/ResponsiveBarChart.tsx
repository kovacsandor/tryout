import "./ResponsiveBarChart.css";
import { useMedia } from "react-use";

export const ResponsiveBarChart = () => {
  const isMedium = useMedia("(min-width: 480px)"); // get from constants
  const isLarge = useMedia("(min-width: 960px)"); // get from constants

  const data = [2, 1, 5, 3, 7, 4, 8]; // move to props
  const max = Math.max(...data);
  const barDrawingAreaHeight = 100; // will be smaller ~90
  const barDrawingAreaWidth = 100; // will be smaller ~90
  const barDrawingAreaOffset = 100 - barDrawingAreaWidth;
  const hoverableWidth = barDrawingAreaWidth / data.length;
  const hoverableBarRatio = isLarge ? 3 : isMedium ? 2 : 1.25; // useRatio hook ???
  const barWidth = hoverableWidth / hoverableBarRatio;
  const barOffset = (hoverableWidth - barWidth) / 2; // should rename
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="ResponsiveSvg">
      <g className="BarDrawingArea">
        {data.map((d, i) => {
          const dataPieceHeight = (d * barDrawingAreaHeight) / max;
          const hoverableOffset = hoverableWidth * i + barDrawingAreaOffset;
          const offset = hoverableOffset + barOffset; // this should be named barOffset
          return (
            <g className="DataPiece">
              <rect
                className="BackDrop"
                width={`${barWidth}%`}
                height={`${barDrawingAreaHeight}%`}
                x={`${offset}%`}
              />
              <rect
                className="Bar"
                width={`${barWidth}%`}
                height={`${dataPieceHeight}%`}
                x={`${offset}%`}
                y={`${barDrawingAreaHeight - dataPieceHeight}%`}
              />
              <rect
                className="Hoverable"
                width={`${hoverableWidth}%`}
                height={`${barDrawingAreaHeight}%`}
                x={`${hoverableOffset}%`}
              />
            </g>
          );
        })}
      </g>
    </svg>
  );
};
