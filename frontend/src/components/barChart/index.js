import * as d3 from "d3";
import { useRef, useEffect, React } from "react";
import { isEmpty } from "lodash-es";

const getNodeById = (svg, id) => {
  if (svg.select("#" + id).empty()) {
    svg.append("g").attr("id", id);
  } else {
    const svg = d3.select("#" + id);
    // remove child items
    svg.selectAll("*").remove();
  }
  return svg.select("#" + id);
};

// Copyright 2021 Observable, Inc.
// Released under the ISC license.
// https://observablehq.com/@d3/bar-chart
export function BarChart({
  data,
  x = (d, i) => i, // given d in data, returns the (ordinal) x-value
  y = (d) => d, // given d in data, returns the (quantitative) y-value
  marginTop = 20, // the top margin, in pixels
  marginRight = 0, // the right margin, in pixels
  marginBottom = 30, // the bottom margin, in pixels
  marginLeft = 40, // the left margin, in pixels
  width = 640, // the outer width of the chart, in pixels
  height = 400, // the outer height of the chart, in pixels
  xDomain, // an array of (ordinal) x-values
  xRange = [marginLeft, width - marginRight], // [left, right]
  yType = d3.scaleLinear, // y-scale type
  yDomain, // [ymin, ymax]
  yRange = [height - marginBottom, marginTop], // [bottom, top]
  xPadding = 0.1, //amount of x-range to reserve to separate bars
  yFormat, // a format specifier string for the y-axis
  yLabel, // a label for the y-axis
  color = "currentColor", // bar fill color
}) {
  const d3Container = useRef(null);

  useEffect(() => {
    if (!isEmpty(data) && d3Container.current) {
      const svg = d3.select(d3Container.current);
      // Compute values.
      const X = d3.map(data, x);
      const Y = d3.map(data, y);

      // Compute default domains, and unique the x-domain.
      if (xDomain === undefined) xDomain = X;
      if (yDomain === undefined) yDomain = [0, d3.max(Y)];

      xDomain = new d3.InternSet(xDomain);

      // Omit any data not present in the x-domain.
      const I = d3.range(X.length).filter((i) => xDomain.has(X[i]));

      // Construct scales, axes, and formats.
      const xScale = d3.scaleBand(xDomain, xRange).padding(xPadding);
      const yScale = yType(yDomain, yRange);
      const xAxis = d3.axisBottom(xScale).tickSizeOuter(0);
      const yAxis = d3.axisLeft(yScale).ticks(height / 40, yFormat);

      const axes = getNodeById(svg, "axes");

      axes
        .attr("transform", `translate(${marginLeft},0)`)
        .call(yAxis)
        .call((g) => g.select(".domain").remove())
        .call((g) =>
          g
            .selectAll(".tick line")
            .clone()
            .attr("x2", width - marginLeft - marginRight)
            .attr("stroke-opacity", 0.1)
        )
        .call((g) =>
          g
            .append("text")
            .attr("x", -marginLeft)
            .attr("y", 10)
            .attr("fill", "currentColor")
            .attr("text-anchor", "start")
            .text(yLabel)
        );

      const bars = getNodeById(svg, "bars");

      bars
        .attr("fill", color)
        .selectAll("rect")
        .data(I)
        .join("rect")
        .attr("x", (i) => xScale(X[i]))
        .attr("y", (i) => yScale(Y[i]))
        .attr("height", (i) => yScale(0) - yScale(Y[i]))
        .attr("width", xScale.bandwidth());

      const xAxisNode = getNodeById(svg, "xAxisNode");

      xAxisNode
        .attr("transform", `translate(0,${height - marginBottom})`)
        .call(xAxis)
        .selectAll("text")
        .attr("y", 0)
        .attr("x", 9)
        .attr("dy", ".35em")
        .attr("transform", "rotate(90)")
        .style("text-anchor", "start");
    }
  }, [data]);

  const viewboxString = `0 0 ${width} ${height}`;

  return (
    <div>
      <svg
        ref={d3Container}
        viewBox={viewboxString}
        id="barPlot"
        style={{ Visibility: "visible" }}
        width="100%"
      />
    </div>
  );
}
