<script context="module">
    export async function preload() {
        const rawData = await this.fetch('data/japan-earthquake.json');
        const rawJson = await rawData.json();
        return {
            data: rawJson.features,
        };
    }
</script>

<script>
    import * as d3 from 'd3';
    import * as d3Collection from 'd3-collection';
    import { afterUpdate, onMount } from 'svelte';
    import Hint from './Hint.svelte';

    export let data;

    const dateDataGroup = d3Collection
        .nest()
        .key(({ properties: { time } }) => {
            const date = new Date(time);
            return new Date(
                date.getFullYear(),
                date.getMonth(),
                date.getDate(),
                date.getHours()
            );
        });
    const dateDataMap = dateDataGroup.map(data);
    let totalCount = 0;
    const dateAccumulatedCount = dateDataGroup
        .sortKeys((a, b) => d3.ascending(new Date(a), new Date(b)))
        .entries(data)
        .map((entry) => {
            totalCount += entry.values.length;
            return { date: new Date(entry.key), count: totalCount };
        });
    const dateAccumulatedCountMap = d3Collection
        .nest()
        .key((d) => d.date)
        .map(dateAccumulatedCount);

    const step = 1000 * 60 * 60;
    const startTime = d3.min(dateAccumulatedCount, (d) => d.date);
    const endTime = d3.max(dateAccumulatedCount, (d) => d.date);
    const frequency = 25;

    const magnitudeScale = d3
        .scalePow()
        .exponent(2)
        .domain([1, 10])
        .range([10, 200]);
    const durationScale = d3
        .scalePow()
        .exponent(2)
        .domain([1, 10])
        .range([500, 5000]);
    const depthScale = d3.scaleLinear().domain([0, 100]).range([0.25, 1]);

    const initiateTimer = () => {
        const timer = d3.interval((elapsed) => {
            const nextTick = time.valueOf() + step;
            if (nextTick > endTime.valueOf()) timer.stop();
            time = nextTick;
        }, 1000 / frequency);
        return timer;
    };

    export let time = startTime.valueOf();
    export let displayTime = new Date(time);
    export let realtimeCount = 0;
    let timer;

    let map;
    let mapContainer;

    let svgContainer;
    let projectFunction;

    onMount(async () => {
        const { default: mapboxgl } = await import('mapbox-gl');

        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/mapbox-gl/dist/mapbox-gl.css';
        document.head.appendChild(link);

        mapboxgl.accessToken =
            'pk.eyJ1IjoidGVycnlsdSIsImEiOiJja21lamx1MW0wZ3RpMm9tcWM4eWliMGl2In0.BbN5WENvBHmqsDheYTck8Q';
        link.onload = () => {
            map = new mapboxgl.Map({
                container: mapContainer,
                style: 'mapbox://styles/terrylu/ckmejtjjhmvda17ptno6qwk14',
                center: [139, 37],
                zoom: 5,
                bearing: -20,
                interactive: false,
            });
            map.on('load', () => {
                svgContainer = d3
                    .select(map.getCanvasContainer())
                    .append('svg')
                    .attr('width', '100%')
                    .attr('height', '100vh')
                    .style('position', 'absolute')
                    .style('z-index', 1);

                timer = initiateTimer();
            });
            projectFunction = (d) =>
                map.project(new mapboxgl.LngLat(d[0], d[1]));
        };

        return () => {
            map.remove();
            timer.stop();
            link.parentNode.removeChild(link);
        };
    });

    afterUpdate(() => {
        displayTime = new Date(time);
    });

    afterUpdate(() => {
        if (projectFunction && svgContainer) {
            const dateKey = new Date(time).toString();
            const newData = dateDataMap.get(dateKey) || [];

            const accumulatedCount = dateAccumulatedCountMap.get(dateKey) || [
                {
                    count: realtimeCount,
                },
            ];
            realtimeCount = accumulatedCount[0].count;

            svgContainer
                .selectAll('circle')
                .data(newData, ({ id }) => id)
                .enter()
                .append('circle')
                .attr('cx', ({ geometry: { coordinates } }) => {
                    return projectFunction(coordinates).x;
                })
                .attr('cy', ({ geometry: { coordinates } }) => {
                    return projectFunction(coordinates).y;
                })
                .attr('r', 0)
                .style(
                    'fill',
                    ({ geometry: { coordinates } }) =>
                        `rgba(167, 53, 62, ${depthScale(coordinates[2])})`
                )
                .style('stroke', 'rgba(167, 53, 62)')
                .style('opacity', '1')
                .style('z-index', 1)
                .transition()
                .duration(250)
                .ease(d3.easeCircleIn)
                .attr('r', ({ properties: { mag } }) => {
                    return magnitudeScale(mag);
                })
                .transition()
                .duration(({ properties: { mag } }) => {
                    return durationScale(mag);
                })
                .ease(d3.easeCircleOut)
                .style('opacity', 0)
                .on('end', function () {
                    d3.select(this).remove();
                });
        }
    });

    let timeSeriesContainer;
    let timeSeriesContainerHeight;
    let timeSeriesContainerWidth;
    let clipPath;

    const getTimeScale = (width = timeSeriesContainerWidth) =>
        d3
            .scaleTime()
            .domain(d3.extent(dateAccumulatedCount.map((d) => d.date)))
            .range([0, width]);

    const handleTimeSeriesClick = (event) => {
        const { left } = d3
            .select(timeSeriesContainer)
            .select('svg')
            .node()
            .getBoundingClientRect();
        const clickX = event.clientX - left;
        const updatedDate = new Date(
            getTimeScale().invert(clickX >= 0 ? clickX : 0)
        );
        const originalTime = time;
        time = new Date(
            updatedDate.getFullYear(),
            updatedDate.getMonth(),
            updatedDate.getDate(),
            updatedDate.getHours()
        );
        if (originalTime >= endTime) {
            timer = initiateTimer();
        }
    };

    onMount(() => {
        const xAxisHeight = 15;

        const plotWidth = timeSeriesContainerWidth;
        const plotHeight = timeSeriesContainerHeight - xAxisHeight;

        const xScale = getTimeScale();
        const yScale = d3
            .scaleLinear()
            .domain(d3.extent(dateAccumulatedCount.map((d) => d.count)))
            .range([plotHeight, 0]);

        const areaPath = d3
            .area()
            .x((d) => xScale(d.date))
            .y0(yScale.range()[0])
            .y1((d) => yScale(d.count))
            .curve(d3.curveBasis);

        const linePath = d3
            .line()
            .x((d) => xScale(d.date))
            .y((d) => yScale(d.count))
            .curve(d3.curveBasis);

        const xAxis = d3.axisBottom().scale(xScale).tickSize(0);

        const chart = d3
            .select(timeSeriesContainer)
            .append('svg')
            .attr('width', plotWidth)
            .attr('height', timeSeriesContainerHeight)
            .on('click', handleTimeSeriesClick);

        clipPath = chart
            .append('defs')
            .append('clipPath')
            .attr('id', 'selected-region')
            .append('rect')
            .attr('x', 0)
            .attr('y', 0)
            .attr('width', 0)
            .attr('height', timeSeriesContainerHeight);

        const plot = chart.append('g').attr('tranform', `translate(0, 0)`);

        const basePlot = plot.append('g');
        const dynamicPlot = plot
            .append('g')
            .attr('clip-path', 'url(#selected-region)');

        basePlot
            .append('path')
            .datum(dateAccumulatedCount)
            .attr('d', areaPath)
            .attr('fill', 'rgba(154, 165, 182, 0.7)')
            .attr('fill-opacity', 0.4);

        basePlot
            .append('path')
            .datum(dateAccumulatedCount)
            .attr('d', linePath)
            .attr('fill', 'none')
            .attr('stroke', 'rgba(154, 165, 182)')
            .attr('stroke-width', 1);

        dynamicPlot
            .append('path')
            .datum(dateAccumulatedCount)
            .attr('d', linePath)
            .attr('d', areaPath)
            .attr('fill', 'rgb(86, 98, 118)');

        dynamicPlot
            .append('path')
            .datum(dateAccumulatedCount)
            .attr('d', linePath)
            .attr('fill', 'none')
            .attr('stroke', 'rgb(101, 115, 139)')
            .attr('stroke-width', 2);

        chart
            .append('g')
            .attr('transform', `translate(0, ${plotHeight})`)
            .call(xAxis)
            .style('color', 'rgb(86, 98, 118)')
            .style('text-anchor', 'end');
    });

    afterUpdate(() => {
        clipPath.attr('width', getTimeScale()(new Date(time)));
    });
</script>

<div class="map" bind:this={mapContainer}>
    <div class="container">
        <div
            class="time-series"
            bind:this={timeSeriesContainer}
            bind:clientHeight={timeSeriesContainerHeight}
            bind:clientWidth={timeSeriesContainerWidth}
        >
            <span class="label"
                >Earthquake Accumulative Count Time Series (Click on the Chart
                Area to Toggle the Current Time)</span
            >
        </div>
        <div class="time-display">
            <div>
                <span class="label">Current Time (JST)</span>
                <h2>
                    {displayTime.toLocaleString('en-US', {
                        timeZone: 'Asia/Tokyo',
                    })}
                </h2>
            </div>
            <div>
                <span class="label">Total Earthquake Count (2011 - 2021)</span>
                <h2>
                    <span class="real-time-count">{realtimeCount}</span
                    >/{totalCount}
                </h2>
            </div>
        </div>
    </div>
    <Hint {magnitudeScale} />
</div>

<style>
    .map {
        width: 100%;
        height: 100vh;
        position: relative;
        z-index: 0;
    }

    .container {
        position: absolute;
        z-index: 2;
        bottom: 0;
        padding: 1rem;
        min-height: 20vh;
        display: flex;
        width: calc(100% - 2rem);
    }

    .container > * + * {
        margin-left: 1%;
    }

    .time-display,
    .time-series {
        border-radius: 0.25rem;
        padding: 1rem;
        background-color: rgba(255, 255, 255, 0.5);
    }

    .time-series {
        flex: 2;
    }

    .time-display {
        flex: 1;
        text-align: center;
        display: flex;
        flex-direction: column;
        justify-content: space-evenly;
    }

    .time-display h2 {
        font-size: 2.25rem;
        line-height: 1.2;
        margin: 0;
    }

    .label {
        font-size: 0.75rem;
        font-weight: bold;
    }

    .real-time-count {
        color: rgb(167, 53, 62);
    }
</style>
