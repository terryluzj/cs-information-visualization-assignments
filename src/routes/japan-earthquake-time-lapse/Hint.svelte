<script>
    import * as d3 from 'd3';
    import { onMount } from 'svelte';

    export let magnitudeScale;

    let hintContainer;
    const sampleMagnitude = [3, 4, 5];

    onMount(() => {
        const hintWidth = 360;
        const hintHeight = 120;
        const interval =
            (hintWidth -
                d3.sum(sampleMagnitude.map((d) => magnitudeScale(d) * 2))) /
            (sampleMagnitude.length + 1);
        const hintSvg = d3
            .select(hintContainer)
            .append('svg')
            .attr('width', hintWidth)
            .attr('height', hintHeight);

        hintSvg
            .selectAll('circle')
            .data(sampleMagnitude)
            .enter()
            .append('circle')
            .attr('cx', (d, i) => {
                return (
                    interval * (i + 1) +
                    d3.sum(
                        sampleMagnitude
                            .slice(0, i)
                            .map((prev) => magnitudeScale(prev) * 2)
                    ) +
                    magnitudeScale(d)
                );
            })
            .attr('cy', '50%')
            .attr('text', (d) => d)
            .attr('r', magnitudeScale)
            .style('z-index', 1)
            .style('fill', `rgba(167, 53, 62, 0.5)`);

        hintSvg
            .selectAll('text')
            .data(sampleMagnitude)
            .enter()
            .append('text')
            .attr('x', (d, i) => {
                return (
                    interval * (i + 1) +
                    d3.sum(
                        sampleMagnitude
                            .slice(0, i)
                            .map((prev) => magnitudeScale(prev) * 2)
                    ) +
                    magnitudeScale(d)
                );
            })
            .attr('y', '50%')
            .attr('dx', '-13.5')
            .attr('dy', '5.5')
            .attr('fill', 'white')
            .text((d) => `M${d}.0`);
    });
</script>

<div bind:this={hintContainer} class="hint">
    <p>
        A larger circle indicates larger earthquake magnitude, which determines
        how destructive an earthquake is. See <a
            href="https://en.wikipedia.org/wiki/Richter_magnitude_scale"
            >Richter Scale</a
        >.
    </p>
</div>

<style>
    .hint {
        position: absolute;
        z-index: 2;
        top: 1rem;
        right: 1rem;
        padding: 1rem;
        width: auto;
        display: flex;
        flex-direction: column-reverse;
        width: 360px;
        border-radius: 0.25rem;
        padding: 1rem;
        background-color: rgba(255, 255, 255, 0.5);
    }

    .hint :global(p) {
        margin: 0;
    }
</style>
