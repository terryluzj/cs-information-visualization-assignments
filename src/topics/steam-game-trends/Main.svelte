<script>
    import { onMount, afterUpdate } from 'svelte';
    import * as d3 from 'd3';

    let rawData;

    let barChartEl;
    let barChartWidth;

    let pieChartEl;
    let pieChartWidth;
    let pieChartHeight;

    let timeSeriesEl;
    let timeSeriesWidth;
    let timeSeriesHeight;

    export let selectedData;
    export let focusedData;

    const getRawData = () => d3.csv('data/steam-game-trends.csv');
    const getGameGroup = (rawData) =>
        d3.group(rawData, (data) => data.gamename);
    const getTopGameAverage = (rawData, top = 10) => {
        const gameAverage = Array.from(
            getGameGroup(rawData),
            ([gamename, series]) => ({
                gamename,
                avg: d3.mean(series, (row) => +row.avg),
            })
        );
        const topAverage = d3
            .sort(gameAverage, (a, b) => d3.descending(a.avg, b.avg))
            .slice(0, top)
            .map((data, index) => ({ ...data, index }));
        return topAverage;
    };

    const onMouseOverHandler = (_event, data) => {
        if (!focusedData) {
            selectedData = data;
        }
    };

    const onMouseOutHandler = (_event, data) => {
        if (!focusedData) {
            selectedData = null;
        }
    };

    const onClickEmptyArea = (event) => {
        focusedData = null;
        selectedData = null;
    };

    const onClickChartArea = (event, data) => {
        event.stopPropagation();
        focusedData = data;
    };

    onMount(async () => {
        rawData = await getRawData();
        const topAverage = getTopGameAverage(rawData);
        const topSum = d3.sum(topAverage, (data) => data.avg);

        const x = d3
            .scaleLinear()
            .range([0, barChartWidth])
            .domain(d3.extent(topAverage, (d) => d.avg));
        const color = d3.scaleOrdinal(d3.schemeTableau10);

        d3.select(barChartEl)
            .append('svg')
            .attr('viewBox', [0, 0, barChartWidth, 25])
            .style('height', 'auto')
            .append('g')
            .attr('transform', `translate(0, 0)`)
            .call(d3.axisBottom(x).tickSizeOuter(0))
            .style('color', '#f2f2f2')
            .select('.tick')
            .remove();

        d3.select(barChartEl)
            .selectAll('div')
            .data(topAverage)
            .enter()
            .append('div')
            .style('background-color', function (d, i) {
                const percentage = (d.avg / topSum) * 100;
                return percentage > 10 ? color(i) : 'SlateGray';
            })
            .style('width', function (d) {
                const viewpointWidth =
                    (d.avg / d3.max(topAverage, (data) => data.avg)) * 100;
                return `${viewpointWidth}%`;
            })
            .text(function (d) {
                return d.gamename;
            })
            .on('click', onClickChartArea)
            .on('mouseover', onMouseOverHandler)
            .on('mouseout', onMouseOutHandler);

        const topAveragePie = d3.pie().value((data) => data.avg)(topAverage);
        const radius = Math.min(pieChartWidth, pieChartHeight) / 2;
        const arc = d3.arc().innerRadius(0).outerRadius(radius);

        d3.select(pieChartEl)
            .append('svg')
            .attr('viewBox', [
                -pieChartWidth / 2,
                -pieChartHeight / 2,
                pieChartWidth,
                pieChartHeight,
            ])
            .append('g')
            .selectAll('div')
            .data(topAveragePie)
            .enter()
            .append('path')
            .attr('d', arc)
            .attr('fill', function (d, i) {
                const percentage = (d.data.avg / topSum) * 100;
                return percentage > 10 ? color(i) : 'SlateGray';
            })
            .attr('stroke', '#f2f2f2')
            .style('stroke-width', '1px')
            .on('click', function (d, i) {
                onClickChartArea(d, { ...i.data, index: i.index });
            })
            .on('mouseover', function (d, i) {
                onMouseOverHandler(d, { ...i.data, index: i.index });
            })
            .on('mouseout', function (d, i) {
                onMouseOutHandler(d, { ...i.data, index: i.index });
            });

        d3.select(pieChartEl)
            .select('svg')
            .selectAll('div')
            .data(topAveragePie)
            .enter()
            .append('text')
            .text(function (d) {
                const percentage = (d.data.avg / topSum) * 100;
                return percentage > 10
                    ? `${Math.round(percentage)}%`
                    : undefined;
            })
            .attr('transform', function (d) {
                return 'translate(' + arc.centroid(d) + ')';
            })
            .attr('font-size', '14')
            .style('text-anchor', 'middle')
            .style('fill', '#f2f2f2');
    });

    afterUpdate(() => {
        const selectedGroup = [
            d3.select(pieChartEl).selectAll('path'),
            d3.select(barChartEl).selectAll('div'),
        ];
        const data = focusedData || selectedData;
        if (data) {
            selectedGroup.forEach((group) => {
                group.filter((d, i) => i !== data.index).style('opacity', 0.5);
                group.filter((d, i) => i === data.index).style('opacity', 1);
            });
        } else {
            selectedGroup.forEach((group) => {
                group.style('opacity', 1);
            });
        }
        if (rawData && data) {
            const gameTimeSeries = getGameGroup(rawData).get(data.gamename);
            const gameTimeSeriesDateCasted = gameTimeSeries.map((data) => ({
                ...data,
                time: d3.timeParse('%B %Y')(`${data.month}${data.year}`),
                avg: +data.avg,
                peak: +data.peak,
            }));
            const gameTimeSeriesSorted = d3.sort(
                gameTimeSeriesDateCasted,
                (a, b) => d3.ascending(a.time, b.time)
            );

            const x = d3
                .scaleTime()
                .range([0, timeSeriesWidth])
                .domain(d3.extent(gameTimeSeriesSorted, (d) => d.time));
            const y = d3
                .scaleLinear()
                .range([timeSeriesHeight, 0])
                .domain([0, d3.max(gameTimeSeriesSorted, (d) => d.peak)]);

            const areaAvg = d3
                .area()
                .curve(d3.curveBasis)
                .x((d) => x(d.time))
                .y0(timeSeriesHeight)
                .y1((d) => {
                    return y(d.avg);
                });

            const areaMax = d3
                .area()
                .curve(d3.curveBasis)
                .x((d) => x(d.time))
                .y0(timeSeriesHeight)
                .y1((d) => {
                    return y(d.peak);
                });

            d3.select(timeSeriesEl).selectAll('svg').remove();

            const [marginHorizontal, marginVertical] = [5, 8];

            const chart = d3
                .select(timeSeriesEl)
                .append('svg')
                .attr('viewBox', [
                    0,
                    0,
                    timeSeriesWidth + marginHorizontal * 2,
                    timeSeriesHeight + marginVertical * 2,
                ])
                .append('g')
                .attr('transform', `translate(0, 0)`);

            chart
                .append('path')
                .attr('transform', `translate(0, ${-marginVertical})`)
                .datum(gameTimeSeriesSorted)
                .style('fill', 'LightSteelBlue')
                .style('stroke', 'LightSteelBlue')
                .attr('d', areaMax);

            chart
                .append('path')
                .attr('transform', `translate(0, ${-marginVertical})`)
                .datum(gameTimeSeriesSorted)
                .style('fill', 'SteelBlue')
                .style('stroke', 'SteelBlue')
                .attr('d', areaAvg);

            chart
                .append('g')
                .attr(
                    'transform',
                    `translate(0, ${timeSeriesHeight - marginVertical})`
                )
                .call(d3.axisBottom(x).tickSizeOuter(0))
                .style('color', '#f2f2f2');

            chart
                .append('g')
                .attr('transform', `translate(0, ${-marginVertical})`)
                .call(d3.axisRight(y).tickSizeOuter(0))
                .style('color', '#f2f2f2')
                .select('.tick')
                .remove();

            const keys = ['Peak', 'Average'];
            const color = d3
                .scaleOrdinal()
                .domain(keys)
                .range(['LightSteelBlue', 'SteelBlue']);

            const labelSize = 20;

            chart
                .selectAll('dots')
                .data(keys)
                .enter()
                .append('rect')
                .attr(
                    'x',
                    (d, i) =>
                        timeSeriesWidth * 0.5 -
                        (labelSize + 50 * keys.length) * i
                )
                .attr('y', 0)
                .attr('width', labelSize * 1.2)
                .attr('height', labelSize)
                .style('fill', function (d) {
                    return color(d);
                });

            chart
                .selectAll('labels')
                .data(keys)
                .enter()
                .append('text')
                .attr(
                    'x',
                    (d, i) =>
                        timeSeriesWidth * 0.5 -
                        (labelSize + 50 * keys.length) * i +
                        labelSize * 1.5
                )
                .attr('y', labelSize * 0.5)
                .style('fill', function (d) {
                    return color(d);
                })
                .text(function (d) {
                    return d;
                })
                .attr('text-anchor', 'right')
                .style('alignment-baseline', 'middle');
        }
    });
</script>

<div class="container" on:click={onClickEmptyArea}>
    <h1>
        <img src="icons/steam.svg" alt="steam icon" />
        <span>Steam Game Dashboard (2012 - 2021)</span>
    </h1>
    <div class="main-chart">
        <div
            bind:this={barChartEl}
            bind:clientWidth={barChartWidth}
            class="bar"
        >
            <h2>Overall Game Popularity</h2>
        </div>
        <div
            bind:this={pieChartEl}
            bind:clientWidth={pieChartWidth}
            bind:clientHeight={pieChartHeight}
            class="pie"
        >
            <h2>Market Share</h2>
        </div>
    </div>
    <div class="dynamic-chart">
        <h2>Individual Trend</h2>
        {#if focusedData || selectedData}
            <div
                bind:this={timeSeriesEl}
                class="time-series"
                bind:clientWidth={timeSeriesWidth}
                bind:clientHeight={timeSeriesHeight}
            />
        {:else}
            <div class="hint">
                <h3>
                    Hover or click on the chart area to see detailed time series
                </h3>
            </div>
        {/if}
    </div>
</div>

<style>
    .container {
        height: 100%;
        padding: 2rem;
        background-color: #1b2838;
        display: flex;
        flex-direction: column;
        user-select: none;
    }

    .main-chart {
        display: flex;
        flex: 1;
    }

    .bar :global(div) {
        font: 14px;
        text-align: right;
        padding: 3px;
        margin: 1px;
        color: white;
    }

    .bar {
        flex: 2;
    }

    .pie {
        flex: 1;
    }

    .dynamic-chart {
        margin-top: 3rem;
        flex: 1.5;
    }

    .bar,
    .pie,
    .time-series {
        height: 100%;
    }

    .pie :global(svg) {
        margin: auto;
    }

    .bar,
    .pie,
    .dynamic-chart {
        padding: 1rem;
        background-color: #131c27;
        border-radius: 0.25rem;
        margin-right: 0.5rem;
        margin-left: 0.5rem;
        display: flex;
        flex-direction: column;
        justify-content: center;
        position: relative;
    }

    h1 {
        color: #f2f2f2;
        margin: 0 0.5rem 1rem 0.5rem;
        line-height: 1;
    }

    h1 > * {
        vertical-align: middle;
    }

    h2,
    h3 {
        color: #f2f2f2;
        margin: 0;
        margin-bottom: auto;
    }

    .dynamic-chart :global(svg) {
        margin-top: 0.5rem;
    }

    .dynamic-chart .hint {
        flex: 1;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        opacity: 0.8;
    }

    .hint :global(h3) {
        margin: 0;
    }
</style>
