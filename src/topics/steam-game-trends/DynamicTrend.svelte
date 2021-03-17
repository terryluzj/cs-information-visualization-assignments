<script>
    import * as d3 from 'd3';
    import { afterUpdate, onMount } from 'svelte';
    import { rawData, loadRawData, getGameGroup } from './data-operation';

    let timeSeriesEl;
    let timeSeriesWidth;
    let timeSeriesHeight;

    const [marginHorizontal, marginVertical] = [5, 8];

    export let data;

    onMount(async () => {
        await loadRawData();
    });

    afterUpdate(() => {
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

<h2>
    Individual Trend{#if data}
        {' '}of {data.gamename}
    {/if}
</h2>
{#if data}
    <div
        bind:this={timeSeriesEl}
        class="time-series"
        bind:clientWidth={timeSeriesWidth}
        bind:clientHeight={timeSeriesHeight}
    />
{:else}
    <div class="hint">
        <h3>Hover or click on the chart area to see detailed time series</h3>
    </div>
{/if}

<style>
    .time-series,
    .hint {
        height: 100%;
    }

    .hint {
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
