import * as d3 from 'd3';

let rawData;

const loadRawData = () =>
    new Promise((resolve) => {
        if (!rawData) {
            d3.csv('data/steam-game-trends.csv').then((data) => {
                rawData = data;
                resolve();
            });
        } else {
            resolve();
        }
    });

loadRawData();

const getGameGroup = (rawData) => d3.group(rawData, (data) => data.gamename);

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

export { rawData, loadRawData, getGameGroup, getTopGameAverage };
