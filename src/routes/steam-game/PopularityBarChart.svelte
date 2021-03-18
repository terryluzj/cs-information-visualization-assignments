<script>
    import * as d3 from 'd3';
    import { onMount, afterUpdate } from 'svelte';
    import { getTopGameAverage } from './operation';

    let barChartEl;
    let barChartWidth;

    export let onMouseOver;
    export let onMouseOut;
    export let onClickChartArea;

    export let focusedData;
    export let selectedData;
    export let rawData;

    onMount(async () => {
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
            .style('background-color', (d, i) => {
                const percentage = (d.avg / topSum) * 100;
                return percentage > 10 ? color(i) : 'SlateGray';
            })
            .style('width', (d) => {
                const viewpointWidth =
                    (d.avg / d3.max(topAverage, (data) => data.avg)) * 100;
                return `${viewpointWidth}%`;
            })
            .text((d) => {
                return d.gamename;
            })
            .on('click', onClickChartArea)
            .on('mouseover', onMouseOver)
            .on('mouseout', onMouseOut);
    });

    afterUpdate(() => {
        const selectedGroup = [d3.select(barChartEl).selectAll('div')];
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
    });
</script>

<div bind:this={barChartEl} bind:clientWidth={barChartWidth} class="bar">
    <h2>Overall Game Popularity (Top 10)</h2>
</div>

<style>
    .bar {
        height: 100%;
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

    .bar :global(div) {
        font: 14px;
        text-align: right;
        padding: 3px;
        margin: 1px;
        color: white;
    }
</style>
