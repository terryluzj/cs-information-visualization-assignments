<script context="module">
    export async function preload() {
        const rawData = await this.fetch('data/japan-earthquake.json');
        const rawJson = await rawData.json();
        return {
            data: rawJson.features.slice(
                rawJson.features.length - 10000,
                rawJson.features.length
            ),
        };
    }
</script>

<script>
    import * as d3 from 'd3';
    import * as d3Collection from 'd3-collection';
    import { afterUpdate, onMount } from 'svelte';

    const step = 1000 * 60 * 60;
    const startTime = new Date(new Date('2011-03-01') - step);
    const endTime = new Date('2021-03-01');
    const frequency = 20;
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

    export let time = startTime.valueOf();

    let map;
    let mapContainer;

    let svgContainer;
    let projectFunction;

    export let data;
    const dateDataMap = d3Collection
        .nest()
        .key(({ properties: { time } }) => {
            const date = new Date(time);
            return new Date(
                date.getFullYear(),
                date.getMonth(),
                date.getDate(),
                date.getHours()
            );
        })
        .map(data);

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

                const timer = d3.interval((elapsed) => {
                    const nextTick = time.valueOf() + step;
                    if (nextTick > endTime.valueOf()) timer.stop();
                    time = nextTick;
                }, 1000 / frequency);
            });
            projectFunction = (d) =>
                map.project(new mapboxgl.LngLat(d[0], d[1]));
        };

        return () => {
            map.remove();
            link.parentNode.removeChild(link);
        };
    });

    afterUpdate(() => {
        if (projectFunction && svgContainer) {
            const dateKey = new Date(time).toString();
            const newData = dateDataMap.get(dateKey) || [];

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
                .style('fill', 'rgba(167, 53, 62, 0.65)')
                .style('stroke', 'rgba(167, 53, 62)')
                .style('opacity', '1')
                .transition()
                .duration(500)
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
</script>

<div class="map" bind:this={mapContainer}>
    <div class="container">{new Date(time)}</div>
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
        z-index: 1;
        bottom: 0;
        width: 100%;
        min-height: 20vh;
        text-align: center;
    }
</style>
