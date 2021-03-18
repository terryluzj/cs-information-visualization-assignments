<script context="module">
    import { loadCSV } from '../../utils';
    export async function preload() {
        const rawData = await loadCSV.call(this, 'steam-game.csv');
        return { rawData };
    }
</script>

<script>
    import DynamicTrend from './DynamicTrend.svelte';
    import PopularityBarChart from './PopularityBarChart.svelte';
    import PopularitySharePieChart from './PopularitySharePieChart.svelte';

    let selectedData;
    let focusedData;

    export let rawData;

    const onMouseOverHandler = (_event, data) => {
        if (!focusedData) {
            selectedData = data;
        }
    };

    const onMouseOutHandler = () => {
        if (!focusedData) {
            selectedData = null;
        }
    };

    const onClickEmptyArea = () => {
        focusedData = null;
        selectedData = null;
    };

    const onClickChartArea = (event, data) => {
        event.stopPropagation();
        focusedData = data;
    };
</script>

<div class="container" on:click={onClickEmptyArea}>
    <h1>
        <img src="icons/steam.svg" alt="steam icon" />
        <span>Steam Game Dashboard (2012 - 2021)</span>
    </h1>

    <div class="main-chart">
        <PopularityBarChart
            onMouseOver={onMouseOverHandler}
            onMouseOut={onMouseOutHandler}
            {onClickChartArea}
            {selectedData}
            {focusedData}
            {rawData}
        />
        <PopularitySharePieChart
            onMouseOver={onMouseOverHandler}
            onMouseOut={onMouseOutHandler}
            {onClickChartArea}
            {selectedData}
            {focusedData}
            {rawData}
        />
    </div>
    <div class="dynamic-chart">
        <DynamicTrend data={focusedData || selectedData} {rawData} />
    </div>
</div>

<style>
    .container {
        flex: 1;
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

    .main-chart :global(.bar) {
        flex: 2;
    }

    .main-chart :global(.pie) {
        flex: 1;
    }

    .dynamic-chart {
        margin-top: 3rem;
        flex: 2;
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

    :global(h1) {
        color: #f2f2f2;
        margin: 0 0.5rem 1rem 0.5rem;
        line-height: 1;
    }

    :global(h1) * {
        vertical-align: middle;
    }

    :global(h2),
    :global(h3) {
        color: #f2f2f2;
        margin: 0;
        margin-bottom: auto;
    }

    .dynamic-chart :global(svg) {
        margin-top: 0.5rem;
    }

    .dynamic-chart :global(div) {
        flex: 1;
    }
</style>
