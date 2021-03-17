<script>
    import * as d3 from 'd3';
    import { onMount, afterUpdate } from 'svelte';
    import { rawData, loadRawData, getTopGameAverage } from './data-operation';

    let pieChartEl;
    let pieChartWidth;
    let pieChartHeight;

    export let onMouseOver;
    export let onMouseOut;
    export let onClickChartArea;

    export let focusedData;
    export let selectedData;

    onMount(async () => {
        await loadRawData();
        const topAverage = getTopGameAverage(rawData);
        const topSum = d3.sum(topAverage, (data) => data.avg);

        const color = d3.scaleOrdinal(d3.schemeTableau10);
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
                onMouseOver(d, { ...i.data, index: i.index });
            })
            .on('mouseout', function (d, i) {
                onMouseOut(d, { ...i.data, index: i.index });
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
        const selectedGroup = [d3.select(pieChartEl).selectAll('path')];
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

<div
    bind:this={pieChartEl}
    bind:clientWidth={pieChartWidth}
    bind:clientHeight={pieChartHeight}
    class="pie"
>
    <h2>Market Share</h2>
</div>

<style>
    .pie {
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

    .pie :global(svg) {
        margin: auto;
    }
</style>
